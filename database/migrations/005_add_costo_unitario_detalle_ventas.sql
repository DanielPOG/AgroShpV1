-- =====================================================
-- Migración: Agregar costo_unitario a detalle_ventas
-- Fecha: 2025-12-16
-- Descripción: Almacenar el costo de producción al momento de la venta
--              para calcular rentabilidad histórica precisa
-- =====================================================

-- Agregar columna costo_unitario
ALTER TABLE detalle_ventas 
ADD COLUMN IF NOT EXISTS costo_unitario DECIMAL(10, 2);

-- Comentario en la columna
COMMENT ON COLUMN detalle_ventas.costo_unitario IS 
'Costo unitario del producto al momento de la venta. Se copia desde costos_produccion.costo_unitario del lote vendido.';

-- Rellenar costos históricos desde costos_produccion
-- Solo para registros donde existe el costo del lote
UPDATE detalle_ventas dv
SET costo_unitario = cp.costo_unitario
FROM costos_produccion cp
WHERE dv.lote_id = cp.lote_id
  AND dv.costo_unitario IS NULL
  AND cp.costo_unitario IS NOT NULL;

-- Verificar resultados
DO $$
DECLARE
    total_detalle INTEGER;
    con_costo INTEGER;
    sin_costo INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_detalle FROM detalle_ventas;
    SELECT COUNT(*) INTO con_costo FROM detalle_ventas WHERE costo_unitario IS NOT NULL;
    SELECT COUNT(*) INTO sin_costo FROM detalle_ventas WHERE costo_unitario IS NULL;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'RESULTADOS DE LA MIGRACIÓN:';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total detalle_ventas: %', total_detalle;
    RAISE NOTICE 'Con costo_unitario: % (%.1f%%)', con_costo, (con_costo::FLOAT / NULLIF(total_detalle, 0) * 100);
    RAISE NOTICE 'Sin costo_unitario: % (%.1f%%)', sin_costo, (sin_costo::FLOAT / NULLIF(total_detalle, 0) * 100);
    RAISE NOTICE '==============================================';
END $$;
