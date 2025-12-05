-- =====================================================
-- MIGRACIÓN: Corrección de Triggers de Lotes
-- Elimina triggers problemáticos y crea los correctos
-- =====================================================

-- 1. ELIMINAR TRIGGERS Y FUNCIONES PROBLEMÁTICAS
DROP TRIGGER IF EXISTS trigger_auditoria_lotes ON lotes_productos;
DROP FUNCTION IF EXISTS auditar_lotes_productos();
DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON lotes_productos;
DROP TRIGGER IF EXISTS trigger_sync_stock_update ON lotes_productos;
DROP TRIGGER IF EXISTS trigger_sync_stock_delete ON lotes_productos;
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_lotes ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_delete();

-- 2. ELIMINAR TRIGGERS DUPLICADOS SI EXISTEN
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_insert ON lotes_productos;
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_update ON lotes_productos;

-- 3. CREAR FUNCIÓN PARA SINCRONIZAR STOCK AL INSERTAR LOTE
CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo sumar al stock si el lote está disponible
    IF NEW.estado = 'disponible' THEN
        -- Actualizar stock del producto
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad,
            updated_at = NOW()
        WHERE id = NEW.producto_id;
        
        -- Registrar en historial de inventario
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
            NOW()
        FROM productos p
        WHERE p.id = NEW.producto_id;
        
        RAISE NOTICE 'Stock incrementado en % para producto % (Lote: %)', 
                     NEW.cantidad, NEW.producto_id, NEW.codigo_lote;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CREAR FUNCIÓN PARA SINCRONIZAR STOCK AL ACTUALIZAR LOTE
CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso 1: Cambio de disponible a otro estado (retirado, agotado, vencido)
    IF OLD.estado = 'disponible' AND NEW.estado != 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad,
            updated_at = NOW()
        WHERE id = OLD.producto_id;
        
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
            'salida',
            p.stock_actual + OLD.cantidad,
            OLD.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Lote ' || NEW.codigo_lote || ' cambió a estado: ' || NEW.estado,
            NOW()
        FROM productos p
        WHERE p.id = OLD.producto_id;
        
        RAISE NOTICE 'Stock reducido en % para producto % (lote cambió de disponible a %)', 
                     OLD.cantidad, OLD.producto_id, NEW.estado;
    
    -- Caso 2: Cambio de otro estado a disponible (reactivación)
    ELSIF OLD.estado != 'disponible' AND NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad,
            updated_at = NOW()
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
            'Lote ' || NEW.codigo_lote || ' reactivado',
            NOW()
        FROM productos p
        WHERE p.id = NEW.producto_id;
        
        RAISE NOTICE 'Stock incrementado en % para producto % (lote reactivado)', 
                     NEW.cantidad, NEW.producto_id;
    
    -- Caso 3: Cambio de cantidad mientras está disponible
    ELSIF OLD.estado = 'disponible' AND NEW.estado = 'disponible' AND OLD.cantidad != NEW.cantidad THEN
        DECLARE
            diferencia DECIMAL(10,2);
        BEGIN
            diferencia := NEW.cantidad - OLD.cantidad;
            
            UPDATE productos 
            SET stock_actual = stock_actual + diferencia,
                updated_at = NOW()
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
                CASE WHEN diferencia > 0 THEN 'entrada' ELSE 'salida' END,
                p.stock_actual - diferencia,
                ABS(diferencia),
                p.stock_actual,
                NEW.id,
                'lote',
                'Ajuste de cantidad del lote ' || NEW.codigo_lote,
                NOW()
            FROM productos p
            WHERE p.id = NEW.producto_id;
            
            RAISE NOTICE 'Stock ajustado en % para producto % (lote %)', 
                         diferencia, NEW.producto_id, NEW.codigo_lote;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CREAR TRIGGERS
CREATE TRIGGER trg_sync_stock_on_lote_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();

CREATE TRIGGER trg_sync_stock_on_lote_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

-- 6. AGREGAR COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON FUNCTION sync_stock_on_lote_insert() IS 
'Sincroniza automáticamente el stock del producto al insertar un nuevo lote disponible';

COMMENT ON FUNCTION sync_stock_on_lote_update() IS 
'Sincroniza automáticamente el stock del producto al cambiar el estado o cantidad de un lote';

COMMENT ON TRIGGER trg_sync_stock_on_lote_insert ON lotes_productos IS 
'Trigger que actualiza stock_actual del producto cuando se inserta un lote disponible';

COMMENT ON TRIGGER trg_sync_stock_on_lote_update ON lotes_productos IS 
'Trigger que actualiza stock_actual del producto cuando se modifica un lote';
