# 🎯 Plan de Implementación - Sistema de Sesiones y Turnos de Caja

**Fecha:** 14 de diciembre de 2025  
**Objetivo:** Implementar sistema de doble capa (Sesión + Turnos) para mejor control y trazabilidad

## 📋 Resumen Ejecutivo

Sistema de **doble capa** para gestión de caja:

- **Sesión de Caja**: Contenedor del día completo (8am - 8pm)
- **Turnos de Caja**: Responsabilidad individual de cada cajero (4h c/u)

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────────┐
│        SESIÓN DE CAJA (Día)             │
│  ┌───────────────────────────────────┐  │
│  │  TURNO 1 - María (8am-12pm)       │  │
│  │  → 25 ventas, $80,000             │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  TURNO 2 - Carlos (12pm-4pm)      │  │
│  │  → 35 ventas, $140,000            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  TURNO 3 - Ana (4pm-8pm)          │  │
│  │  → 28 ventas, $95,000             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 📊 Fase 1: Análisis y Diseño de Base de Datos

### 1.1 Tabla `turnos_caja` (Actualizar)

```sql
-- Agregar campos de control
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS efectivo_inicial DECIMAL(10,2);
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS efectivo_final DECIMAL(10,2);
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS diferencia DECIMAL(10,2);
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS tipo_relevo VARCHAR(50) DEFAULT 'normal';
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS autorizado_por INT REFERENCES usuarios(id);
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo';
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS observaciones_cierre TEXT;
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS desglose_efectivo JSONB;
ALTER TABLE turnos_caja ADD COLUMN IF NOT EXISTS turno_anterior_id INT REFERENCES turnos_caja(id);

-- Agregar checks
ALTER TABLE turnos_caja ADD CONSTRAINT check_tipo_relevo
  CHECK (tipo_relevo IN ('normal', 'emergencia', 'descanso'));

ALTER TABLE turnos_caja ADD CONSTRAINT check_estado
  CHECK (estado IN ('activo', 'cerrado', 'suspendido'));

-- Comentarios
COMMENT ON COLUMN turnos_caja.efectivo_inicial IS 'Efectivo recibido al iniciar turno';
COMMENT ON COLUMN turnos_caja.efectivo_final IS 'Efectivo contado al cerrar turno';
COMMENT ON COLUMN turnos_caja.diferencia IS 'Diferencia entre esperado y contado';
COMMENT ON COLUMN turnos_caja.tipo_relevo IS 'Tipo: normal, emergencia, descanso';
COMMENT ON COLUMN turnos_caja.autorizado_por IS 'Supervisor que autorizó (emergencias)';
COMMENT ON COLUMN turnos_caja.estado IS 'Estado: activo, cerrado, suspendido';
COMMENT ON COLUMN turnos_caja.desglose_efectivo IS 'JSON con conteo de billetes/monedas';
COMMENT ON COLUMN turnos_caja.turno_anterior_id IS 'ID del turno previo para trazabilidad';
```

### 1.2 Vincular Transacciones a Turnos

```sql
-- Agregar turno_caja_id a todas las tablas de transacciones
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);
ALTER TABLE movimientos_caja ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);
ALTER TABLE retiros_caja ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);
ALTER TABLE gastos_caja ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);

-- Comentarios para documentación
COMMENT ON COLUMN ventas.turno_caja_id IS 'Turno en el que se realizó la venta';
COMMENT ON COLUMN movimientos_caja.turno_caja_id IS 'Turno en el que se realizó el movimiento';
COMMENT ON COLUMN retiros_caja.turno_caja_id IS 'Turno en el que se solicitó el retiro';
COMMENT ON COLUMN gastos_caja.turno_caja_id IS 'Turno en el que se registró el gasto';
```

### 1.3 Índices para Performance

