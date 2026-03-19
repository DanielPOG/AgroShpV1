# Plan de Hardening y Pruebas Unitarias - AgroShpV1

Fecha: 2026-03-19
Contexto: sistema de ventas e inventario con manejo de caja y dinero.
Objetivo: reducir riesgo operativo y de fraude, y elevar confianza tecnica antes de escalar operacion.

## 1) Alcance y criterios

Alcance analizado:

- Autenticacion y sesion (NextAuth + middleware)
- API routes de dinero (ventas, caja, retiros, movimientos, turnos, reportes)
- Validacion de entradas (Zod)
- Acceso a base de datos (Prisma, transacciones, consultas raw)
- Configuracion de despliegue (Next config, Docker, variables)
- Estado de testing (no hay suite automatizada activa)

Criterio de prioridad:

- P0: riesgo critico para confidencialidad, integridad o disponibilidad financiera
- P1: riesgo alto con probabilidad media/alta
- P2: mejora estructural de seguridad y resiliencia

## 2) Diagnostico actual (resumen ejecutivo)

Fortalezas actuales:

- Middleware protege /dashboard y /api (salvo rutas publicas explicitas)
- Varias rutas financieras usan validacion con Zod
- Existen transacciones Prisma en operaciones clave
- Cookies de sesion con httpOnly y secure en produccion
- No se detecto uso de $queryRawUnsafe/$executeRawUnsafe

Brechas criticas detectadas:

1. Endpoint de auditoria de cash session sin auth/rol:
   - app/api/cash-sessions/[id]/auditoria/route.ts
2. Endpoint de debug de pagos sin auth/rol y con posible fuga de informacion:
   - app/api/debug/pago-mixto/route.ts
3. Reportes financieros con autenticacion pero sin autorizacion por rol consistente:
   - app/api/reportes/caja/route.ts
   - app/api/reportes/ventas/route.ts
   - app/api/reportes/movimientos-caja/route.ts
   - app/api/reportes/rentabilidad/route.ts
4. Falta rate limiting en endpoints de transaccion financiera
5. Falta idempotencia para operaciones POST de dinero (riesgo de duplicados)
6. Exceso de logs de debug en flujos de venta/turno/auth
7. Configuracion insegura para produccion detectada:
   - next.config.mjs con typescript.ignoreBuildErrors=true
   - docker-compose.yml y .env.docker.example con secretos por defecto debiles

Estado de riesgo global: ALTO

## 3) Plan de hardening por fases

## Fase P0 (0-48 horas) - Contencion critica

Objetivo: cerrar exposiciones directas y evitar acciones no autorizadas.

Estado de ejecucion:

- Completado a nivel tecnico en codigo
- Implementado en codigo:
  - Proteccion por sesion + RBAC en endpoint de auditoria de cash sessions
  - Restriccion del endpoint de debug de pago mixto a entorno development + rol Admin
  - RBAC aplicado a reportes financieros clave (caja, ventas, movimientos-caja, rentabilidad)
  - Eliminacion de detalles internos en respuestas 500 de endpoints sensibles ajustados
  - Endurecimiento inicial de configuracion (build estricto y retiro de secretos por defecto inseguros)
- Pendiente manual inmediato:
  - Rotacion real de secretos en entornos desplegados (NEXTAUTH_SECRET y credenciales DB)

1. Cerrar endpoints criticos expuestos

- Proteger app/api/cash-sessions/[id]/auditoria/route.ts con sesion + RBAC (Admin/Supervisor)
- Eliminar o restringir app/api/debug/pago-mixto/route.ts solo a Admin y entorno dev
- Eliminar retorno de details en errores 500 de endpoints sensibles

2. RBAC obligatorio en reportes financieros

- Crear helper central: lib/security/authorize.ts
- Aplicar helper en todas las rutas de reportes de dinero
- Politica minima recomendada:
  - Admin/Supervisor: reportes globales
  - Cajero: solo datos de su sesion/turno
  - Consulta/Inventarista: segun necesidad, por defecto denegar reportes de caja

