-- Arreglar trigger para usar timezone de Colombia en historial_inventario
-- Este script actualiza el trigger para que inserte fecha_movimiento en hora de Colombia

-- 1. Eliminar trigger existente
DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON lotes_productos;

-- 2. Eliminar función existente
DROP FUNCTION IF EXISTS sync_stock_on_lote_insert();

-- 3. Crear nueva función con timezone de Colombia
CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'disponible' THEN
        -- Actualizar stock del producto
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        -- Insertar en historial con fecha_movimiento en hora de Colombia
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones,
            fecha_movimiento  -- AGREGADO: especificar fecha_movimiento explícitamente
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
            TIMEZONE('America/Bogota', NOW())  -- HORA DE COLOMBIA
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear nuevo trigger
CREATE TRIGGER trigger_sync_stock_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();

-- Verificar que se creó correctamente
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'lotes_productos' 
  AND trigger_name = 'trigger_sync_stock_insert';

COMMENT ON FUNCTION sync_stock_on_lote_insert IS 'Trigger actualizado para usar timezone America/Bogota en historial_inventario';
