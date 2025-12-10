# 🚨 PROBLEMA CRÍTICO: DOBLE DESCUENTO DE STOCK

## ❌ Problema Identificado

Cuando se realiza una venta (incluyendo pago mixto), el stock se descuenta **DOS VECES**:

**Ejemplo:**

```
Producto: Helado Loco
Stock inicial: 8 unidades
Venta: 4 unidades

Esperado: Stock final = 4 unidades
Real: Stock final = 0 unidades (se restó 4 dos veces)
```

**Captura del problema:**

- Primera salida: -4 unidades (ajuste de cantidad en lote)
- Segunda salida: -4 unidades (venta)
- Stock final: 8 - 4 - 4 = 0 ❌

---

## 🔍 Causa Raíz

### Arquitectura del Sistema

El sistema tiene **DOS mecanismos** que actualizan el stock:

1. **Trigger SQL** (`sync_stock_on_lote_update`) - Se ejecuta automáticamente cuando:

   - Se actualiza la cantidad de un lote
   - Se cambia el estado de un lote (disponible → vencido/retirado)

2. **Código TypeScript** en `lib/db/sales.ts` - Línea 473-479:
   ```typescript
   await tx.productos.update({
     where: { id: item.producto_id },
     data: {
       stock_actual: { decrement: item.cantidad },
     },
   });
   ```

### ¿Por qué sucede el doble descuento?

```
FLUJO DE VENTA:

1. descontarStockDeLotes() actualiza el lote:
   lotes_productos.cantidad: 8 → 4
   → TRIGGER SQL se activa
   → productos.stock_actual: 8 → 4 ✅ (PRIMER DESCUENTO)

2. createSale() actualiza el producto manualmente:
   → productos.stock_actual: 4 → 0 ❌ (SEGUNDO DESCUENTO - DUPLICADO)
```

---

## ✅ Solución Implementada

### Cambio en `lib/db/sales.ts`

**ANTES (❌ INCORRECTO):**

```typescript
// Actualizar stock actual del producto
await tx.productos.update({
  where: { id: item.producto_id },
  data: {
    stock_actual: { decrement: item.cantidad },
  },
});
```

**DESPUÉS (✅ CORRECTO):**

```typescript
// ❌ REMOVIDO: NO actualizar stock manualmente - el trigger SQL lo hace automáticamente
// El stock se actualiza por el trigger cuando se descuenta el lote en descontarStockDeLotes()
// Mantener este UPDATE causaría DOBLE DESCUENTO

console.log(
  `✅ Stock del producto ${
    producto!.nombre
  } será actualizado automáticamente por el trigger SQL`
);
```

### Documentación en `descontarStockDeLotes()`

Agregado comentario explicativo:

```typescript
/**
 * Descontar stock de lotes usando FIFO
 *
 * ⚠️ IMPORTANTE: Esta función SOLO actualiza los lotes_productos.
 * El stock del producto se actualiza AUTOMÁTICAMENTE por el trigger SQL
 * cuando el lote cambia de estado o cantidad. NO actualizar manualmente
 * el producto aquí para evitar DOBLE DESCUENTO.
 */
```

---

## 🛠️ Pasos para Aplicar la Corrección

### 1. Corregir Stock Negativo Actual

```sql
-- Ver productos con stock negativo
SELECT id, codigo, nombre, stock_actual
FROM productos
WHERE stock_actual < 0;

-- Corregir a 0
UPDATE productos
SET stock_actual = 0
WHERE stock_actual < 0;
```

### 2. Verificar que el Trigger Esté Actualizado

Ejecutar: `database/fix-trigger-stock-negativo.sql`

Este script contiene el trigger corregido que:

- ✅ Solo descuenta si `NEW.cantidad > 0`
- ✅ Evita que el stock quede negativo
- ✅ Registra logs detallados

### 3. Reiniciar el Servidor

```powershell
# Detener servidor actual
Ctrl+C

# Limpiar procesos de Node
Get-Process -Name "node" | Stop-Process -Force

# Reiniciar
npm run dev
```

### 4. Probar con Venta Real

```
1. Abrir POS
2. Agregar un producto con cantidad conocida (ej: 8 unidades)
3. Hacer venta de 4 unidades
4. Verificar que el stock quede en 4 (NO en 0)
```

---

## 🔄 Script Automático de Corrección

Ejecuta este script para aplicar todas las correcciones:

```powershell
.\corregir-doble-descuento.ps1
```

Este script:

1. ✅ Verifica el código TypeScript
2. ⚠️ Te guía para ejecutar los SQL manualmente
3. ✅ Reinicia el servidor
4. ✅ Muestra pasos siguientes

---

## 📊 Verificación Post-Corrección

### Consulta SQL para verificar:

```sql
-- Ver historial de movimientos recientes
SELECT
    h.fecha_movimiento,
    p.nombre,
    h.tipo_movimiento,
    h.cantidad_anterior,
    h.cantidad_movimiento,
    h.cantidad_nueva,
    h.observaciones
FROM historial_inventario h
LEFT JOIN productos p ON h.producto_id = p.id
ORDER BY h.fecha_movimiento DESC
LIMIT 20;
```

### Esperado después de venta de 4 unidades:

```
Stock anterior: 8
Movimiento: -4
Stock nuevo: 4 ✅

NO debe haber:
Stock anterior: 4
Movimiento: -4
Stock nuevo: 0 ❌
```

---

## 🎯 Arquitectura Correcta

### Única Fuente de Verdad: TRIGGER SQL

```
┌─────────────────────────────────────────────┐
│         VENTA EN TYPESCRIPT                  │
│                                              │
│  1. descontarStockDeLotes()                 │
│     └─> UPDATE lotes_productos              │
│         SET cantidad = cantidad - X          │
│                                              │
│  2. createSale()                            │
│     └─> INSERT INTO detalle_ventas          │
│                                              │
│  ❌ NO ACTUALIZAR productos.stock_actual    │
└─────────────────────────────────────────────┘
                    │
                    │ Trigger SQL activa automáticamente
                    ▼
┌─────────────────────────────────────────────┐
│       TRIGGER SQL (sync_stock_on_lote)      │
│                                              │
│  Detecta cambio en lotes_productos          │
│  └─> UPDATE productos                       │
│      SET stock_actual = stock_actual - X    │
│                                              │
│  ✅ ÚNICA ACTUALIZACIÓN DEL STOCK           │
└─────────────────────────────────────────────┘
```

---

## 📝 Archivos Modificados

1. **lib/db/sales.ts**

   - ❌ Eliminado UPDATE manual de `productos.stock_actual`
   - ✅ Agregado comentario explicativo
   - ✅ Log de confirmación

2. **database/corregir-stock-negativo-rapido.sql** (NUEVO)

   - Script para corregir stock negativo rápidamente

3. **corregir-doble-descuento.ps1** (NUEVO)
   - Script automatizado de corrección completa

---

## ⚠️ CRÍTICO: Regla de Oro

### ❌ NUNCA HACER:

```typescript
// ❌ NO actualizar productos.stock_actual manualmente en código TypeScript
await prisma.productos.update({
  data: { stock_actual: { decrement: cantidad } },
});
```

### ✅ SIEMPRE HACER:

```typescript
// ✅ SOLO actualizar lotes_productos
await prisma.lotes_productos.update({
  data: {
    cantidad: nuevaCantidad,
    estado: nuevaCantidad === 0 ? "retirado" : "disponible",
  },
});

// El trigger SQL actualizará productos.stock_actual automáticamente
```

---

## 🧪 Casos de Prueba

### Caso 1: Venta Simple

```
Stock inicial: 10 unidades
Venta: 3 unidades
Stock final esperado: 7 unidades ✅
```

### Caso 2: Venta que Agota Lote

```
Lote 1: 5 unidades
Venta: 5 unidades
Lote 1 final: 0 unidades (estado: retirado)
Stock producto: -5 unidades ✅
```

### Caso 3: Venta con Múltiples Lotes (FIFO)

```
Lote 1: 3 unidades (vence primero)
Lote 2: 7 unidades (vence después)
Venta: 5 unidades

Esperado:
- Lote 1: 0 unidades (estado: retirado) ✅
- Lote 2: 5 unidades (estado: disponible) ✅
- Stock producto: -5 unidades ✅
```

### Caso 4: Pago Mixto

```
Venta: 8 unidades (mixto: $5k efectivo + $3k nequi)
Stock inicial: 12 unidades
Stock final: 4 unidades ✅

NO debe restar 16 unidades (doble descuento) ❌
```

---

## 📞 Soporte

Si después de aplicar la corrección sigues viendo stock negativo:

1. Verifica que ejecutaste el SQL de corrección
2. Verifica que el código TypeScript NO tiene el UPDATE manual
3. Revisa los logs del servidor durante la venta
4. Consulta el historial de inventario para ver los movimientos duplicados

---

## ✅ Checklist de Corrección

- [ ] Ejecutar `database/corregir-stock-negativo-rapido.sql`
- [ ] Ejecutar `database/fix-trigger-stock-negativo.sql`
- [ ] Verificar que `lib/db/sales.ts` NO tiene UPDATE manual
- [ ] Reiniciar servidor (`npm run dev`)
- [ ] Hacer venta de prueba
- [ ] Verificar stock se descuenta UNA SOLA VEZ
- [ ] Verificar historial_inventario tiene un solo movimiento por venta

---

**Fecha de corrección:** 10 de Diciembre 2025  
**Archivos afectados:** `lib/db/sales.ts`, `database/fix-trigger-stock-negativo.sql`  
**Prioridad:** 🔴 CRÍTICA - Afecta integridad de inventario