3. Higiene urgente de secretos y build

- Rotar NEXTAUTH_SECRET y credenciales DB en todos los entornos
- Quitar secretos de ejemplo inseguros en docker-compose.yml
- Cambiar next.config.mjs: typescript.ignoreBuildErrors=false
- Activar policy de no deploy si falla typecheck/lint

Entregables P0:

- PR de bloqueo de endpoints expuestos
- PR de RBAC en reportes financieros
- Variables rotadas y checklist de despliegue seguro

Checklist operativa P0 (ejecucion inmediata):

- [ ] Rotar NEXTAUTH_SECRET en produccion y preproduccion
- [ ] Rotar credenciales de PostgreSQL (usuario/password) en todos los entornos
- [ ] Verificar que no existan secretos por defecto en variables de despliegue
- [ ] Confirmar que build falle si hay errores de TypeScript
- [ ] Validar manualmente respuestas 401/403 en endpoints de reportes
- [ ] Validar que /api/debug/pago-mixto retorne 404 fuera de development
- [ ] Validar que /api/cash-sessions/[id]/auditoria responda 403 para roles no permitidos

## Fase P1 (1-2 semanas) - Controles transaccionales

Objetivo: prevenir fraude operativo, duplicados y abuso por volumen.

Estado de ejecucion:

- Completado a nivel tecnico en codigo
- Implementado:
  - Rate limiting distribuido con Redis (sliding window via sorted sets): lib/security/rate-limit.ts
  - Conexion Redis singleton con reconexion automatica: lib/redis.ts
  - Fallback transparente a memoria si Redis no esta disponible (desarrollo local)
  - Servicio Redis añadido a docker-compose.yml (redis:7-alpine, 64MB, LRU eviction)
  - Dependencia ioredis agregada a package.json
  - Rate limiting aplicado en POST /api/ventas (15 req/60s)
  - Rate limiting aplicado en POST /api/caja/retiros (10 req/60s)
  - Rate limiting aplicado en POST /api/caja/movimientos (10 req/60s)
  - Rate limiting aplicado en POST /api/turnos (5 req/60s)
  - Idempotencia: modelo idempotency_keys en schema Prisma
  - Idempotencia: helper lib/security/idempotency.ts (check + save + X-Idempotency-Key header)
  - Idempotencia integrada en POST /api/ventas, /api/caja/retiros, /api/caja/movimientos
  - HTTP security headers en middleware.ts (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control)
  - Log sanitization: eliminados console.log de debug excesivos en ventas y turnos
  - REDIS_URL y rate limit env vars configurados en .env.docker.example
- Pendiente:
  - Ejecutar prisma db push o migracion para crear tabla idempotency_keys
  - Ampliar sanitizacion de logs a otros flujos (auth, cash-sessions)
- Auditoria financiera (SEC-007):
  - Helper centralizado lib/security/audit.ts (logAudit, logAuditTx, getRequestMeta + summarizers)
  - Integrado en POST /api/ventas (tabla: ventas, accion: CREATE, con IP y user-agent)
  - Integrado en POST /api/caja/retiros (tabla: retiros_caja, accion: CREATE)
  - Integrado en POST /api/caja/movimientos (tabla: movimientos_caja_extra, accion: CREATE)
  - Integrado en POST /api/turnos (tabla: turnos_caja, accion: CREATE)
  - Usa modelo auditoria existente en Prisma (tabla, registro_id, accion, datos_anteriores/nuevos, ip_address, user_agent)

1. Rate limiting por usuario y por IP

- Implementar middleware/hook reutilizable (Redis/Upstash recomendado)
- Endpoints minimos:
  - POST /api/ventas
  - POST /api/caja/retiros
  - POST /api/caja/movimientos
  - POST /api/turnos
  - GET de reportes pesados
- Respuesta estandar: HTTP 429 + Retry-After

2. Idempotencia en operaciones de dinero

