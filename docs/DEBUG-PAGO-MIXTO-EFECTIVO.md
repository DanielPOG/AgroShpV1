# 🔍 DIAGNÓSTICO: Bug de Efectivo en Pago Mixto

## 📊 Datos del Caso

**Venta:** VTA-1765391208151-394  
**Problema:** Pago mixto con $5,000 en efectivo NO suma al efectivo en caja

### Síntomas

```
Efectivo mostrado en UI: $4,280
Pago realizado en efectivo: $5,000
Efectivo esperado: $4,280 + $5,000 = $9,280
Efectivo actual: $4,280 ❌ (no cambió)
Diferencia: -$5,000 (NO se sumó)
```

---

## 🧪 Análisis del Flujo

### 1. Frontend: Checkout Modal ✅ CORRECTO

**Archivo:** `components/pos/checkout-modal.tsx`

Cuando usuario selecciona "Pago Mixto":

- Muestra 3 campos (Efectivo, Nequi, Tarjeta)
- Usuario ingresa: Efectivo=$5,000, Nequi=$X
- Se construye array:
  ```typescript
  mixtoPayments = [
    { metodo_pago_id: 1, monto: 5000 },
    { metodo_pago_id: 2, monto: X },
  ];
  ```
- Se envía a API con `pagos: mixtoPayments`

**Estado:** ✅ Frontend funciona correctamente

---

### 2. API Endpoint: POST /api/ventas ✅ CORRECTO

**Archivo:** `app/api/ventas/route.ts` (líneas 170-195)

```typescript
// Crea venta con createSale()
const venta = await createSale({...}, cashSession.id)

// Loop que registra cada pago en movimientos
for (const pago of venta.pagos_venta) {
    await registerSaleInCashMovements({
        sessionId: cashSession.id,
        total: Number(pago.monto),  // ✅ Monto individual correcto
        metodoPagoNombre: pago.metodo_pago?.nombre || 'Desconocido',
    })
}
```

**Estado:** ✅ Loop está bien implementado, itera sobre CADA pago

---

### 3. Función createSale() ✅ CORRECTO

**Archivo:** `lib/db/sales.ts` (líneas 507-520)

```typescript
// Registra pagos en BD
for (const pago of data.pagos) {
  await tx.pagos_venta.create({
    data: {
      venta_id: venta.id,
      metodo_pago_id: pago.metodo_pago_id,
      monto: pago.monto,
    },
  });
}

// Retorna venta con relaciones
return tx.ventas.findUnique({
  include: {
    pagos_venta: {
      include: {
        metodo_pago: {
          select: { id: true, nombre: true, icono: true },
        },
      },
    },
  },
});
```

**Estado:** ✅ Crea múltiples registros en `pagos_venta`, incluye relación `metodo_pago`

---

### 4. Función registerSaleInCashMovements() ✅ CORRECTO

**Archivo:** `lib/db/cash-integration.ts` (líneas 29-85)

```typescript
// 1. Crea movimiento en tabla movimientos_caja
const movement = await createCashMovement({...})

// 2. Detecta tipo de método
const metodoPagoLower = data.metodoPagoNombre.toLowerCase()

if (metodoPagoLower.includes('efectivo')) {
    campoActualizar = 'total_ventas_efectivo'
}

// 3. Actualiza campo en sesiones_caja
if (campoActualizar) {
    await prisma.sesiones_caja.update({
        where: { id: data.sessionId },
        data: {
            [campoActualizar]: { increment: data.total }
        }
    })
}
```

**Estado:** ✅ Lógica correcta para detectar "efectivo" y sumar

---

### 5. Función getCashSessionSummary() ✅ CORRECTO

**Archivo:** `lib/db/cash-sessions.ts` (líneas 262-268)

```typescript
const ventasEfectivo = Number(session.total_ventas_efectivo || 0);

const efectivoEsperado =
  Number(session.fondo_inicial) +
  ventasEfectivo +
  totalIngresosEfectivo -
  totalRetiros -
  totalGastos -
  totalEgresosEfectivo;
```

**Estado:** ✅ Usa campo `total_ventas_efectivo` correctamente

---

## 🎯 Hipótesis del Problema

### Hipótesis A: Loop no se ejecuta

**Probabilidad:** ❌ BAJA  
**Razón:** El código del loop está correcto y debería ejecutarse

### Hipótesis B: metodoPagoNombre es "Desconocido"

**Probabilidad:** ⚠️ **ALTA** ⚠️  
**Razón:** Si `pago.metodo_pago` es `null` o `undefined` en tiempo de ejecución:

- `metodoPagoNombre = "Desconocido"`
- `.toLowerCase().includes('efectivo')` → `false`
- NO actualiza `total_ventas_efectivo`

### Hipótesis C: Error silencioso en try-catch

**Probabilidad:** ⚠️ **ALTA** ⚠️  
**Razón:** El try-catch en `route.ts` (línea 177) captura errores sin detener la venta

### Hipótesis D: Problema de transacción

**Probabilidad:** ❌ BAJA  
**Razón:** `registerSaleInCashMovements()` NO está dentro de la transacción de `createSale()`

---

## 🛠️ Soluciones Implementadas

### 1. Logging Detallado ✅

**Archivo modificado:** `app/api/ventas/route.ts`

Agregados logs para ver:

- Cuántos pagos se procesan
- Para cada pago: ID método, nombre método, monto
- Si `metodo_pago` está definido