```sql
-- Índices en tablas de transacciones
CREATE INDEX IF NOT EXISTS idx_ventas_turno ON ventas(turno_caja_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_turno ON movimientos_caja(turno_caja_id);
CREATE INDEX IF NOT EXISTS idx_retiros_turno ON retiros_caja(turno_caja_id);
CREATE INDEX IF NOT EXISTS idx_gastos_turno ON gastos_caja(turno_caja_id);

-- Índices en tabla de turnos
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos_caja(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_activos ON turnos_caja(sesion_caja_id, estado) WHERE estado = 'activo';
CREATE INDEX IF NOT EXISTS idx_turnos_cajero ON turnos_caja(cajero_id);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos_caja(fecha_inicio);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_turnos_sesion_cajero ON turnos_caja(sesion_caja_id, cajero_id);
```

### 1.4 Vistas Útiles

```sql
-- Vista de turnos con totales calculados
CREATE OR REPLACE VIEW vista_turnos_completos AS
SELECT
  t.*,
  u.nombre || ' ' || u.apellido as nombre_cajero,
  sc.codigo_sesion,
  COALESCE(SUM(v.total), 0) as total_ventas,
  COUNT(DISTINCT v.id) as cantidad_ventas,
  COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'ingreso_adicional' THEN mc.monto ELSE 0 END), 0) as ingresos_adicionales,
  COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'egreso_operativo' THEN mc.monto ELSE 0 END), 0) as egresos_operativos,
  COALESCE(SUM(rc.monto), 0) as total_retiros,
  COALESCE(SUM(gc.monto), 0) as total_gastos,
  -- Calcular efectivo esperado
  t.efectivo_inicial +
  COALESCE(SUM(v.total), 0) +
  COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'ingreso_adicional' THEN mc.monto ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'egreso_operativo' THEN mc.monto ELSE 0 END), 0) -
  COALESCE(SUM(rc.monto), 0) -
  COALESCE(SUM(gc.monto), 0) as efectivo_esperado_calculado
FROM turnos_caja t
INNER JOIN usuarios u ON t.cajero_id = u.id
INNER JOIN sesiones_caja sc ON t.sesion_caja_id = sc.id
LEFT JOIN ventas v ON v.turno_caja_id = t.id
LEFT JOIN movimientos_caja mc ON mc.turno_caja_id = t.id
LEFT JOIN retiros_caja rc ON rc.turno_caja_id = t.id AND rc.estado = 'completado'
LEFT JOIN gastos_caja gc ON gc.turno_caja_id = t.id
GROUP BY t.id, u.nombre, u.apellido, sc.codigo_sesion;
```

## 🔧 Fase 2: Backend - Funciones Core

### 2.1 Funciones en `lib/db/turnos-caja.ts`

```typescript
// 1. Iniciar turno
export async function iniciarTurno(data: {
  sesion_caja_id: number;
  cajero_id: number;
  efectivo_inicial: number;
  tipo_relevo: "normal" | "emergencia" | "descanso";
  autorizado_por?: number;
  observaciones?: string;
  turno_anterior_id?: number;
}): Promise<TurnoCaja>;

// 2. Cerrar turno
export async function cerrarTurno(
  turnoId: number,
  data: {
    efectivo_final: number;
    desglose_efectivo: DesgloseEfectivo;
    observaciones_cierre?: string;
  }
): Promise<TurnoCajaCerrado>;

// 3. Obtener turno activo
export async function getTurnoActivo(
  sesionId?: number,
  cajeroId?: number
): Promise<TurnoCaja | null>;

// 4. Validar relevo
export async function validarRelevo(
  turnoActualId: number,
  nuevoCajeroId: number,
  efectivoTransferido: number
): Promise<ValidacionRelevo>;

// 5. Calcular totales por turno
export async function getTotalesTurno(turnoId: number): Promise<TotalesTurno>;

// 6. Validar un solo turno activo
export async function validarUnSoloTurnoActivo(sesionId: number): Promise<void>;

// 7. Obtener turnos de una sesión
export async function getTurnosSesion(sesionId: number): Promise<TurnoCaja[]>;
```

### 2.2 Tipos TypeScript