- Exigir header X-Idempotency-Key en POST financieros
- Crear tabla de idempotencia (usuario_id + endpoint + key unico)
- Retornar respuesta previa para reintentos

3. Auditoria y trazabilidad financiera

- Registrar eventos de CREATE/UPDATE/DELETE/AUTHORIZE/REJECT
- Guardar actor, fecha, entidad, payload resumido, IP, user-agent, resultado
- No guardar datos sensibles en texto plano innecesario

4. Sanitizacion de logs

- Sustituir console.log de debug por logger estructurado con niveles
- Redactar email, token, ids sensibles en logs
- Correlation-id por request para trazabilidad

5. Seguridad HTTP adicional

- Definir headers en next.config.mjs o middleware:
  - Content-Security-Policy
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
  - Strict-Transport-Security (solo prod HTTPS)

Entregables P1:

- Modulo de rate limiting
- Modulo de idempotencia + migracion
- Auditoria financiera minima en BD
- Politica de logging seguro

## Fase P2 (2-6 semanas) - Endurecimiento estructural

Objetivo: madurez de seguridad operativa y cumplimiento.

Estado de ejecucion:

- Completado a nivel tecnico en codigo y documentos
- Implementado:
  1. DB hardening (database/migrations/p2-db-hardening.sql):
     - CHECK constraints monetarios: ventas, detalle_ventas, pagos_venta, sesiones_caja (8 acumuladores), movimientos_caja, retiros_caja, turnos_caja, gastos_caja, arqueos_caja, lotes_productos, productos
     - Validación de enums: estado de ventas, sesiones, retiros, turnos, lotes
     - Constraints de lógica: retiro autorizado requiere autorizador, turno finalizado requiere fecha_fin y efectivo_final
     - Indice unicopartcial: idx_sesion_activa_unica (1 sesion abierta por cajero)
     - Indice unicopartcial: idx_turno_activo_unico (1 turno activo por sesion)
     - Indices de rendimiento para consultas frecuentes
     - Trigger trg_validar_turno_activo_venta: impide venta con turno no activo

  2. Concurrencia transaccional:
     - autorizarRetiro: SELECT...FOR UPDATE pesimista dentro de $transaction (evita doble autorización)
     - completarRetiro: validación de saldo movida dentro de $transaction con lock
     - cerrarTurno: toda la operación envuelta en $transaction con SELECT...FOR UPDATE (evita doble cierre)
     - Indices unicos parciales como fallback DB si locks fallan

  3. CI/CD security pipeline (.github/workflows/security-ci.yml):
     - TypeScript typecheck + Next.js lint
     - npm audit (SCA) para dependencias vulnerables
     - TruffleHog secret scanning en PRs
     - Docker build test

  4. Recovery & runbook (docs/RUNBOOK_RECUPERACION_INCIDENTES.md):
     - Script de backup diario cifrado con GPG
     - Procedimiento de restore completo y parcial
     - Protocolo de respuesta a incidentes P0/P1/P2/P3
     - Queries de monitoreo de salud (sesiones huérfanas, retiros pendientes, diferencias)
     - Procedimiento de despliegue seguro con rollback
     - Checklist operativa mensual

- Pendiente:
  - Ejecutar database/migrations/p2-db-hardening.sql en cada entorno
  - Configurar GPG keys para backups cifrados
  - Revisar y corregir datos legados que violen nuevas constraints ANTES de aplicar migración

- Pipeline de seguridad CI/CD
- Politicas de backup/restore validadas
- Documento de respuesta a incidentes

## 4) Plan de pruebas unitarias (obligatorio por riesgo financiero)

Objetivo: detectar regresiones antes de tocar produccion y asegurar reglas de negocio de dinero.

Estado actual:

- No se detectaron archivos test/suite activos en el repositorio

Propuesta de stack:

- Vitest + @vitest/coverage-v8
- Testing Library (si se prueba logica de componentes)
- Mocking con vi.mock para Prisma/Auth

Estructura sugerida:

