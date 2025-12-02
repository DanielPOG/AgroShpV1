-- SOLUCIÓN FINAL CORRECTA
-- El servidor PostgreSQL YA está en timezone America/Bogota
-- Solo necesitamos usar NOW() directamente

DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_insert();

CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        -- Usar NOW() directamente - el servidor ya está en America/Bogota
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
            NOW()  -- Simplemente NOW() - ya está en Colombia
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

-- UPDATE trigger
DROP TRIGGER IF EXISTS trigger_sync_stock_update ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_update();

CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
BEGIN
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
               NOW()
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
               NOW()
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
               NOW()
        FROM productos p WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_stock_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

-- DELETE trigger
DROP TRIGGER IF EXISTS trigger_sync_stock_delete ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_delete();

CREATE OR REPLACE FUNCTION sync_stock_on_lote_delete()
RETURNS TRIGGER AS $$
BEGIN
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
               NOW()
        FROM productos p WHERE p.id = OLD.producto_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_stock_delete
    AFTER DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_delete();

SELECT 'Triggers actualizados correctamente. PostgreSQL ya está en America/Bogota.' AS resultado;