```typescript
interface TurnoCaja {
  id: number;
  sesion_caja_id: number;
  cajero_id: number;
  fecha_inicio: Date;
  fecha_fin?: Date;
  efectivo_inicial: number;
  efectivo_final?: number;
  diferencia?: number;
  tipo_relevo: "normal" | "emergencia" | "descanso";
  autorizado_por?: number;
  estado: "activo" | "cerrado" | "suspendido";
  observaciones?: string;
  observaciones_cierre?: string;
  desglose_efectivo?: DesgloseEfectivo;
  turno_anterior_id?: number;
}

interface DesgloseEfectivo {
  billetes_100000: number;
  billetes_50000: number;
  billetes_20000: number;
  billetes_10000: number;
  billetes_5000: number;
  billetes_2000: number;
  billetes_1000: number;
  monedas_1000: number;
  monedas_500: number;
  monedas_200: number;
  monedas_100: number;
  monedas_50: number;
}

interface TotalesTurno {
  ventas: {
    cantidad: number;
    total: number;
    efectivo: number;
    nequi: number;
    tarjeta: number;
    transferencia: number;
  };
  movimientos: {
    ingresos: number;
    egresos: number;
  };
  retiros: {
    cantidad: number;
    total: number;
  };
  gastos: {
    cantidad: number;
    total: number;
  };
  efectivo_esperado: number;
  duracion_minutos: number;
}
```

## 🎨 Fase 3: Componentes UI

### 3.1 Componentes Nuevos

1. **`<TurnoStatusBadge />`** - Badge en header con info del turno
2. **`<IniciarTurnoModal />`** - Modal para iniciar turno
3. **`<CerrarTurnoModal />`** - Modal para cerrar turno (mini-arqueo)
4. **`<RelevoModal />`** - Modal para cambio de turno
5. **`<TurnoInfo />`** - Card con información detallada del turno

### 3.2 Hooks Personalizados

```typescript
// hooks/use-turno-activo.ts
export function useTurnoActivo() {
  const [turno, setTurno] = useState<TurnoCaja | null>(null);
  const [loading, setLoading] = useState(true);

  return {
    turno,
    loading,
    hasTurnoActivo: turno !== null && turno.estado === "activo",
    reload: loadTurno,
  };
}
```

## 🔄 Fase 4: Flujos de Negocio

### 4.1 Flujo: Inicio del Día

```
1. Admin/Supervisor → Abrir Sesión de Caja
2. Sistema → Retorna sesión sin turno
3. UI → Muestra mensaje "Debes iniciar tu turno"
4. Primer Cajero → Iniciar Turno (recibe fondo inicial)
5. Sistema → Valida y crea turno activo
6. UI → Habilita POS para ventas
```

### 4.2 Flujo: Cambio de Turno (Relevo Normal)

```
1. Cajero A → "Cerrar Mi Turno"
2. UI → Modal de mini-arqueo (contar billetes)
3. Sistema → Calcula diferencia, cierra turno
4. UI → Muestra resumen del turno cerrado
5. Cajero B → "Iniciar Mi Turno"
6. UI → Modal recibe efectivo del turno anterior
7. Sistema → Valida transferencia, crea nuevo turno
8. Cajero B → Puede empezar a vender
```

### 4.3 Flujo: Venta (Con Turno)

```
1. Cajero → Escanea productos, procesa pago
2. Sistema → Valida sesión activa ✅
3. Sistema → Valida turno activo ✅ (NUEVO)
4. Sistema → Valida que cajero del turno coincida
5. Sistema → Guarda venta con turno_caja_id
6. Sistema → Actualiza totales del turno
```

### 4.4 Flujo: Cierre del Día

```
1. Último Cajero → Cierra su turno
2. Admin/Supervisor → "Cerrar Sesión de Caja"
3. Sistema → Valida que NO haya turnos activos
4. Sistema → Suma todos los turnos del día
5. UI → Muestra arqueo consolidado
6. Admin → Cuenta efectivo total, confirma
7. Sistema → Cierra sesión definitivamente
```

## 🛡️ Fase 5: Validaciones Críticas

### Reglas de Negocio

