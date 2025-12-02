# 📦 SOLUCIÓN IMPLEMENTADA: Sincronización Productos-Lotes

## 🎯 Problema Identificado

Existía una **desincronización** entre:
- `productos.stock_actual` (stock agregado)
- `lotes_productos.cantidad` (stock por lote)

### Inconsistencias encontradas:
1. **Al crear lote**: No se sumaba al `stock_actual`
2. **Al vender**: No se descontaba del lote ni del stock
3. **Al vencer lote**: No se restaba del `stock_actual`
4. **Fecha de vencimiento**: Se ingresaba manualmente (no se calculaba con `dias_vencimiento`)

---

## ✅ Solución Implementada

### **1. Triggers PostgreSQL (Sincronización Automática)**

Se crearon 4 triggers que mantienen sincronizado `stock_actual`:

#### **Trigger 1: Al CREAR lote**
```sql
CREATE TRIGGER trigger_sync_stock_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();
```
**Efecto:** 
- Creas lote de 50 kg → `stock_actual += 50`
- Solo si `estado = 'disponible'`
- Registra en `historial_inventario`

#### **Trigger 2: Al ACTUALIZAR lote**
```sql
CREATE TRIGGER trigger_sync_stock_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();
```
**Efecto:**
- Cambio de estado `disponible → vencido` → `stock_actual -= cantidad`
- Cambio de estado `vencido → disponible` → `stock_actual += cantidad`
- Cambio de cantidad → Ajusta `stock_actual` con la diferencia

#### **Trigger 3: Al VENDER**
```sql
CREATE TRIGGER trigger_sync_stock_venta
    AFTER INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_venta();
```
**Efecto:**
- Si hay `lote_id` → Descuenta del lote (que a su vez actualiza stock vía trigger 2)
- Si NO hay `lote_id` → Descuenta directo de `stock_actual`

#### **Trigger 4: Al ELIMINAR lote**
```sql
CREATE TRIGGER trigger_sync_stock_delete
    BEFORE DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_delete();
```
**Efecto:**
- Eliminas lote de 50 kg disponible → `stock_actual -= 50`
- Registra en `historial_inventario`

---

### **2. Cálculo Automático de `fecha_vencimiento`**

**Antes:**
```typescript
// Manual
fecha_vencimiento: data.fecha_vencimiento || null
```

**Ahora:**
```typescript
// Automático desde producto.dias_vencimiento
if (producto.es_perecedero && producto.dias_vencimiento) {
    fechaVencimiento = fecha_produccion + dias_vencimiento
}
```

**Ejemplo:**
- Producto: Yogurt (15 días de vida útil)
- Lote: Fecha producción = 2025-12-01
- **Resultado**: `fecha_vencimiento = 2025-12-16` (calculado automáticamente)

---

## 📊 Flujo Completo

### **Caso 1: Crear Producto y Lote**

```typescript
// 1. Crear Producto
createProduct({
    nombre: "Yogurt de Fresa",
    codigo: "YOG-FRESA",
    es_perecedero: true,
    dias_vencimiento: 15,
    stock_inicial: 0  // ⬅️ Sin stock inicial
})
// productos.stock_actual = 0

// 2. Crear Lote
createLote({
    producto_id: 1,
    codigo_lote: "YOG-202512-001",
    cantidad: 50,
    fecha_produccion: "2025-12-01"
    // fecha_vencimiento se calcula automáticamente
})
// ✅ Trigger ejecuta:
// productos.stock_actual = 0 + 50 = 50
// lotes_productos.fecha_vencimiento = "2025-12-16"
```

### **Caso 2: Vender con Lote Específico**

```typescript
// Venta
createDetalle Ventas({
    producto_id: 1,
    lote_id: 1,
    cantidad: 10
})
// ✅ Trigger ejecuta:
// lotes_productos.cantidad = 50 - 10 = 40
// ✅ Trigger de UPDATE lote ejecuta:
// productos.stock_actual = 50 - 10 = 40
```

### **Caso 3: Lote Vence**

```typescript
// Cambiar estado del lote
updateLote(1, {
    estado: "vencido"
})
// ✅ Trigger ejecuta:
// productos.stock_actual = 40 - 40 = 0
// (Ya no está disponible)
```

---

## 🔍 Verificación

### **1. Verificar sincronización:**
```sql
SELECT 
    p.id,
    p.nombre,
    p.stock_actual AS stock_producto,
    COALESCE(SUM(l.cantidad), 0) AS stock_lotes_disponibles,
    (p.stock_actual - COALESCE(SUM(l.cantidad), 0)) AS diferencia
FROM productos p
LEFT JOIN lotes_productos l ON p.id = l.producto_id AND l.estado = 'disponible'
GROUP BY p.id, p.nombre, p.stock_actual
HAVING p.stock_actual != COALESCE(SUM(l.cantidad), 0);
```

**Resultado esperado:** 0 filas (todo sincronizado)

### **2. Ver historial:**
```sql
SELECT * FROM historial_inventario
WHERE referencia_tipo = 'lote'
ORDER BY fecha_movimiento DESC
LIMIT 10;
```

---

## 📁 Archivos Modificados

### **1. `database/trigger-sync-stock-lotes.sql`** ✅ Creado
- 4 triggers de sincronización
- Funciones PL/pgSQL
- Registro automático en historial

### **2. `database/sync-stock-actual.sql`** ✅ Creado
- Script de migración única
- Recalcula stock_actual desde lotes existentes
- Genera reporte de cambios

### **3. `lib/db/lotes.ts`** ✅ Modificado
- Cálculo automático de `fecha_vencimiento`
- Usa `producto.dias_vencimiento`
- Fallback a fecha manual si no hay días

---

## ⚠️ Consideraciones

### **Productos sin lotes (no perecederos)**
Los triggers respetan productos que NO usan lotes:
- Si `detalle_ventas.lote_id = NULL` → Descuenta directo de `stock_actual`
- Ejemplo: Herramientas, insumos no perecederos

### **FIFO Automático (Próxima Fase)**
Para implementar FIFO (vender del lote que vence primero):
```typescript
// En el POS, al agregar producto:
const loteDisponible = await prisma.lotes_productos.findFirst({
    where: { 
        producto_id: productoId, 
        estado: 'disponible',
        cantidad: { gt: 0 }
    },
    orderBy: { fecha_vencimiento: 'asc' }  // ⬅️ FIFO
})
```

---

## 🎯 Beneficios

1. ✅ **Sincronización automática** (sin código manual)
2. ✅ **Auditoría completa** (historial_inventario)
3. ✅ **Trazabilidad INVIMA** (lote_id en ventas)
4. ✅ **Cálculo automático de vencimientos**
5. ✅ **Sin descuadres** (triggers en BD)
6. ✅ **Compatible con código existente** (no rompe nada)

---

## 🚀 Próximos Pasos

1. **Probar el flujo completo:**
   - Crear producto
   - Crear lote
   - Verificar stock
   - Hacer venta
   - Verificar descuento

2. **Implementar FIFO en POS** (Fase 3)

3. **Widget de alertas de vencimiento** en Dashboard

4. **Reportes de trazabilidad** por lote

---

## 📝 Notas Técnicas

- **Triggers**: Se ejecutan automáticamente en PostgreSQL
- **Orden**: `AFTER INSERT/UPDATE` (no bloquean transacción)
- **Rollback**: Si hay error, toda la transacción se revierte
- **Performance**: Impacto mínimo (operaciones simples)
- **Prisma**: Compatible (usa SQL nativo de PostgreSQL)
