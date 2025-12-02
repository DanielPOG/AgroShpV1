-- =====================================================
-- SCRIPT DE MIGRACIÓN: Sincronizar stock_actual con lotes
-- =====================================================
-- Este script recalcula el stock_actual de todos los productos
-- basándose en la suma de lotes disponibles

-- 1. Hacer backup del stock_actual anterior
CREATE TEMP TABLE IF NOT EXISTS backup_stock AS
SELECT 
    id,
    codigo,
    nombre,
    stock_actual AS stock_anterior,
    CURRENT_TIMESTAMP AS backup_fecha
FROM productos;

-- 2. Recalcular stock_actual desde lotes disponibles
UPDATE productos p
SET stock_actual = COALESCE(
    (
        SELECT SUM(l.cantidad)
        FROM lotes_productos l
        WHERE l.producto_id = p.id
        AND l.estado = 'disponible'
    ), 
    0
);

-- 3. Mostrar reporte de cambios
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    b.stock_anterior,
    p.stock_actual AS stock_nuevo,
    (p.stock_actual - b.stock_anterior) AS diferencia,
    CASE 
        WHEN p.stock_actual > b.stock_anterior THEN 'AUMENTÓ'
        WHEN p.stock_actual < b.stock_anterior THEN 'DISMINUYÓ'
        ELSE 'SIN CAMBIOS'
    END AS estado_cambio
FROM productos p
JOIN backup_stock b ON p.id = b.id
WHERE p.stock_actual != b.stock_anterior
ORDER BY ABS(p.stock_actual - b.stock_anterior) DESC;

-- 4. Resumen de la sincronización
SELECT 
    COUNT(*) AS total_productos,
    SUM(CASE WHEN p.stock_actual = b.stock_anterior THEN 1 ELSE 0 END) AS sin_cambios,
    SUM(CASE WHEN p.stock_actual > b.stock_anterior THEN 1 ELSE 0 END) AS aumentaron,
    SUM(CASE WHEN p.stock_actual < b.stock_anterior THEN 1 ELSE 0 END) AS disminuyeron,
    SUM(b.stock_anterior) AS stock_total_anterior,
    SUM(p.stock_actual) AS stock_total_nuevo
FROM productos p
JOIN backup_stock b ON p.id = b.id;

-- NOTA: La tabla temporal backup_stock se eliminará automáticamente al cerrar la sesión
-- Si necesitas conservar el backup, crea una tabla permanente
