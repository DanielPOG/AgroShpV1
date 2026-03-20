# Hardening de Seguridad — AgroShpV1

Este documento registra todas las medidas de seguridad aplicadas al proyecto AgroShpV1 (SENA - Centro Agropecuario). Cubre desde la autenticación hasta la infraestructura CI/CD.

---

## Índice

1. [Autenticación (Auth)](#1-autenticación)
2. [Autorización y RBAC](#2-autorización-y-rbac)
3. [Rate Limiting](#3-rate-limiting)
4. [Idempotencia](#4-idempotencia)
5. [Auditoría](#5-auditoría)
6. [Validación de Entradas (Zod)](#6-validación-de-entradas-zod)
7. [Security Headers](#7-security-headers)
8. [Protección de Rutas (Middleware)](#8-protección-de-rutas-middleware)
9. [Seguridad en Base de Datos](#9-seguridad-en-base-de-datos)
10. [Seguridad en API Endpoints](#10-seguridad-en-api-endpoints)
11. [TypeScript Estricto](#11-typescript-estricto)
12. [CI/CD y Escaneo de Vulnerabilidades](#12-cicd-y-escaneo-de-vulnerabilidades)
13. [Pruebas de Seguridad (Unit Tests)](#13-pruebas-de-seguridad-unit-tests)
14. [Docker y Despliegue](#14-docker-y-despliegue)

---

## 1. Autenticación

**Archivo**: `lib/auth-config.ts` / `lib/auth.ts`  
**Estrategia**: JWT via NextAuth v4.24.13

### Configuración de Sesión

| Parámetro       | Valor                                    |
| --------------- | ---------------------------------------- |
| Estrategia      | `jwt`                                    |
| Duración máxima | 30 días (`maxAge`)                       |
| Refresh         | Cada 24 horas (`updateAge`)              |
| Provider        | `CredentialsProvider` (email + password) |

### Cookies de Sesión

| Entorno    | Nombre de Cookie                   |
| ---------- | ---------------------------------- |
| Producción | `__Secure-next-auth.session-token` |
| Desarrollo | `next-auth.session-token`          |

Atributos aplicados: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` (solo producción).

### Flujo de Autenticación

1. El usuario envía `email` + `password`
2. Se busca el usuario por email en la base de datos
3. Se valida que el usuario esté **activo**
4. Se compara la contraseña con `bcryptjs` contra `password_hash`
5. Si es válido, se actualiza `ultimo_acceso` con timestamp del login
6. El token JWT incluye: `id`, `email`, `role`, `nombre`

### JWT Callbacks

- `jwt()` — Agrega `role` e `id` al token en cada emisión
- `session()` — Propaga `role` e `id` a la sesión del cliente

---

## 2. Autorización y RBAC

**Archivo**: `lib/security/authorize.ts`

El sistema tiene **6 roles** con jerarquía específica:

| Rol             | Descripción                        |
| --------------- | ---------------------------------- |
| `Admin`         | Superadministrador técnico         |
| `Administrador` | Administrador del negocio          |
| `Supervisor`    | Supervisión y reportes financieros |
| `Cajero`        | Operaciones de caja y ventas       |
| `Inventarista`  | Gestión de inventario y productos  |
| `Consulta`      | Solo lectura                       |

### Funciones de Autorización

```typescript
normalizeRole(role); // Normaliza el nombre del rol (trim + case)
isAdminRole(role); // Admin | Administrador
isAdminOrSupervisor(role); // Admin | Administrador | Supervisor
canAccessFinancialReports(role); // Admin | Administrador | Supervisor
```

Todas usan `Set<string>` para lookups O(1), sin comparaciones de strings en cadena.

### Funciones de Gestión Administrativa

**Archivo**: `lib/security/admin-management.ts`

```typescript
canDeactivateUser(actorId, targetId); // Impide auto-desactivación
isProtectedRoleName(name); // Roles de sistema no modificables
canDeleteRole(roleId, userCount); // Valida que no tenga usuarios asignados
```

Roles protegidos (no eliminables): `Admin`, `Administrador`, `Cajero`, `Inventarista`, `Consulta`, `Supervisor`.

---

## 3. Rate Limiting

**Archivo**: `lib/security/rate-limit.ts`

### Implementación

- **Backend primario**: Redis con algoritmo **sliding window** via script Lua (`ZREMRANGEBYSCORE` + `ZADD` + `ZCARD`)
- **Fallback**: Bucket en memoria con auto-cleanup cuando supera 5.000 buckets activos
- **Clave**: `rate_limit:{userId}:{endpoint}`

### Límites Configurados por Endpoint

| Endpoint                | Método                | Límite | Ventana | Variables de Entorno                              |
| ----------------------- | --------------------- | ------ | ------- | ------------------------------------------------- |
| `/api/ventas`           | POST                  | 15 req | 60 s    | `RATE_LIMIT_VENTAS_POST_MAX` / `_WINDOW_MS`       |
| `/api/caja/retiros`     | POST                  | 10 req | 60 s    | `RATE_LIMIT_RETIROS_POST_MAX` / `_WINDOW_MS`      |
| `/api/caja/movimientos` | POST                  | 10 req | 60 s    | `RATE_LIMIT_MOVIMIENTOS_POST_MAX` / `_WINDOW_MS`  |
| `/api/turnos`           | POST/DELETE           | 5 req  | 60 s    | `RATE_LIMIT_TURNOS_POST_MAX` / `_WINDOW_MS`       |
| `/api/roles`            | POST/PUT/DELETE       | 15 req | 60 s    | `RATE_LIMIT_ADMIN_ROLES_WRITE_MAX` / `_WINDOW_MS` |
| `/api/usuarios`         | POST/PUT/PATCH/DELETE | 20 req | 60 s    | `RATE_LIMIT_ADMIN_USERS_WRITE_MAX` / `_WINDOW_MS` |

### Respuesta al Superar el Límite

HTTP `429 Too Many Requests` con headers:

```
X-RateLimit-Limit: {max}
X-RateLimit-Remaining: 0
X-RateLimit-Reset: {timestamp}
Retry-After: {segundos}
```

---

## 4. Idempotencia

**Archivo**: `lib/security/idempotency.ts`  
**Tabla DB**: `idempotency_keys` (Prisma schema)

Previene que operaciones financieras se ejecuten dos veces por reintentos de red o doble-clic del usuario.

### Funcionamiento

1. El cliente envía header `X-Idempotency-Key` (UUID, máx. 255 chars)
2. El servidor busca esa clave en la tabla `idempotency_keys`
3. Si existe y no expiró → devuelve la **respuesta original cacheada** (sin re-ejecutar)
4. Si no existe → ejecuta la operación y guarda la respuesta

### Estructura de la Tabla

```
idempotency_key (VARCHAR 255)
endpoint        (VARCHAR 100)
usuario_id      (requerido)   ← previene que otro usuario reutilice la clave
status_code     (integer)
response_body   (JSON)
expires_at      (Timestamptz) ← TTL 24 horas
```

**Índice único**: `(idempotency_key, endpoint, usuario_id)` — la combinación de los tres es la clave de deduplicación.  
**Índice adicional**: `expires_at` para cleanup eficiente de registros expirados.

---

## 5. Auditoría

**Archivo**: `lib/security/audit.ts`  
**Tabla DB**: `auditoria`

Registro inmutable de todas las operaciones financieras y de seguridad.

### Funciones Exportadas

```typescript
logAudit(entry); // Falla silenciosa — jamás interrumpe la operación principal
logAuditTx(tx, entry); // Auditoría dentro de una transacción Prisma (atómica)
summarizeSale(); // Resume datos de venta para el log
summarizeMovimiento(); // Resume movimiento de caja
summarizeRetiro(); // Resume retiro de efectivo
summarizeTurno(); // Resume apertura/cierre de turno
```

### Tipos de Acción Registrados

```typescript
type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "AUTHORIZE" | "REJECT";
```

### Estructura de la Tabla

```
tabla          (nombre de la entidad afectada)
registro_id    (PK del registro afectado)
accion         (VARCHAR 20)
usuario_id     (quién ejecutó la acción)
datos_anteriores (JSON) ← estado previo
datos_nuevos     (JSON) ← estado posterior
ip_address     (VARCHAR 50)
user_agent     (texto)
fecha          (Timestamptz con timezone)
```

**Índices**: `(tabla, registro_id)` y `(usuario_id)` para consultas de auditoría.

---

## 6. Validación de Entradas (Zod)

**Directorio**: `lib/validations/`

Todos los endpoints de escritura validan el body con schemas Zod antes de tocar la base de datos. Total: **20+ schemas**.

### Schemas Principales

| Schema                      | Validaciones Clave                                                |
| --------------------------- | ----------------------------------------------------------------- |
| `sale.schema.ts`            | Items > 0, precios >= 0, al menos 1 item, métodos de pago válidos |
| `retiro-caja.schema.ts`     | Motivo: 10–200 chars, monto: 0.01–50.000.000                      |
| `admin-user.schema.ts`      | Email válido, contraseña mínimo 8 chars, rol debe existir         |
| `admin-role.schema.ts`      | Nombre: 2–50 chars, no puede ser nombre de rol protegido          |
| `cash-session.schema.ts`    | Fondo inicial >= 0                                                |
| `cash-withdrawal.schema.ts` | Monto > 0, motivo requerido                                       |
| `lote.schema.ts`            | Fechas de vencimiento, cantidad > 0                               |
| `movimientos.schema.ts`     | Tipo válido, monto > 0                                            |

---

## 7. Security Headers

**Archivo**: `middleware.ts`

Aplicados en cada respuesta HTTP vía Next.js Middleware:

| Header                   | Valor                                      | Propósito                  |
| ------------------------ | ------------------------------------------ | -------------------------- |
| `X-Content-Type-Options` | `nosniff`                                  | Previene MIME sniffing     |
| `X-Frame-Options`        | `DENY`                                     | Previene clickjacking      |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`          | Limita datos en Referer    |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()` | Desactiva APIs de hardware |
| `X-DNS-Prefetch-Control` | `off`                                      | Reduce fingerprinting DNS  |

---

## 8. Protección de Rutas (Middleware)

**Archivo**: `middleware.ts`

### Rutas Protegidas (requieren JWT válido)

- `/dashboard/*` — Todo el panel de gestión
- `/api/*` — Todas las APIs (con excepciones)

### Rutas Públicas (sin autenticación)

- `/api/auth/*` — Endpoints de NextAuth
- `/api/public/*` — APIs públicas explícitas
- `/api/catalogo/*` — Catálogo público del agroShop
- `/api/lotes/check-vencimientos` — Cron job externo

### Comportamiento

1. Si el token JWT es inválido o ausente en ruta protegida → `redirect /login`
2. Si la cookie es `__Secure-next-auth.session-token` (prod) o `next-auth.session-token` (dev)
3. Los security headers se agregan en **todas** las rutas (protegidas y públicas)

---

## 9. Seguridad en Base de Datos

### CHECK Constraints — `database/`

Aplicados directamente en PostgreSQL para garantizar integridad incluso si la aplicación falla.

**Monetarios (valores no negativos)**:

```sql
ventas:          subtotal >= 0, impuesto >= 0, descuento >= 0, total >= 0
detalle_ventas:  cantidad > 0, precio_unitario >= 0, costo_unitario >= 0
sesiones_caja:   fondo_inicial >= 0, ventas_efectivo >= 0, ventas_tarjeta >= 0,
                 retiros >= 0, gastos >= 0
movimientos_caja: monto > 0
retiros_caja:    monto > 0
gastos_caja:     monto > 0
turnos_caja:     monto_inicial >= 0, efectivo_inicial >= 0
pagos_venta:     monto > 0
```

**De estado (ENUM a nivel DB)**:

```sql
sesiones_caja:  estado IN ('abierta', 'cerrada')
retiros_caja:   estado IN ('pendiente', 'autorizado', 'rechazado', 'completado')
turnos_caja:    estado IN ('activo', 'finalizado', 'suspendido')
```

**Lógicos (integridad referencial extendida)**:

```sql
-- Si el retiro fue autorizado o completado, debe tener quien lo autorizó:
retiros_caja: CHECK (estado NOT IN ('autorizado','completado') OR autorizado_por IS NOT NULL)
```

### Tablas de Seguridad en Prisma Schema

- **`auditoria`**: Registro de auditoría (ver sección 5)
- **`idempotency_keys`**: Deduplicación de operaciones (ver sección 4)

---

## 10. Seguridad en API Endpoints

Cada endpoint de escritura sigue esta cadena de verificación:

```
Auth → RBAC → Rate Limit → Idempotencia → Zod → Lógica → Audit → Guardar Idempotencia
```

### Controles por Endpoint

#### `POST /api/ventas`

- ✅ Autenticación requerida
- ✅ Rate limit: 15 req/min
- ✅ Idempotencia: `X-Idempotency-Key`
- ✅ Validación Zod: `createSaleSchema`
- ✅ Auditoría: `logAudit()` tras confirmar venta
- ✅ RBAC en lectura: Admin/Administrador ven todas; otros solo las propias

#### `POST /api/caja/retiros`

- ✅ Autenticación requerida
- ✅ Rate limit: 10 req/min
- ✅ Idempotencia: `X-Idempotency-Key`
- ✅ Validación Zod: `retiroCajaSchema`
- ✅ Auditoría: `summarizeRetiro()` logging
- ✅ RBAC: Solo Admin/Supervisor autorizan retiros pendientes

#### `GET /api/reportes/caja`

- ✅ Autenticación requerida
- ✅ RBAC: `canAccessFinancialReports()` — Solo Admin/Administrador/Supervisor

#### `GET /api/cash-sessions/[id]/auditoria`

- ✅ Autenticación requerida
- ✅ RBAC: `isAdminOrSupervisor()` — Solo Admin/Administrador/Supervisor
- ✅ Validación de parámetro `id` (debe ser número válido)
- ✅ Respuestas específicas: 401/403/400/404/500

#### `GET /api/debug/pago-mixto`

- ✅ Autenticación requerida
- ✅ RBAC: `isAdminRole()` — Solo Admin/Administrador
- ✅ Guard de entorno: Solo disponible en `NODE_ENV=development`
- ✅ Validación de parámetro `codigo`

#### Endpoints administrativos (`/api/roles`, `/api/usuarios`)

- ✅ Autenticación requerida
- ✅ Rate limit: 15–20 req/min según endpoint
- ✅ RBAC: Solo Admin/Administrador
- ✅ `canDeactivateUser()` — Impide auto-desactivación
- ✅ `isProtectedRoleName()` — Protege roles del sistema
- ✅ `canDeleteRole()` — Valida que no haya usuarios asignados antes de eliminar

---

## 11. TypeScript Estricto

**Archivo**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false,
    "skipLibCheck": true
  }
}
```

- `strict: true` activa: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitThis`
- Build de producción (`next build`) falla si hay errores TypeScript — no hay override de `ignoreBuildErrors`
- Se ejecuta `tsc --noEmit` en CI antes de build Docker

---

## 12. CI/CD y Escaneo de Vulnerabilidades

**Archivo**: `.github/workflows/security-ci.yml`

Cinco jobs que corren en cada push/PR:

```
typecheck-and-lint ──┐
unit-tests          ──┼──→ docker-build
audit-dependencies ──┘
secret-scan (paralelo)
```

### Jobs Detallados

#### `typecheck-and-lint`

```bash
pnpm prisma generate   # tipos generados antes de typecheck
tsc --noEmit           # validación TypeScript estricta
```

#### `unit-tests`

```bash
pnpm test              # Vitest — 168 tests, todos deben pasar
```

#### `audit-dependencies`

```bash
pnpm audit --audit-level=high   # vulnerabilidades HIGH/CRITICAL
better-npm-audit                 # reporte extendido
```

#### `secret-scan`

```bash
trufflehog filesystem . --only-verified   # busca credenciales hardcodeadas verificadas
```

#### `docker-build`

```bash
docker build ...   # build completo con credenciales de CI
# Depende de: typecheck-and-lint + unit-tests (ambos deben pasar)
```

---

## 13. Pruebas de Seguridad (Unit Tests)

**Directorio**: `tests/unit/`  
**Framework**: Vitest 4.1.0 + @vitest/coverage-v8  
**Total**: 168 tests, todos pasando  
**Cobertura**: 85.81% statements en módulos de seguridad

### Archivos de Test

| Archivo                                | Tests | Qué Cubre                                                                                            |
| -------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| `security/authorize.test.ts`           | 31    | `normalizeRole`, `isAdminRole`, `isAdminOrSupervisor`, `canAccessFinancialReports` — todos los roles |
| `security/rate-limit.test.ts`          | 16    | Sliding window, fallback memoria, headers de respuesta, cleanup                                      |
| `security/idempotency.test.ts`         | 14    | Replay de claves, TTL 24h, clave por usuario, compuesto único                                        |
| `security/audit.test.ts`               | 9     | `logAudit` falla silenciosa, `logAuditTx` atómico, summarizers                                       |
| `security/admin-management.test.ts`    | ~15   | Auto-desactivación, roles protegidos, eliminación de rol con usuarios                                |
| `lib/auth.test.ts`                     | 38    | Flujo JWT, callbacks, validación bcrypt, usuario inactivo                                            |
| `validations/schemas.test.ts`          | 33    | Schemas de venta, retiro, descuentos, métodos de pago                                                |
| `regression/critical-breaches.test.ts` | 27    | Tests de regresión P0/P1/P2 — previene re-introducción de vulnerabilidades críticas                  |

### Tests de Regresión (P0/P1/P2)

El archivo `critical-breaches.test.ts` garantiza que las vulnerabilidades críticas corregidas **no vuelvan a introducirse**:

- **P0**: Acceso sin autenticación a endpoints financieros
- **P1**: Bypass de RBAC en reportes (usuario sin permiso accediendo a `/api/reportes/caja`)
- **P1**: Rate limiting desactivado en ventas
- **P2**: Idempotencia sin verificación de `usuario_id` (un usuario no puede reutilizar clave de otro)
- **P2**: Retiros sin validación de monto mínimo

---

## 14. Docker y Despliegue

**Archivos**: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

### Dockerfile

- Build **multi-stage** (builder → runner) para imagen mínima
- Usuario no-root en runtime (`nextjs:nodejs`)
- `pnpm` como package manager (lockfile verificado en CI)
- `pnpm prisma generate` dentro del build para tipos correctos

### .dockerignore

Excluye del contexto de build:

- `scripts/` — Scripts de administración
- `database/` — SQL de desarrollo/debug
- `.env*` — Variables de entorno locales
- `node_modules/`, `.next/`, `coverage/`

### Variables de Entorno Requeridas en Producción

```env
DATABASE_URL          # PostgreSQL connection string
NEXTAUTH_SECRET       # Secreto JWT (≥ 32 chars aleatorios)
NEXTAUTH_URL          # URL base del sitio (https://...)
REDIS_URL             # Redis para rate limiting (opcional — fallback memoria)
```

---

## Resumen Ejecutivo

| Área                       | Estado | Notas                                            |
| -------------------------- | ------ | ------------------------------------------------ |
| Autenticación JWT          | ✅     | Cookies seguras, bcrypt, refresh 24h             |
| RBAC 6 roles               | ✅     | Lookup O(1) con Set                              |
| Rate Limiting              | ✅     | Redis sliding window + fallback memoria          |
| Idempotencia               | ✅     | 24h TTL, por usuario+endpoint                    |
| Auditoría                  | ✅     | Falla silenciosa, datos antes/después, IP        |
| Validación Zod             | ✅     | 20+ schemas, todos los endpoints de escritura    |
| Security Headers           | ✅     | 5 headers via middleware                         |
| CHECK Constraints DB       | ✅     | 20+ constraints monetarios y de estado           |
| TypeScript strict          | ✅     | `strict: true`, build falla en errores           |
| CI/CD                      | ✅     | 5 jobs: typecheck, tests, audit, secrets, docker |
| Unit Tests                 | ✅     | 168 tests, 85.81% cobertura en seguridad         |
| Docker                     | ✅     | Multi-stage, usuario no-root                     |
| Branding externo eliminado | ✅     | Sin Vercel Analytics, sin generador v0           |

**Áreas con cobertura parcial**:

- Rate limiting no aplicado en `GET /api/reportes` ni `GET /api/debug` (solo lectura)
- Sin CORS explícito declarado (Next.js mismo origin por defecto)
- Sin CSP header (Content-Security-Policy) — pendiente de implementar
