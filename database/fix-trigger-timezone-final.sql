-- SOLUCIÓN DEFINITIVA: Usar AT TIME ZONE en lugar de TIMEZONE()
-- AT TIME ZONE convierte correctamente y mantiene el valor deseado

-- ============================================
-- TRIGGER INSERT (FIXED)
-- ============================================
DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_insert();

CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_colombia TIMESTAMP;
BEGIN
    -- Obtener hora actual de Colombia
    v_fecha_colombia := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota';
    
    IF NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones,
            fecha_movimiento
        )
        SELECT 
            p.id,
            'entrada',
            p.stock_actual - NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Entrada de lote: ' || NEW.codigo_lote,
            v_fecha_colombia  -- Usar variable con hora de Colombia
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_stock_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();

-- ============================================
-- TRIGGER UPDATE (FIXED)
-- ============================================
DROP TRIGGER IF EXISTS trigger_sync_stock_update ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_update();

CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_colombia TIMESTAMP;
BEGIN
    v_fecha_colombia := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota';
    
    IF OLD.estado = 'disponible' AND NEW.estado != 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad
        WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 'salida', p.stock_actual + OLD.cantidad,
               OLD.cantidad, p.stock_actual, OLD.id, 'lote',
               'Cambio de estado de lote: ' || OLD.codigo_lote || ' de disponible a ' || NEW.estado,
               v_fecha_colombia
        FROM productos p WHERE p.id = OLD.producto_id;
        
    ELSIF OLD.estado != 'disponible' AND NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 'entrada', p.stock_actual - NEW.cantidad,
               NEW.cantidad, p.stock_actual, NEW.id, 'lote',
               'Cambio de estado de lote: ' || NEW.codigo_lote || ' de ' || OLD.estado || ' a disponible',
               v_fecha_colombia
        FROM productos p WHERE p.id = NEW.producto_id;
        
    ELSIF OLD.estado = 'disponible' AND NEW.estado = 'disponible' AND OLD.cantidad != NEW.cantidad THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 
               CASE WHEN NEW.cantidad > OLD.cantidad THEN 'entrada' ELSE 'salida' END,
               p.stock_actual + OLD.cantidad - NEW.cantidad,
               ABS(NEW.cantidad - OLD.cantidad),
               p.stock_actual,
               NEW.id, 'lote',
               'Ajuste de cantidad en lote: ' || NEW.codigo_lote,
               v_fecha_colombia
        FROM productos p WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_stock_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

-- ============================================
-- TRIGGER DELETE (FIXED)
-- ============================================
DROP TRIGGER IF EXISTS trigger_sync_stock_delete ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_delete();

CREATE OR REPLACE FUNCTION sync_stock_on_lote_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_colombia TIMESTAMP;
BEGIN
    v_fecha_colombia := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota';
    
    IF OLD.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad
        WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 'salida', p.stock_actual + OLD.cantidad,
               OLD.cantidad, p.stock_actual, OLD.id, 'lote',
               'Eliminación de lote: ' || OLD.codigo_lote,
               v_fecha_colombia
        FROM productos p WHERE p.id = OLD.producto_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_stock_delete
    AFTER DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_delete();

-- Verificación
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'lotes_productos'
ORDER BY trigger_name;

-- Test de la función de conversión
SELECT 
    NOW() AS "UTC actual",
    NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota' AS "Colombia actual",
    TIMEZONE('America/Bogota', NOW()) AS "Con TIMEZONE (incorrecto)";
