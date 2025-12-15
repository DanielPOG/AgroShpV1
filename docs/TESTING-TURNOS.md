# 🧪 Plan de Testing - Sistema de Turnos de Caja

**Fecha:** 14 de diciembre de 2025  
**Sistema:** AgroShop POS  
**Alcance:** Testing End-to-End del sistema de sesiones y turnos

---

## 📋 Checklist de Testing

### ✅ Fase 1: Validaciones de Base de Datos

- [ ] Verificar que todos los índices estén creados
- [ ] Confirmar constraints funcionando (check_tipo_relevo, check_estado)
- [ ] Validar relaciones FK entre turnos_caja y tablas transaccionales
- [ ] Probar query de vista `vista_turnos_completos`

---

### ✅ Fase 2: Testing de Backend (Funciones Core)

#### Test 2.1: Iniciar Turno

```bash
Escenario: Iniciar primer turno del día
- Dado: Sesión de caja abierta sin turnos
- Cuando: Cajero inicia turno con efectivo_inicial = $200,000
- Entonces:
  ✓ Turno creado con estado 'activo'
  ✓ efectivo_inicial = $200,000
  ✓ tipo_relevo = 'inicio_jornada'
  ✓ Solo existe 1 turno activo en la sesión
```

#### Test 2.2: Validar Turno Activo

```bash
Escenario: Intentar venta sin turno activo
- Dado: Sesión abierta, pero cajero no tiene turno
- Cuando: Cajero intenta crear venta
- Entonces:
  ✓ Sistema arroja error: "No tienes un turno activo"
  ✓ Venta no se crea
```

#### Test 2.3: Cerrar Turno

```bash
Escenario: Cerrar turno con diferencia
- Dado: Turno activo con ventas registradas
- Cuando: Cajero cierra con efectivo_final = $320,500
- Entonces:
  ✓ Sistema calcula diferencia correctamente
  ✓ Turno cambia a estado 'cerrado'
  ✓ fecha_fin registrada
  ✓ duracion_minutos calculada
```

#### Test 2.4: Relevo Entre Cajeros

```bash
Escenario: Cambio de turno normal
- Dado: Turno A cerrado con efectivo_final = $320,000
- Cuando: Cajero B inicia turno
- Entonces:
  ✓ efectivo_inicial de turno B = $320,000
  ✓ turno_anterior_id apunta a turno A
  ✓ tipo_relevo = 'cambio_turno'
```

---

### ✅ Fase 3: Testing de API Endpoints

#### Test 3.1: POST /api/turnos (Iniciar Turno)

```bash
# Test exitoso
curl -X POST http://localhost:3000/api/turnos \
  -H "Content-Type: application/json" \
  -d '{
    "efectivo_inicial": 200000,
    "tipo_relevo": "inicio_jornada",
    "observaciones": "Primer turno del día"
  }'

Esperado: Status 201, turno creado

# Test fallido - Sin sesión activa
Esperado: Status 400, error "No tienes una sesión de caja abierta"

# Test fallido - Turno ya activo
Esperado: Status 400, error "Ya tienes un turno activo"
```

#### Test 3.2: GET /api/turnos/activo

```bash
# Con turno activo
Esperado: Status 200, datos del turno

# Sin turno activo
Esperado: Status 200, null
```

#### Test 3.3: PUT /api/turnos/[id] (Cerrar)

```bash
curl -X PUT http://localhost:3000/api/turnos/123 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cerrar",
    "efectivo_final": 320500,
    "desglose_efectivo": {...},
    "observaciones_cierre": "Sin novedades"
  }'

Esperado: Status 200, turno cerrado con diferencia calculada
```

#### Test 3.4: GET /api/reportes/turnos

```bash
# Resumen de turno
GET /api/reportes/turnos?tipo=resumen&turno_id=123
Esperado: Status 200, resumen completo

# Comparativo
GET /api/reportes/turnos?tipo=comparativo&sesion_caja_id=45
Esperado: Status 200, array de turnos con totales

# Estadísticas de cajero
GET /api/reportes/turnos?tipo=estadisticas&cajero_id=7
Esperado: Status 200, métricas de desempeño
```

---

### ✅ Fase 4: Testing de Integración (Ventas + Turnos)

#### Test 4.1: Crear Venta con Turno

```bash
Escenario: Venta exitosa vinculada a turno
- Dado: Cajero con turno activo
- Cuando: Realiza venta de $50,000
- Entonces:
  ✓ Venta creada con turno_caja_id correcto
  ✓ Movimiento de caja incluye turno_caja_id
  ✓ Efectivo esperado del turno se actualiza
```