- tests/unit/security/
- tests/unit/api/
- tests/unit/lib/
- tests/unit/financial/

## Cobertura minima por modulo

1. Seguridad y autorizacion

- lib/auth.ts
- lib/auth-config.ts
- lib/security/authorize.ts (nuevo)

Casos:

- Rol permitido vs denegado
- Sesion nula -> 401
- Rol sin permiso -> 403
- Normalizacion de rol (Admin/Administrador si aplica)

2. Endpoints financieros criticos

- app/api/ventas/route.ts
- app/api/caja/retiros/route.ts
- app/api/caja/movimientos/route.ts
- app/api/turnos/route.ts

Casos minimos:

- POST sin sesion -> 401
- POST con rol invalido -> 403
- Payload invalido (Zod) -> 400
- Flujo exitoso -> 201
- Error de capa DB -> 500 controlado (sin fuga de stack)
- Idempotency key repetida -> misma respuesta, sin duplicar transaccion (P1)
- Rate limit excedido -> 429 (P1)

3. Reportes financieros

- app/api/reportes/caja/route.ts y pares

Casos:

- Usuario no autorizado no puede consultar reportes globales
- Usuario autorizado puede consultar
- Filtros invalidos se rechazan con 400

4. Integridad de calculos de dinero

- lib/db/sales (funciones de calculo)
- validadores de caja/retiro/movimiento

Casos:

- Suma de pagos == total venta
- No permitir montos negativos
- Redondeo consistente a 2 decimales
- No permitir doble aplicacion de retiro/arqueo

5. Pruebas de regresion sobre brechas criticas

- /api/cash-sessions/[id]/auditoria bloqueado para no autorizados
- /api/debug/pago-mixto inexistente o restringido

## Objetivo de cobertura inicial

- Security/Auth helpers: >= 90%
- Endpoints financieros: >= 80%
- Modulos de calculo dinero: >= 90%
- Cobertura global inicial: >= 75%

## Scripts sugeridos

- test:unit
- test:unit:watch
- test:coverage

## 5) Plan de ejecucion (semanas)

Semana 1:

- Ejecutar P0 completo
- Esqueleto de tests + primeros tests de auth y endpoints criticos

Semana 2:

- Rate limiting + idempotencia + auditoria minima (P1)
- Tests unitarios de idempotencia/rate limit

Semana 3-4:

- Logging seguro + headers + ajustes RBAC finos
- Cobertura de reportes y calculos monetarios

Semana 5-6:

- P2 (pipeline seguridad, backup/restore, hardening DB)
- Cierre de brechas de cobertura y regresion

## 6) Definition of Done (DoD)

Hardening considerado completo cuando:

1. No existe endpoint financiero/debug sin auth + RBAC
2. Todas las operaciones POST de dinero tienen rate limit + idempotencia
3. Auditoria financiera registra actor/accion/resultado
4. Secrets rotados y sin defaults inseguros en despliegue
5. Suite unit test ejecuta en CI y bloquea merge si falla
6. Cobertura minima alcanzada segun objetivo
7. Se ejecuta smoke test funcional de caja y ventas en preproduccion

## 7) Backlog tecnico accionable (tickets sugeridos)

- SEC-001 Bloquear endpoint auditoria cash session
- SEC-002 Eliminar/restringir endpoint debug pago mixto
- SEC-003 RBAC estricto en reportes financieros
- SEC-004 Rotacion de secretos y saneamiento de compose/env
- SEC-005 Implementar rate limiting financiero
- SEC-006 Implementar idempotencia en POST de dinero
- SEC-007 Auditoria financiera persistente
- SEC-008 Logging estructurado y redaccion de datos sensibles
- SEC-009 Test suite unitaria base con Vitest
- SEC-010 Test de regresion para brechas criticas

---

Nota operativa:
Este plan prioriza riesgos reales detectados en el codigo actual. La implementacion debe ir en PRs pequenos, con pruebas por cada control de seguridad agregado.