**Archivo modificado:** `lib/db/cash-integration.ts`

Agregados logs para ver:

- Método de pago recibido (original y lowercase)
- Si se detecta correctamente ("efectivo", "nequi", etc.)
- Si se actualiza el campo en sesión
- Si hay errores

### 2. Endpoint de Debug ✅

**Archivo creado:** `app/api/debug/pago-mixto/route.ts`

Uso:

```
GET /api/debug/pago-mixto?codigo=394
```

Retorna:

- Datos de la venta
- Pagos registrados en `pagos_venta`
- Sesión de caja actual
- Movimientos de caja relacionados
- Diagnóstico automático

---

## 📋 Plan de Pruebas

### Paso 1: Hacer venta de prueba con pago mixto

1. Abrir POS
2. Seleccionar productos
3. Click en "Pago Mixto"
4. Ingresar:
   - Efectivo: $10,000
   - Nequi: resto
5. Completar venta

### Paso 2: Revisar logs del servidor

Buscar en consola:

```
🔍 DEBUG: Procesando X pagos para integración con caja
📌 DEBUG Pago: { metodo_pago_id: 1, metodo_pago_nombre: "Efectivo", ... }
💰 Registrando venta en movimientos de caja...
🔍 DEBUG: Analizando método de pago "Efectivo"
   ✓ Detectado como EFECTIVO
🔄 Actualizando campo "total_ventas_efectivo" con incremento de +$10000
✅ Campo total_ventas_efectivo actualizado exitosamente
```

### Paso 3: Verificar con endpoint de debug

```
GET /api/debug/pago-mixto?codigo=[CODIGO_VENTA]
```

Verificar:

- `cantidadPagos === cantidadMovimientos`
- `efectivoPagado === efectivoEnSesion` (incremento)

---

## 🚨 Escenarios de Falla Identificados

### Falla #1: metodo_pago es null

**Síntoma:** `metodoPagoNombre = "Desconocido"`  
**Solución:** Verificar que `createSale()` incluye relación  
**Estado:** ✅ VERIFICADO - El include está correcto

### Falla #2: Error en createCashMovement()

**Síntoma:** `registerSaleInCashMovements()` lanza error  
**Solución:** Revisar logs del try-catch  
**Estado:** ⏳ PENDIENTE - Necesita prueba real

### Falla #3: Sesión de caja no encontrada

**Síntoma:** `UPDATE sesiones_caja` falla  
**Solución:** Verificar que `cashSession.id` es correcto  
**Estado:** ✅ VERIFICADO - Se valida antes de crear venta

---

## 📝 Datos para Verificación

### Tabla: metodos_pago

```sql
ID | Nombre
---|--------------
1  | Efectivo
2  | Nequi
3  | Tarjeta
4  | Transferencia
```

### Venta Problemática: VTA-1765391208151-394

```
Total venta: $X
Pagos:
  - Efectivo: $5,000 (método_id: 1)
  - Nequi: $X (método_id: 2)

Esperado en sesiones_caja:
  total_ventas_efectivo: +$5,000
  total_ventas_nequi: +$X

Actual: efectivo NO cambió
```

---

## 🔄 Próximos Pasos

1. ✅ **COMPLETADO:** Agregar logging detallado
2. ✅ **COMPLETADO:** Crear endpoint de debug
3. ⏳ **PENDIENTE:** Hacer venta de prueba con logs activados
4. ⏳ **PENDIENTE:** Revisar logs del servidor
5. ⏳ **PENDIENTE:** Usar endpoint de debug para verificar datos
6. ⏳ **PENDIENTE:** Identificar causa exacta del problema
7. ⏳ **PENDIENTE:** Implementar corrección definitiva

---

## 🎯 Resultado Esperado

Después de la corrección:

```
Efectivo inicial: $4,280
Venta con pago mixto:
  - Efectivo: $5,000
  - Nequi: $7,900

Efectivo después: $4,280 + $5,000 = $9,280 ✅
```

---

## 📚 Archivos Relacionados

- `app/api/ventas/route.ts` - Endpoint de ventas
- `lib/db/sales.ts` - Función createSale()
- `lib/db/cash-integration.ts` - Integración con caja
- `lib/db/cash-sessions.ts` - Resumen de sesión
- `components/pos/checkout-modal.tsx` - UI de pago mixto
- `app/api/debug/pago-mixto/route.ts` - Endpoint de debug

---

## ⚡ Comandos Útiles

### Ver logs del servidor en desarrollo

```powershell
npm run dev
# Buscar logs que empiecen con 🔍 DEBUG:, 💰, 📌
```

### Verificar venta específica

```
GET http://localhost:3000/api/debug/pago-mixto?codigo=394
```

### Ver sesión de caja actual

```sql
SELECT
    id,
    fondo_inicial,
    total_ventas_efectivo,
    total_ventas_nequi,
    total_ventas_tarjeta
FROM sesiones_caja
WHERE estado = 'abierta'
ORDER BY fecha_apertura DESC
LIMIT 1;
```

### Ver movimientos recientes

```sql
SELECT
    tipo_movimiento,
    descripcion,
    monto,
    metodo_pago,
    fecha_hora
FROM movimientos_caja
WHERE sesion_caja_id = [ID_SESION]
ORDER BY fecha_hora DESC
LIMIT 10;
```
