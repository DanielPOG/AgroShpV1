-- =====================================================
-- VERIFICAR Y CORREGIR STOCK NEGATIVO
-- Ejecutar este script para corregir el problema de doble descuento
-- =====================================================

-- 1. PRIMERO: Ver productos con stock negativo
SELECT 
    id,
    codigo,
    nombre,
    stock_actual,
    unidad
FROM productos
WHERE stock_actual < 0
ORDER BY stock_actual ASC;

-- 2. OPCIÓN A: Corregir stock negativo sumando el valor absoluto
-- (Si tienes productos con stock -4, -6, etc., esto los pondrá en 0)
UPDATE productos
SET stock_actual = 0
WHERE stock_actual < 0;

-- 3. Verificar que se corrigieron
SELECT 
    id,
    codigo,
    nombre,
    stock_actual,
    unidad
FROM productos
WHERE stock_actual < 0;
-- Debería retornar 0 filas

-- 4. Ver historial de movimientos de los productos afectados
-- (Para investigar cómo llegaron a negativo)
SELECT 
    h.id,
    h.fecha_movimiento,
    h.tipo_movimiento,
    h.cantidad_anterior,
    h.cantidad_movimiento,
    h.cantidad_nueva,
    h.referencia_tipo,
    h.observaciones,
    p.nombre as producto_nombre
FROM historial_inventario h
LEFT JOIN productos p ON h.producto_id = p.id
WHERE h.producto_id IN (
    -- IDs de productos que tuvieron stock negativo
    SELECT DISTINCT producto_id 
    FROM historial_inventario 
    WHERE cantidad_nueva < 0
)
ORDER BY h.fecha_movimiento DESC
LIMIT 50;

-- 5. RECOMENDACIÓN: Después de corregir el stock,
-- ejecutar el script de corrección del trigger:
-- database/fix-trigger-stock-negativo.sql
