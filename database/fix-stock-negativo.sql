-- =====================================================
-- SCRIPT DE CORRECCIÓN: PRODUCTOS CON STOCK NEGATIVO
-- Fecha: 10 de Diciembre 2025
-- Problema: Helado (-6 kg) y Loco (-120 unidades)
-- =====================================================

-- Este script recalcula el stock correcto basándose en los lotes disponibles
-- y corrige las discrepancias causadas por el bug de doble descuento

BEGIN;

-- 1. Mostrar estado actual de productos con stock negativo
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.stock_actual as stock_registrado,
    COALESCE(SUM(CASE WHEN lp.estado = 'disponible' THEN lp.cantidad ELSE 0 END), 0) as stock_real_lotes,
    p.stock_actual - COALESCE(SUM(CASE WHEN lp.estado = 'disponible' THEN lp.cantidad ELSE 0 END), 0) as diferencia
FROM productos p
LEFT JOIN lotes_productos lp ON lp.producto_id = p.id
WHERE p.stock_actual < 0
GROUP BY p.id, p.codigo, p.nombre, p.stock_actual
ORDER BY p.nombre;

-- 2. Backup de datos actuales (por seguridad)
CREATE TEMP TABLE backup_productos_negativos AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.stock_actual as stock_antes,
    NOW() as fecha_backup
FROM productos p
WHERE p.stock_actual < 0;

-- 3. Mostrar lotes relacionados con productos negativos
SELECT 
    p.nombre as producto,
    lp.codigo_lote,
    lp.estado,
    lp.cantidad,
    lp.fecha_vencimiento,
    lp.created_at
FROM productos p
INNER JOIN lotes_productos lp ON lp.producto_id = p.id
WHERE p.stock_actual < 0
ORDER BY p.nombre, lp.estado, lp.created_at DESC;

-- 4. Mostrar historial de movimientos recientes
SELECT 
    p.nombre as producto,
    hi.tipo_movimiento,
    hi.cantidad_movimiento,
    hi.cantidad_anterior,
    hi.cantidad_nueva,
    hi.referencia_tipo,
    hi.observaciones,
    hi.fecha_movimiento
FROM productos p
INNER JOIN historial_inventario hi ON hi.producto_id = p.id
WHERE p.stock_actual < 0
ORDER BY p.nombre, hi.fecha_movimiento DESC
LIMIT 50;

-- 5. CORRECCIÓN: Recalcular stock basándose en lotes disponibles
-- Fórmula correcta: stock_actual = SUM(cantidad de lotes disponibles)
UPDATE productos p
SET stock_actual = (
    SELECT COALESCE(SUM(lp.cantidad), 0)
    FROM lotes_productos lp
    WHERE lp.producto_id = p.id 
    AND lp.estado = 'disponible'
)
WHERE p.stock_actual < 0;

-- 6. Registrar corrección en historial
INSERT INTO historial_inventario (
    producto_id, 
    tipo_movimiento, 
    cantidad_anterior, 
    cantidad_movimiento,
    cantidad_nueva, 
    referencia_id, 
    referencia_tipo, 
    observaciones, 
    usuario_id
)
SELECT 
    b.id,
    'ajuste',
    b.stock_antes,
    p.stock_actual - b.stock_antes,
    p.stock_actual,
    NULL,
    'correccion',
    'Corrección de stock negativo - Bug doble descuento (Fecha: ' || NOW() || ')',
    1 -- Usuario sistema
FROM backup_productos_negativos b
INNER JOIN productos p ON p.id = b.id;

-- 7. Mostrar resultado final
SELECT 
    b.nombre,
    b.stock_antes as antes,
    p.stock_actual as despues,
    (p.stock_actual - b.stock_antes) as ajuste,
    (SELECT COUNT(*) FROM lotes_productos WHERE producto_id = p.id AND estado = 'disponible') as lotes_disponibles
FROM backup_productos_negativos b
INNER JOIN productos p ON p.id = b.id;

-- 8. Confirmar cambios
-- IMPORTANTE: Revisar los resultados antes de hacer COMMIT
-- Si todo está correcto, ejecutar: COMMIT;
-- Si hay algún problema, ejecutar: ROLLBACK;

COMMIT; -- ⚠️ Comentar esta línea si quieres revisar primero

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Conectar a la base de datos de producción
-- 2. Ejecutar este script completo
-- 3. Revisar los resultados en las consultas SELECT
-- 4. Si todo está correcto, el COMMIT ya se ejecutó
-- 5. Verificar que los productos ahora tienen stock correcto
-- =====================================================

-- VERIFICACIÓN POST-CORRECCIÓN:
-- SELECT nombre, stock_actual FROM productos WHERE nombre IN ('Helado', 'Loco');