1. ✅ NO puede haber 2 turnos activos simultáneos en la misma sesión
2. ✅ NO se puede vender sin turno activo
3. ✅ NO se puede cerrar sesión con turnos activos
4. ✅ Efectivo inicial debe coincidir con final del turno anterior
5. ✅ Solo el cajero del turno puede realizar transacciones
6. ✅ Turnos de emergencia requieren autorización
7. ✅ No se puede eliminar un turno con transacciones

## 📈 Fase 6: Reportes y Analíticas

### Nuevos Reportes

1. **Desempeño por Cajero** - Ventas totales, promedio, eficiencia
2. **Comparación de Turnos** - Horarios más productivos
3. **Historial de Relevos** - Transferencias, discrepancias
4. **Trazabilidad Completa** - Cada venta con su turno y cajero

## 🚀 Fase 7: Mejoras Adicionales

### Funcionalidades Extras

1. **Retiros de Seguridad Durante Turno** - Sin cerrar turno
2. **Firmas Digitales** - Confirmación formal de relevos
3. **Alertas Automáticas** - Turno largo, diferencia alta
4. **Dashboard en Tiempo Real** - Vista para supervisores

## 📝 Orden de Implementación

### ✅ Semana 1: Base de Datos y Backend (5 días)

- Día 1: Migración de BD + Índices
- Día 2-3: Funciones core de turnos
- Día 4: Actualizar APIs de sesiones
- Día 5: Actualizar API de turnos + Testing

### ✅ Semana 2: Vinculación y Validaciones (5 días)

- Día 1: Vincular ventas a turnos
- Día 2: Vincular movimientos/retiros/gastos
- Día 3: Implementar validaciones críticas
- Día 4: Schemas Zod + Testing
- Día 5: Integración completa backend

### ✅ Semana 3: UI y Experiencia de Usuario (5 días)

- Día 1: Hook use-turno-activo
- Día 2: Componentes de gestión de turnos
- Día 3: Modales (inicio, cierre, relevo)
- Día 4: Actualizar CashSessionStatus
- Día 5: Actualizar POS + Testing UI

### ✅ Semana 4: Reportes y Deployment (5 días)

- Día 1: Reportes por turno
- Día 2: Analíticas de cajeros
- Día 3: Migración de datos existentes
- Día 4: Testing completo end-to-end
- Día 5: Deploy + Documentación + Capacitación

## ✅ Checklist de Completitud

### Base de Datos

- [ ] Migración ejecutada sin errores
- [ ] Índices creados correctamente
- [ ] Vistas funcionando
- [ ] Constraints validando correctamente

### Backend

- [ ] Funciones de turnos probadas unitariamente
- [ ] APIs actualizadas y funcionando
- [ ] Validaciones impidiendo acciones incorrectas
- [ ] Transacciones vinculadas a turnos

### Frontend

- [ ] Componentes renderizando correctamente
- [ ] Modales con UX intuitiva
- [ ] Hooks actualizando estado en tiempo real
- [ ] Validaciones en UI antes de enviar

### Integración

- [ ] Flujo completo funciona: sesión → turno → venta → relevo → cierre
- [ ] No hay fugas de memoria
- [ ] Performance aceptable (< 500ms respuesta)
- [ ] Errores manejados gracefully

### Datos y Reportes

- [ ] Datos existentes migrados correctamente
- [ ] Reportes generan información precisa
- [ ] Exportación de datos funciona
- [ ] Gráficos y estadísticas correctas

### Documentación y Capacitación

- [ ] README actualizado
- [ ] Documentación de API completa
- [ ] Manual de usuario creado
- [ ] Video de capacitación grabado
- [ ] Usuarios capacitados

## 📚 Referencias

- [Esquema de BD](../prisma/schema.prisma)
- [API de Turnos](../app/api/caja/turnos/route.ts)
- [Componentes UI](../components/pos/)
- [Validaciones](../lib/validations/turno-caja.schema.ts)

---

**Última actualización:** 14 de diciembre de 2025  
**Estado:** 🚧 En desarrollo - Fase 1  
**Responsable:** Equipo de Desarrollo AgroShop