#### Test 4.2: Bloquear Venta sin Turno

```bash
Escenario: Intento de venta sin turno
- Dado: Cajero sin turno activo
- Cuando: Intenta crear venta
- Entonces:
  ✓ API retorna 400
  ✓ Error: "No tienes un turno activo"
  ✓ Venta no se crea
```

---

### ✅ Fase 5: Testing de Validaciones Críticas

#### Test 5.1: Único Turno Activo por Cajero

```bash
Escenario: Intentar iniciar segundo turno
- Dado: Cajero ya tiene turno activo
- Cuando: Intenta iniciar otro turno
- Entonces:
  ✓ Sistema rechaza con error
  ✓ Solo existe 1 turno activo
```

#### Test 5.2: Cerrar Sesión con Turnos Activos

```bash
Escenario: Sesión con turnos sin cerrar
- Dado: Sesión con 1 turno activo
- Cuando: Admin intenta cerrar sesión
- Entonces:
  ✓ Sistema rechaza
  ✓ Error: "Hay 1 turno(s) activo(s): Juan Pérez"
```

#### Test 5.3: Efectivo Inicial = Final Turno Anterior

```bash
Escenario: Relevo con efectivo incorrecto
- Dado: Turno A cerró con $320,000
- Cuando: Cajero B inicia con $300,000
- Entonces:
  ✓ Sistema alerta discrepancia
  ✓ Requiere confirmación/autorización
```

---

### ✅ Fase 6: Testing de UI (Modales)

#### Test 6.1: Modal Iniciar Turno

- [ ] Abrir modal "Iniciar Turno"
- [ ] Verificar campo efectivo_inicial pre-llenado (si hay turno anterior)
- [ ] Seleccionar tipo de relevo
- [ ] Agregar observaciones
- [ ] Confirmar y verificar que turno se crea
- [ ] Modal se cierra y UI se actualiza

#### Test 6.2: Modal Cerrar Turno - Modo Simple

- [ ] Abrir modal "Cerrar Turno"
- [ ] Seleccionar tab "Conteo Simple"
- [ ] Ingresar efectivo final: 320500
- [ ] Ver cálculo automático de diferencia
- [ ] Verificar color del badge (verde/amarillo/rojo)
- [ ] Confirmar cierre
- [ ] Verificar turno cerrado en backend

#### Test 6.3: Modal Cerrar Turno - Modo Desglose

- [ ] Abrir modal "Cerrar Turno"
- [ ] Seleccionar tab "Desglose Detallado"
- [ ] Ingresar cantidad de cada denominación
- [ ] Ver cálculo automático del total
- [ ] Verificar que coincida con esperado
- [ ] Confirmar cierre con desglose guardado

#### Test 6.4: Indicador de Turno Activo

- [ ] Verificar badge visible con nombre de cajero
- [ ] Mostrar hora de inicio
- [ ] Botón "Cerrar Turno" habilitado
- [ ] Al cerrar, badge desaparece
- [ ] Botón "Iniciar Turno" aparece

---

### ✅ Fase 7: Testing de Reportes

#### Test 7.1: Reporte de Resumen

- [ ] Navegar a Reportes → Turnos
- [ ] Seleccionar turno específico
- [ ] Verificar todos los datos presentes:
  - Información del cajero
  - Duración del turno
  - Ventas por método de pago
  - Movimientos adicionales
  - Retiros y gastos
  - Diferencia final

#### Test 7.2: Reporte Comparativo

- [ ] Filtrar por sesión
- [ ] Ver tabla con todos los turnos
- [ ] Verificar totales calculados correctamente
- [ ] Probar exportación a Excel
- [ ] Verificar gráficos (si implementados)

---

### ✅ Fase 8: Testing de Casos Edge

#### Test 8.1: Turno de Larga Duración

```bash
Escenario: Turno activo más de 8 horas
- Dado: Turno iniciado hace 9 horas
- Entonces:
  ✓ Sistema muestra alerta: "Turno activo por más de 8 horas"
  ✓ Recomienda cerrar turno
```

#### Test 8.2: Diferencia Alta al Cerrar

```bash
Escenario: Faltante significativo
- Dado: Efectivo esperado = $500,000
- Cuando: Cajero cuenta solo $480,000
- Entonces:
  ✓ Alerta roja: "Diferencia significativa: -$20,000"
  ✓ Requiere observaciones obligatorias
  ✓ Notifica a supervisor
```

#### Test 8.3: Relevo de Emergencia

