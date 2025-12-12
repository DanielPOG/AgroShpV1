# 🔧 PLAN DE CORRECCIÓN: SISTEMA DE CAJA COMPLETO

**Fecha:** 10 de diciembre de 2025  
**Estado:** ANÁLISIS Y PLANIFICACIÓN  
**Prioridad:** 🔴 CRÍTICA

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Actual](#arquitectura-actual)
3. [Módulos del Sistema](#módulos-del-sistema)
4. [Flujos de Dinero](#flujos-de-dinero)
5. [Problemas Identificados](#problemas-identificados)
6. [Plan de Implementación](#plan-de-implementación)
7. [Casos de Prueba](#casos-de-prueba)

---

## 🎯 RESUMEN EJECUTIVO

### Problema Principal

El cálculo de **efectivo disponible en caja** no refleja correctamente todas las operaciones que afectan el efectivo real. Esto causa:

- ❌ Validación incorrecta de cambio disponible
- ❌ Reportes y dashboards con datos erróneos
- ❌ Arqueos de caja descuadrados

### Causa Raíz

Falta de **consistencia** en cómo cada módulo actualiza la sesión de caja y registra movimientos de efectivo.

### Solución Propuesta

**Centralizar** el cálculo de efectivo disponible en una función única que considere TODAS las operaciones que afectan el efectivo.

---

## 🏗️ ARQUITECTURA ACTUAL

### Modelo de Datos: `sesiones_caja`

```typescript
model sesiones_caja {
  id                         Int       @id
  codigo_sesion              String    @unique
  caja_id                    Int
  cajero_id                  Int
  fecha_apertura             DateTime
  fondo_inicial              Decimal   // 💰 Dinero inicial en caja

  // 📊 TOTALES ACUMULADOS (se actualizan con cada operación)
  total_ventas_efectivo      Decimal   // Ventas pagadas en efectivo
  total_ventas_nequi         Decimal   // Ventas pagadas por Nequi
  total_ventas_tarjeta       Decimal   // Ventas pagadas con tarjeta
  total_ventas_transferencia Decimal   // Ventas con transferencia
  total_ingresos_adicionales Decimal   // NO USADO actualmente
  total_retiros              Decimal   // NO USADO actualmente
  total_gastos               Decimal   // NO USADO actualmente

  // 🔒 CIERRE DE SESIÓN
  fecha_cierre               DateTime?
  efectivo_esperado          Decimal?  // Se calcula al cerrar
  efectivo_contado           Decimal?  // Se ingresa en arqueo
  diferencia                 Decimal?  // efectivo_contado - efectivo_esperado
  estado                     String    // 'abierta' | 'cerrada'
}
```

---

## 🧩 MÓDULOS DEL SISTEMA

### 1️⃣ **VENTAS** (`ventas`)

**Responsabilidad:** Registrar ventas y sus pagos

**Tablas relacionadas:**

- `ventas` - Encabezado de venta
- `detalle_ventas` - Items vendidos
- `pagos_venta` - Desglose de pagos por método
- `movimientos_caja` - Movimiento de dinero en caja

**Operaciones que afectan efectivo:**

- ✅ Venta con pago en efectivo
- ✅ Venta con pago mixto (efectivo + otros métodos)
- ❌ Devolución de venta (no implementado)

**Cómo actualiza la sesión:**

```typescript
// En createSale() - lib/db/sales.ts línea 297
await tx.sesiones_caja.update({
  where: { id: sessionId },
  data: {
    total_ventas_efectivo: { increment: montoEfectivo },
    total_ventas_nequi: { increment: montoNequi },
    total_ventas_tarjeta: { increment: montoTarjeta },
    total_ventas_transferencia: { increment: montoTransferencia },
  },
});

// Y crea movimiento_caja POR CADA MÉTODO DE PAGO
await tx.movimientos_caja.create({
  data: {
    sesion_caja_id: sessionId,
    venta_id: venta.id,
    tipo_movimiento: "venta",
    metodo_pago: metodoPago.nombre.toLowerCase(),
    monto: pago.monto,
    descripcion: `Venta ${venta.codigo_venta}`,
  },
});
```

**✅ ESTADO ACTUAL:** Funciona correctamente
**🔴 PROBLEMAS:**

- No maneja devoluciones
- No valida efectivo disponible antes de vender (cambio)

---

### 2️⃣ **MOVIMIENTOS EXTRA** (`movimientos_caja` tipo: `ingreso_adicional` | `egreso_operativo`)

**Responsabilidad:** Ingresos y egresos extraordinarios de efectivo

**Tabla:** `movimientos_caja`

**Tipos de movimientos:**

- `ingreso_adicional` - Dinero que ENTRA a caja (ej: sobrante encontrado, devolución proveedor)
- `egreso_operativo` - Dinero que SALE de caja (ej: cambio moneda, pago urgente)

**Métodos de pago permitidos:**

- `efectivo` ← Afecta efectivo en caja
- `nequi`, `tarjeta`, `transferencia` ← No afectan efectivo

**Cómo actualiza la sesión:**

```typescript
// En createMovimientoCaja() - lib/db/movimientos-caja-extra.ts línea 99
// ❌ NO ACTUALIZA sesiones_caja.total_ingresos_adicionales
// ❌ NO ACTUALIZA ningún contador
// ✅ Solo crea el registro en movimientos_caja
```

**❌ ESTADO ACTUAL:** NO actualiza sesión correctamente
**🔴 PROBLEMAS CRÍTICOS:**

1. No actualiza `sesiones_caja.total_ingresos_adicionales`
2. Los ingresos/egresos en efectivo NO se reflejan en `efectivo_esperado`
3. Al calcular efectivo disponible, NO se consideran estos movimientos

---

### 3️⃣ **RETIROS DE CAJA** (`retiros_caja`)

**Responsabilidad:** Retiros planificados de efectivo (arqueos parciales, envío a banco)

**Tabla:** `retiros_caja`

**Flujo:**

1. Cajero solicita retiro → `estado: 'pendiente'`
2. Supervisor autoriza → `estado: 'aprobado'`
3. Se ejecuta retiro → `estado: 'completado'`

**Cómo actualiza la sesión:**

```typescript
// En completarRetiro() - lib/db/retiros-caja.ts línea 231
await tx.sesiones_caja.update({
  where: { id: retiro.sesion_caja_id },
  data: {
    total_retiros: {
      increment: Number(retiro.monto),
    },
  },
});

// ❌ NO crea movimiento en movimientos_caja
```

**⚠️ ESTADO ACTUAL:** Actualiza sesión pero sin movimiento
**🔴 PROBLEMAS:**

1. No crea `movimientos_caja` para trazabilidad
2. `total_retiros` no se usa en cálculo de efectivo disponible

---

### 4️⃣ **GASTOS DE CAJA** (`gastos_caja`)

**Responsabilidad:** Pagos de gastos operativos desde la caja

**Tabla:** `gastos_caja`

**Tipos de gastos:**

- Servicios públicos
- Mantenimiento
- Transporte
- Otros gastos autorizados

**Cómo actualiza la sesión:**

```typescript
// En createGastoCaja() - lib/db/gastos-caja.ts línea 94
await tx.sesiones_caja.update({
  where: { id: data.sesion_caja_id },
  data: {
    total_gastos: {
      increment: Number(data.monto),
    },
  },
});

// ❌ NO crea movimiento en movimientos_caja
```

**⚠️ ESTADO ACTUAL:** Actualiza sesión pero sin movimiento
**🔴 PROBLEMAS:**

1. No crea `movimientos_caja` para trazabilidad
2. No distingue si el gasto se pagó en efectivo u otro método
3. `total_gastos` no se usa en cálculo de efectivo disponible

---

### 5️⃣ **ARQUEOS DE CAJA** (`arqueos_caja`)

**Responsabilidad:** Conteo físico del efectivo en caja

**Tabla:** `arqueos_caja`

**Tipos de arqueo:**

- `apertura` - Al abrir sesión
- `parcial` - Durante la sesión
- `cierre` - Al cerrar sesión

**Cómo funciona:**

```typescript
// Arqueo registra:
- Cantidad de billetes/monedas de cada denominación
- total_contado = suma de todas las denominaciones
- total_esperado = lo que debería haber según sistema
- diferencia = total_contado - total_esperado

// ❌ NO actualiza sesiones_caja automáticamente
// ✅ Se usa al cerrar sesión para actualizar efectivo_contado
```

**✅ ESTADO ACTUAL:** Solo informativo
**⚠️ OBSERVACIONES:**

- Arqueos parciales no afectan operativa de caja
- Solo el arqueo de cierre actualiza `sesiones_caja.efectivo_contado`

---

### 6️⃣ **TURNOS DE CAJA** (`turnos_caja`)

**Responsabilidad:** Control de relevos de cajeros en una misma sesión

**Tabla:** `turnos_caja`

**Flujo:**

1. Cajero A abre sesión → Turno 1 inicia
2. Cajero A se va → Turno 1 finaliza (con arqueo)
3. Cajero B llega → Turno 2 inicia (con monto_inicial = monto_final del Turno 1)

**Cómo funciona:**

```typescript
// Los turnos NO afectan el efectivo de la sesión
// Solo dividen la sesión en períodos para control

// ✅ Cada turno tiene su arqueo de inicio/fin
// ✅ La sesión continúa abierta durante todos los turnos
```

**✅ ESTADO ACTUAL:** Funciona correctamente
**⚠️ OBSERVACIONES:**

- Los turnos son para control interno, no afectan cálculo de efectivo

---

## 💰 FLUJOS DE DINERO

### ENTRA DINERO A CAJA (AUMENTA EFECTIVO)

| Operación                        | Tabla              | Campo actualizado       | Movimiento creado          |
| -------------------------------- | ------------------ | ----------------------- | -------------------------- |
| **Fondo inicial**                | `sesiones_caja`    | `fondo_inicial`         | ❌ No                      |
| **Venta en efectivo**            | `sesiones_caja`    | `total_ventas_efectivo` | ✅ Sí (`movimientos_caja`) |
| **Ingreso adicional (efectivo)** | `movimientos_caja` | ❌ Ninguno              | ✅ Sí (el mismo registro)  |

### SALE DINERO DE CAJA (DISMINUYE EFECTIVO)

| Operación                       | Tabla              | Campo actualizado | Movimiento creado         |
| ------------------------------- | ------------------ | ----------------- | ------------------------- |
| **Dar cambio en venta**         | -                  | ❌ No se registra | ❌ No                     |
| **Egreso operativo (efectivo)** | `movimientos_caja` | ❌ Ninguno        | ✅ Sí (el mismo registro) |
| **Retiro de caja**              | `sesiones_caja`    | `total_retiros`   | ❌ No                     |
| **Gasto pagado en efectivo**    | `sesiones_caja`    | `total_gastos`    | ❌ No                     |

---

## 🐛 PROBLEMAS IDENTIFICADOS

### ❌ CRÍTICO 1: Cálculo Incorrecto de Efectivo Disponible

**Ubicación:** `lib/db/sales.ts` línea 13-59 - función `validarCambioDisponible()`

**Problema actual:**

```typescript
// INCORRECTO (versión actual corregida pero aún incompleta)
const efectivoDisponible =
  Number(session.fondo_inicial) + Number(session.total_ventas_efectivo || 0);

// ❌ No considera:
// - Ingresos adicionales en efectivo
// - Egresos operativos en efectivo
// - Retiros de caja
// - Gastos pagados en efectivo
```

**Fórmula CORRECTA:**

```typescript
efectivoDisponible =
  fondo_inicial +
  total_ventas_efectivo +
  ingresos_adicionales_efectivo - // ← falta calcular
  egresos_operativos_efectivo - // ← falta calcular
  total_retiros - // ← falta incluir
  total_gastos_efectivo; // ← falta calcular
```

**Impacto:**

- 🔴 Bloquea ventas cuando SÍ hay cambio disponible
- 🔴 Permite ventas cuando NO hay cambio disponible
- 🔴 Dashboards muestran datos incorrectos

---

### ❌ CRÍTICO 2: Movimientos Extra NO Actualizan Sesión

**Ubicación:** `lib/db/movimientos-caja-extra.ts` línea 99-198

**Problema:**

```typescript
// createMovimientoCaja() solo hace:
await tx.movimientos_caja.create({ ... })

// ❌ FALTA:
await tx.sesiones_caja.update({
  where: { id: data.sesion_caja_id },
  data: {
    total_ingresos_adicionales: {
      increment: tipo === 'ingreso_adicional' ? monto : 0
    }
  }
})
```

**Impacto:**

- 🔴 Ingresos extra no aumentan efectivo disponible
- 🔴 Egresos extra no disminuyen efectivo disponible
- 🔴 Reportes incompletos

---

### ❌ CRÍTICO 3: Retiros y Gastos SIN Movimientos de Caja

**Ubicación:**

- `lib/db/retiros-caja.ts` línea 231
- `lib/db/gastos-caja.ts` línea 94

**Problema:**
Los retiros y gastos actualizan `sesiones_caja` pero NO crean `movimientos_caja`, causando:

- ❌ Falta trazabilidad completa
- ❌ Historial de movimientos incompleto
- ❌ Difícil auditoría

**Solución:**
Crear `movimientos_caja` automáticamente al registrar retiros/gastos.

---

### ⚠️ MEDIO 4: Gastos Sin Distinción de Método de Pago

**Ubicación:** `gastos_caja` table

**Problema:**
La tabla no tiene campo `metodo_pago`, por lo que NO se sabe si el gasto se pagó en:

- Efectivo ← disminuye efectivo en caja
- Transferencia ← NO afecta efectivo en caja
- Tarjeta corporativa ← NO afecta efectivo en caja

**Impacto:**

- ⚠️ Se asume que todos los gastos salen de efectivo
- ⚠️ Cálculo de efectivo disponible puede ser incorrecto

---

### ⚠️ MEDIO 5: Cambio Entregado NO se Registra

**Problema:**
Cuando se da cambio en una venta:

- Cliente paga $2,000
- Venta es de $1,190
- Cambio: $810

**Lo que se registra:**

```typescript
movimientos_caja: {
  tipo_movimiento: 'venta',
  metodo_pago: 'efectivo',
  monto: 1190  // ← Solo el monto de la venta
}
```

**Lo que NO se registra:**

- ❌ Que el cliente pagó $2,000
- ❌ Que se dio $810 de cambio

**Impacto:**

- ⚠️ No se puede auditar billetes recibidos vs entregados
- ⚠️ Dificulta encontrar errores en cambio

---

## 📝 PLAN DE IMPLEMENTACIÓN

### 🎯 FASE 1: CORRECCIÓN CRÍTICA (1-2 días)

#### ✅ TAREA 1.1: Crear Función Centralizada de Efectivo Disponible

**Archivo:** `lib/db/cash-sessions.ts`

```typescript
/**
 * Calcula el efectivo REAL disponible en caja
 * Considera TODAS las operaciones que afectan efectivo
 */
export async function getEfectivoDisponible(
  sessionId: number
): Promise<number> {
  const session = await prisma.sesiones_caja.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new Error("Sesión no encontrada");

  // Movimientos de efectivo (ingresos y egresos extra)
  const movimientos = await prisma.movimientos_caja.findMany({
    where: {
      sesion_caja_id: sessionId,
      metodo_pago: "efectivo",
      tipo_movimiento: {
        in: ["ingreso_adicional", "egreso_operativo"],
      },
    },
  });

  const ingresosEfectivo = movimientos
    .filter((m) => m.tipo_movimiento === "ingreso_adicional")
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const egresosEfectivo = movimientos
    .filter((m) => m.tipo_movimiento === "egreso_operativo")
    .reduce((sum, m) => sum + Number(m.monto), 0);

  // Retiros aprobados
  const retiros = await prisma.retiros_caja.findMany({
    where: {
      sesion_caja_id: sessionId,
      estado: "aprobado",
    },
  });

  const totalRetiros = retiros.reduce((sum, r) => sum + Number(r.monto), 0);

  // Gastos pagados en efectivo
  // TODO: Agregar campo metodo_pago a gastos_caja
  // Por ahora asumimos que todos son en efectivo
  const gastos = await prisma.gastos_caja.findMany({
    where: { sesion_caja_id: sessionId },
  });

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  // FÓRMULA COMPLETA
  const efectivoDisponible =
    Number(session.fondo_inicial) +
    Number(session.total_ventas_efectivo || 0) +
    ingresosEfectivo -
    egresosEfectivo -
    totalRetiros -
    totalGastos;

  return efectivoDisponible;
}
```

**Tests:**

```typescript
// Test 1: Solo fondo inicial
expect(await getEfectivoDisponible(sesionId)).toBe(100000);

// Test 2: Con venta en efectivo
// fondo: 100000, venta: 1190
expect(await getEfectivoDisponible(sesionId)).toBe(101190);

// Test 3: Con ingreso extra
// fondo: 100000, venta: 1190, ingreso: 8000
expect(await getEfectivoDisponible(sesionId)).toBe(109190);

// Test 4: Con egreso
// fondo: 100000, venta: 1190, ingreso: 8000, egreso: 115000
expect(await getEfectivoDisponible(sesionId)).toBe(-5810); // Negativo!

// Test 5: Con retiro
// anterior: -5810, retiro: 4001
expect(await getEfectivoDisponible(sesionId)).toBe(-9811);
```

---

#### ✅ TAREA 1.2: Actualizar `validarCambioDisponible()`

**Archivo:** `lib/db/sales.ts` línea 13

```typescript
export async function validarCambioDisponible(
  sessionId: number,
  montoVenta: number,
  montoPagado: number
) {
  const cambioRequerido = montoPagado - montoVenta;

  if (cambioRequerido <= 0) {
    return {
      tieneEfectivo: true,
      efectivoDisponible: 0,
      cambioRequerido: 0,
      mensaje: "No requiere cambio",
    };
  }

  // ✅ USAR NUEVA FUNCIÓN
  const efectivoDisponible = await getEfectivoDisponible(sessionId);

  const tieneEfectivo = efectivoDisponible >= cambioRequerido;

  return {
    tieneEfectivo,
    efectivoDisponible,
    cambioRequerido,
    mensaje: tieneEfectivo
      ? "Efectivo suficiente para dar cambio"
      : `Efectivo insuficiente. Disponible: $${efectivoDisponible.toLocaleString(
          "es-CO"
        )}, Necesario: $${cambioRequerido.toLocaleString("es-CO")}`,
  };
}
```

---

#### ✅ TAREA 1.3: Actualizar `getCashSessionSummary()`

**Archivo:** `lib/db/cash-sessions.ts` línea 210

```typescript
export async function getCashSessionSummary(sessionId: number) {
  const [session, movimientos, retiros, gastos] = await Promise.all([
    prisma.sesiones_caja.findUnique({
      /* ... */
    }),
    prisma.movimientos_caja.findMany({
      /* ... */
    }),
    prisma.retiros_caja.findMany({
      /* ... */
    }),
    prisma.gastos_caja.findMany({
      /* ... */
    }),
  ]);

  // ... cálculos existentes ...

  // ✅ USAR NUEVA FUNCIÓN
  const efectivoEsperado = await getEfectivoDisponible(sessionId);

  return {
    session,
    ventas: {
      /* ... */
    },
    movimientos: {
      /* ... */
    },
    retiros: {
      /* ... */
    },
    gastos: {
      /* ... */
    },
    efectivoEsperado, // ✅ Ahora es correcto
  };
}
```

---

### 🎯 FASE 2: CONSISTENCIA DE DATOS (2-3 días)

#### ✅ TAREA 2.1: Actualizar Sesión en Movimientos Extra

**Archivo:** `lib/db/movimientos-caja-extra.ts` línea 99

```typescript
export async function createMovimientoCaja(data: MovimientoCajaCreate) {
  return await prisma.$transaction(async (tx) => {
    // 1. Crear movimiento
    const movimiento = await tx.movimientos_caja.create({
      /* ... */
    });

    // 2. ✅ ACTUALIZAR SESIÓN
    if (data.metodo_pago === "efectivo") {
      await tx.sesiones_caja.update({
        where: { id: data.sesion_caja_id },
        data: {
          total_ingresos_adicionales: {
            increment:
              data.tipo_movimiento === "ingreso_adicional"
                ? Number(data.monto)
                : 0,
          },
        },
      });
    }

    return movimiento;
  });
}
```

---

#### ✅ TAREA 2.2: Crear Movimiento al Completar Retiro

**Archivo:** `lib/db/retiros-caja.ts` línea 231

```typescript
export async function completarRetiro(/* ... */) {
  return await prisma.$transaction(async (tx) => {
    // 1. Actualizar retiro
    const retiro = await tx.retiros_caja.update({
      /* ... */
    });

    // 2. Actualizar sesión
    await tx.sesiones_caja.update({
      /* ... */
    });

    // 3. ✅ CREAR MOVIMIENTO
    await tx.movimientos_caja.create({
      data: {
        sesion_caja_id: retiro.sesion_caja_id,
        tipo_movimiento: "retiro_caja",
        metodo_pago: "efectivo",
        monto: retiro.monto,
        descripcion: `Retiro: ${retiro.motivo}`,
        usuario_id: userId,
      },
    });

    return retiro;
  });
}
```

---

#### ✅ TAREA 2.3: Crear Movimiento al Registrar Gasto

**Archivo:** `lib/db/gastos-caja.ts` línea 94

```typescript
export async function createGastoCaja(
  data: GastoCajaCreate & { metodo_pago?: string }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Crear gasto
    const gasto = await tx.gastos_caja.create({
      /* ... */
    });

    // 2. Actualizar sesión
    await tx.sesiones_caja.update({
      /* ... */
    });

    // 3. ✅ CREAR MOVIMIENTO
    await tx.movimientos_caja.create({
      data: {
        sesion_caja_id: data.sesion_caja_id,
        tipo_movimiento: "gasto_operativo",
        metodo_pago: data.metodo_pago || "efectivo",
        monto: data.monto,
        descripcion: `Gasto: ${data.categoria_gasto} - ${data.descripcion}`,
        usuario_id: data.autorizado_por,
      },
    });

    return gasto;
  });
}
```

---

### 🎯 FASE 3: MEJORAS DE ESQUEMA (3-4 días)

#### ✅ TAREA 3.1: Agregar Campo `metodo_pago` a `gastos_caja`

**Migración:**

```sql
-- 1. Agregar columna
ALTER TABLE gastos_caja
ADD COLUMN metodo_pago VARCHAR(20) DEFAULT 'efectivo';

-- 2. Actualizar gastos existentes (asumimos efectivo)
UPDATE gastos_caja
SET metodo_pago = 'efectivo'
WHERE metodo_pago IS NULL;

-- 3. Hacer columna NOT NULL
ALTER TABLE gastos_caja
ALTER COLUMN metodo_pago SET NOT NULL;
```

**Schema Prisma:**

```prisma
model gastos_caja {
  // ... campos existentes ...
  metodo_pago     String        @db.VarChar(20)  // ✅ NUEVO
  // ... resto ...
}
```

---

#### ✅ TAREA 3.2: Agregar Campos para Registro de Cambio

**Migración:**

```sql
-- Agregar a movimientos_caja
ALTER TABLE movimientos_caja
ADD COLUMN monto_recibido DECIMAL(10, 2) NULL,
ADD COLUMN monto_cambio DECIMAL(10, 2) NULL;

-- Comentario
COMMENT ON COLUMN movimientos_caja.monto_recibido IS
  'Monto que pagó el cliente (solo para ventas en efectivo)';
COMMENT ON COLUMN movimientos_caja.monto_cambio IS
  'Cambio entregado al cliente (solo para ventas en efectivo)';
```

**Schema Prisma:**

```prisma
model movimientos_caja {
  // ... campos existentes ...
  monto_recibido  Decimal?  @db.Decimal(10, 2)  // ✅ NUEVO
  monto_cambio    Decimal?  @db.Decimal(10, 2)  // ✅ NUEVO
  // ... resto ...
}
```

**Actualizar creación de movimiento en ventas:**

```typescript
// En createSale() cuando método es efectivo
await tx.movimientos_caja.create({
  data: {
    sesion_caja_id: sessionId,
    venta_id: venta.id,
    tipo_movimiento: "venta",
    metodo_pago: "efectivo",
    monto: montoVenta,
    monto_recibido: montoPagado, // ✅ NUEVO
    monto_cambio: montoPagado - montoVenta, // ✅ NUEVO
    descripcion: `Venta ${venta.codigo_venta}`,
  },
});
```

---

### 🎯 FASE 4: VALIDACIONES Y CONTROLES (2-3 días)

#### ✅ TAREA 4.1: Validar Efectivo Antes de Operaciones

**Nuevas funciones:**

```typescript
// lib/db/cash-sessions.ts

/**
 * Valida si hay suficiente efectivo para una operación
 */
export async function validarEfectivoSuficiente(
  sessionId: number,
  montoRequerido: number
): Promise<{ valido: boolean; efectivoDisponible: number; mensaje: string }> {
  const efectivoDisponible = await getEfectivoDisponible(sessionId);

  if (efectivoDisponible < montoRequerido) {
    return {
      valido: false,
      efectivoDisponible,
      mensaje: `Efectivo insuficiente. Disponible: $${efectivoDisponible.toLocaleString(
        "es-CO"
      )}, Requerido: $${montoRequerido.toLocaleString("es-CO")}`,
    };
  }

  return {
    valido: true,
    efectivoDisponible,
    mensaje: "Efectivo suficiente",
  };
}
```

**Usar en:**

- ✅ Ventas con cambio (ya implementado)
- ✅ Egresos operativos
- ✅ Retiros de caja
- ✅ Gastos en efectivo

---

#### ✅ TAREA 4.2: Prevenir Efectivo Negativo

**Constraint en BD:**

```sql
-- Agregar constraint para evitar operaciones que dejen efectivo negativo
-- Nota: Esto es complejo de implementar como constraint
-- Mejor manejarlo en lógica de aplicación
```

**Función de validación:**

```typescript
export async function validarOperacionSeguira(
  sessionId: number,
  montoOperacion: number,
  tipoOperacion: "egreso" | "retiro" | "gasto"
) {
  const efectivoActual = await getEfectivoDisponible(sessionId);
  const efectivoDespues = efectivoActual - montoOperacion;

  if (efectivoDespues < 0) {
    throw new Error(
      `Operación rechazada: dejaría efectivo en negativo ($${efectivoDespues.toLocaleString(
        "es-CO"
      )})`
    );
  }

  // Advertencia si queda poco efectivo
  if (efectivoDespues < 50000) {
    console.warn(
      `⚠️ Efectivo quedará bajo: $${efectivoDespues.toLocaleString("es-CO")}`
    );
  }
}
```

---

### 🎯 FASE 5: REPORTES Y DASHBOARDS (3-4 días)

#### ✅ TAREA 5.1: Dashboard de Efectivo en Tiempo Real

**Componente:** `components/dashboard/efectivo-panel.tsx`

**Datos a mostrar:**

```typescript
interface EfectivoPanel {
  // Composición del efectivo
  fondoInicial: number;
  ventasEfectivo: number;
  ingresosExtra: number;
  egresosExtra: number;
  retiros: number;
  gastos: number;

  // Totales
  efectivoDisponible: number;
  efectivoEnTransito: number; // retiros pendientes de completar

  // Alertas
  bajoEfectivo: boolean; // < 50,000
  efectivoNegativo: boolean;

  // Historial (últimos 10 movimientos)
  movimientosRecientes: MovimientoCaja[];
}
```

---

#### ✅ TAREA 5.2: Reporte de Movimientos Detallado

**Endpoint:** `GET /api/reportes/movimientos-caja`

**Parámetros:**

- `sesion_id`
- `fecha_desde`
- `fecha_hasta`
- `tipo_movimiento[]`
- `metodo_pago[]`

**Respuesta:**

```typescript
{
  movimientos: [
    {
      id: 1,
      fecha: '2025-12-10T14:53:00Z',
      tipo: 'venta',
      metodoPago: 'efectivo',
      monto: 1190,
      montoRecibido: 2000,     // ✅ NUEVO
      montoCambio: 810,        // ✅ NUEVO
      descripcion: 'Venta VTA-...',
      usuario: 'Juan Pérez'
    },
    {
      id: 2,
      fecha: '2025-12-10T15:20:00Z',
      tipo: 'egreso_operativo',
      metodoPago: 'efectivo',
      monto: 115000,
      descripcion: 'urgencia',
      usuario: 'Juan Pérez'
    }
    // ...
  ],
  totales: {
    ingresos: 9190,
    egresos: 119001,
    neto: -109811
  }
}
```

---

#### ✅ TAREA 5.3: Auditoría de Diferencias

**Función:** `auditarDiferenciasCaja(sesionId: number)`

**Validaciones:**

1. ✅ Sumar todos los movimientos y comparar con `efectivo_esperado`
2. ✅ Verificar que cada venta tenga su movimiento
3. ✅ Verificar que cada retiro tenga su movimiento
4. ✅ Verificar que cada gasto tenga su movimiento
5. ✅ Detectar movimientos huérfanos (sin referencia)

---

## 🧪 CASOS DE PRUEBA

### TEST 1: Venta Simple en Efectivo

```typescript
describe("Venta en efectivo", () => {
  it("actualiza efectivo disponible correctamente", async () => {
    // Abrir sesión con fondo de $100,000
    const sesion = await openCashSession(userId, { fondoInicial: 100000 });

    // Efectivo inicial
    expect(await getEfectivoDisponible(sesion.id)).toBe(100000);

    // Venta de $1,190 pagando con $2,000
    await createSale(
      {
        items: [{ producto_id: 1, cantidad: 1, precio_unitario: 1000 }],
        pagos: [{ metodo_pago_id: 1, monto: 1190 }],
      },
      sesion.id
    );

    // Efectivo después: 100,000 + 1,190 = 101,190
    expect(await getEfectivoDisponible(sesion.id)).toBe(101190);

    // Validar que puede dar cambio de $810
    const validacion = await validarCambioDisponible(sesion.id, 1190, 2000);
    expect(validacion.tieneEfectivo).toBe(true);
  });
});
```

### TEST 2: Venta con Pago Mixto

```typescript
it("maneja pago mixto correctamente", async () => {
  const sesion = await openCashSession(userId, { fondoInicial: 100000 });

  // Venta de $10,000: $6,000 efectivo + $4,000 Nequi
  await createSale(
    {
      items: [{ producto_id: 1, cantidad: 10, precio_unitario: 1000 }],
      pagos: [
        { metodo_pago_id: 1, monto: 6000 }, // Efectivo
        { metodo_pago_id: 2, monto: 4000 }, // Nequi
      ],
    },
    sesion.id
  );

  // Efectivo después: 100,000 + 6,000 = 106,000
  expect(await getEfectivoDisponible(sesion.id)).toBe(106000);

  // Nequi NO afecta efectivo disponible
  const summary = await getCashSessionSummary(sesion.id);
  expect(summary.ventas.nequi).toBe(4000);
});
```

### TEST 3: Ingreso y Egreso Extra

```typescript
it("considera movimientos extra", async () => {
  const sesion = await openCashSession(userId, { fondoInicial: 100000 });

  // Ingreso de $8,000
  await createMovimientoCaja({
    sesion_caja_id: sesion.id,
    tipo_movimiento: "ingreso_adicional",
    metodo_pago: "efectivo",
    monto: 8000,
    descripcion: "Sobrante encontrado",
  });

  // Efectivo: 100,000 + 8,000 = 108,000
  expect(await getEfectivoDisponible(sesion.id)).toBe(108000);

  // Egreso de $115,000 (más de lo disponible)
  await expect(
    createMovimientoCaja({
      sesion_caja_id: sesion.id,
      tipo_movimiento: "egreso_operativo",
      metodo_pago: "efectivo",
      monto: 115000,
      descripcion: "urgencia",
    })
  ).rejects.toThrow("Efectivo insuficiente");
});
```

### TEST 4: Retiro de Caja

```typescript
it("retiro disminuye efectivo disponible", async () => {
  const sesion = await openCashSession(userId, { fondoInicial: 100000 });

  // Crear retiro
  const retiro = await createRetiroCaja({
    sesion_caja_id: sesion.id,
    monto: 50000,
    motivo: "Envío a banco",
  });

  // Autorizar
  await autorizarRetiro(retiro.id, supervisorId, true);

  // Completar
  await completarRetiro(retiro.id, cajeroId);

  // Efectivo: 100,000 - 50,000 = 50,000
  expect(await getEfectivoDisponible(sesion.id)).toBe(50000);

  // Verificar que se creó movimiento
  const movimientos = await prisma.movimientos_caja.findMany({
    where: { sesion_caja_id: sesion.id },
  });
  expect(movimientos).toHaveLength(1);
  expect(movimientos[0].tipo_movimiento).toBe("retiro_caja");
});
```

### TEST 5: Gasto en Efectivo

```typescript
it("gasto en efectivo disminuye disponible", async () => {
  const sesion = await openCashSession(userId, { fondoInicial: 100000 });

  // Gasto de $20,000
  await createGastoCaja({
    sesion_caja_id: sesion.id,
    monto: 20000,
    categoria_gasto: "Transporte",
    descripcion: "Taxi",
    metodo_pago: "efectivo",
  });

  // Efectivo: 100,000 - 20,000 = 80,000
  expect(await getEfectivoDisponible(sesion.id)).toBe(80000);
});
```

### TEST 6: Arqueo de Cierre

```typescript
it("arqueo de cierre calcula diferencia correctamente", async () => {
  const sesion = await openCashSession(userId, { fondoInicial: 100000 });

  // Varias operaciones
  await createSale(
    {
      /* ... */
    },
    sesion.id
  ); // +10,000
  await createMovimientoCaja({
    /* ingreso */
  }); // +5,000
  await createGastoCaja({
    /* gasto */
  }); // -3,000

  // Efectivo esperado: 100,000 + 10,000 + 5,000 - 3,000 = 112,000
  const esperado = await getEfectivoDisponible(sesion.id);
  expect(esperado).toBe(112000);

  // Arqueo cuenta $112,500 (sobrante de $500)
  await closeCashSession(sesion.id, userId, {
    efectivoContado: 112500,
    // ... desglose ...
  });

  const sesionCerrada = await prisma.sesiones_caja.findUnique({
    where: { id: sesion.id },
  });

  expect(sesionCerrada.efectivo_esperado).toBe(112000);
  expect(sesionCerrada.efectivo_contado).toBe(112500);
  expect(sesionCerrada.diferencia).toBe(500);
  expect(sesionCerrada.cuadrada).toBe(false); // No cuadró exacto
});
```

---

## 📊 MÉTRICAS DE ÉXITO

### Indicadores Clave

- ✅ **Efectivo disponible = Efectivo real** (error < 0.1%)
- ✅ **100% de operaciones registran movimiento**
- ✅ **0 sesiones con diferencia > $1,000**
- ✅ **Tiempo de arqueo < 5 minutos**

### Reportes a Implementar

1. ✅ Dashboard de efectivo en tiempo real
2. ✅ Reporte de movimientos detallado
3. ✅ Auditoría de diferencias
4. ✅ Historial de arqueos
5. ✅ Análisis de cambio entregado

---

## 🚀 CRONOGRAMA

| Fase                          | Duración       | Dependencias |
| ----------------------------- | -------------- | ------------ |
| Fase 1: Corrección Crítica    | 1-2 días       | -            |
| Fase 2: Consistencia de Datos | 2-3 días       | Fase 1       |
| Fase 3: Mejoras de Esquema    | 3-4 días       | Fase 2       |
| Fase 4: Validaciones          | 2-3 días       | Fase 3       |
| Fase 5: Reportes              | 3-4 días       | Fase 4       |
| **TOTAL**                     | **11-16 días** |              |

---

## 📌 NOTAS IMPORTANTES

### ⚠️ Riesgos

1. **Migración de datos:** Sesiones abiertas durante actualización
2. **Performance:** Cálculo en tiempo real puede ser lento
3. **Concurrencia:** Múltiples usuarios modificando misma sesión

### ✅ Mitigaciones

1. Realizar actualizaciones en horarios de baja actividad
2. Cachear cálculo de efectivo disponible (invalidar al cambiar)
3. Usar transacciones y locks optimistas

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **Revisar y aprobar este documento**
2. ✅ **Crear issues en GitHub por cada tarea**
3. ✅ **Implementar Fase 1 (CRÍTICA)**
4. ✅ **Probar en ambiente de desarrollo**
5. ✅ **Deploy a producción con respaldo**

---

**Última actualización:** 10 de diciembre de 2025  
**Autor:** GitHub Copilot + Equipo de Desarrollo  
**Estado:** 🟡 PENDIENTE DE APROBACIÓN