```bash
Escenario: Cajero se enferma repentinamente
- Dado: Turno activo de María
- Cuando: Carlos solicita relevo de emergencia
- Entonces:
  ✓ Modal requiere autorización de supervisor
  ✓ Campo "Autorizado por" obligatorio
  ✓ Observaciones requeridas
  ✓ Turno de María se suspende
  ✓ Turno de Carlos inicia como emergencia
```

---

### ✅ Fase 9: Testing de Permisos

#### Test 9.1: Cajero Intenta Ver Turno Ajeno

```bash
GET /api/reportes/turnos?tipo=resumen&turno_id=999
(donde 999 pertenece a otro cajero)

Esperado: Status 403, "No tienes permiso para ver este turno"
```

#### Test 9.2: Supervisor Suspende Turno

```bash
PUT /api/turnos/123
{ "action": "suspender", "motivo": "Auditoría" }

Cajero: Status 403
Supervisor: Status 200 ✓
Admin: Status 200 ✓
```

---

### ✅ Fase 10: Testing de Performance

#### Test 10.1: Carga de Reportes

- [ ] Generar reporte con 50+ turnos
- [ ] Medir tiempo de respuesta
- [ ] Objetivo: < 2 segundos

#### Test 10.2: Concurrencia

- [ ] 3 cajeros iniciando turno simultáneamente
- [ ] Verificar que solo 1 por cajero se crea
- [ ] Sin race conditions

#### Test 10.3: Cierre de Sesión con Múltiples Turnos

- [ ] Sesión con 5 turnos cerrados
- [ ] Cerrar sesión
- [ ] Verificar cálculo consolidado correcto
- [ ] Tiempo de respuesta < 3 segundos

---

## 📝 Script de Testing Manual

### Flujo Completo (30 minutos)

```bash
1. [Admin] Abrir sesión de caja
   - Fondo inicial: $200,000
   - Verificar: Sesión creada ✓

2. [Cajero A - María] Iniciar turno
   - Efectivo inicial: $200,000
   - Tipo: Inicio de jornada
   - Verificar: Turno activo ✓

3. [María] Realizar 5 ventas
   - Total: $150,000
   - Métodos: Efectivo, Tarjeta, Nequi
   - Verificar: Ventas vinculadas al turno ✓

4. [María] Cerrar turno
   - Efectivo esperado: $350,000
   - Efectivo contado: $350,200
   - Diferencia: +$200
   - Verificar: Turno cerrado ✓

5. [Cajero B - Carlos] Iniciar turno
   - Efectivo inicial: $350,200 (del turno anterior)
   - Tipo: Cambio de turno
   - Verificar: Relevo exitoso ✓

6. [Carlos] Realizar 3 ventas
   - Total: $80,000
   - Verificar: Ventas en turno de Carlos ✓

7. [Carlos] Cerrar turno
   - Contar con desglose detallado
   - Verificar: Desglose guardado ✓

8. [Admin] Ver reportes
   - Comparativo de sesión: 2 turnos
   - Verificar totales correctos ✓

9. [Admin] Cerrar sesión
   - Arqueo final consolidado
   - Verificar: Sesión cerrada ✓

10. [Admin] Generar reporte del día
    - Exportar a Excel
    - Verificar: Datos completos ✓
```

---

## ✅ Criterios de Aceptación

### Funcionalidad ✅

- [ ] Todos los flujos principales funcionan sin errores
- [ ] Validaciones bloquean acciones incorrectas
- [ ] Reportes muestran datos precisos
- [ ] No hay pérdida de datos

### Performance ✅

- [ ] APIs responden en < 500ms
- [ ] Reportes cargan en < 2 segundos
- [ ] UI responde sin lag
- [ ] Sin fugas de memoria después de 8 horas

### UX/UI ✅

- [ ] Modales intuitivos y claros
- [ ] Mensajes de error descriptivos
- [ ] Alertas visibles y útiles
- [ ] Colores y badges informativos

### Seguridad ✅

- [ ] Permisos funcionan correctamente
- [ ] Cajeros solo ven sus datos
- [ ] Autorización requerida para acciones sensibles
- [ ] Logs de auditoría funcionando

---

## 🐛 Reporte de Bugs

**Formato:**

```
Título: [COMPONENTE] Descripción breve
Severidad: Crítica | Alta | Media | Baja
Pasos para reproducir:
1. Paso 1
2. Paso 2
Resultado esperado:
Resultado actual:
```

---

**Última actualización:** 14 de diciembre de 2025  
**Responsable:** Equipo QA AgroShop  
**Estado:** ✅ Listo para testing
