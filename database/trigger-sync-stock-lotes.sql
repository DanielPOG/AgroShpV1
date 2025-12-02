-- =====================================================
-- TRIGGERS PARA SINCRONIZACIÓN AUTOMÁTICA DE STOCK
-- Productos <-> Lotes
-- =====================================================

-- ==========================================
-- 1. TRIGGER: Al CREAR un lote
-- ==========================================
-- Suma la cantidad al stock_actual del producto
-- Solo si el lote está disponible

CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo sumar si el lote está disponible
    IF NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        -- Registrar en historial
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones
        )
        SELECT 
            p.id,
            'entrada',
            p.stock_actual - NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Entrada de lote: ' || NEW.codigo_lote
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON lotes_productos;
CREATE TRIGGER trigger_sync_stock_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();

-- ==========================================
-- 2. TRIGGER: Al ACTUALIZAR un lote
-- ==========================================
-- Ajusta el stock_actual cuando:
-- - Cambia el estado (disponible <-> vencido/retirado)
-- - Cambia la cantidad del lote

CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
DECLARE
    diferencia DECIMAL(10,2);
BEGIN
    -- CASO 1: Cambio de estado de disponible a vencido/retirado
    IF OLD.estado = 'disponible' AND NEW.estado != 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad
        WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones
        )
        SELECT 
            p.id,
            'salida',
            p.stock_actual + OLD.cantidad,
            OLD.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Lote ' || NEW.codigo_lote || ' cambió a estado: ' || NEW.estado
        FROM productos p
        WHERE p.id = OLD.producto_id;
    END IF;
    
    -- CASO 2: Cambio de estado de vencido/retirado a disponible
    IF OLD.estado != 'disponible' AND NEW.estado = 'disponible' THEN
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
            observaciones
        )
        SELECT 
            p.id,
            'entrada',
            p.stock_actual - NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Lote ' || NEW.codigo_lote || ' reactivado a disponible'
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    -- CASO 3: Cambio de cantidad del lote (solo si está disponible)
    IF NEW.estado = 'disponible' AND OLD.cantidad != NEW.cantidad THEN
        diferencia := NEW.cantidad - OLD.cantidad;
        
        UPDATE productos 
        SET stock_actual = stock_actual + diferencia
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones
        )
        SELECT 
            p.id,
            CASE WHEN diferencia > 0 THEN 'entrada' ELSE 'salida' END,
            p.stock_actual - diferencia,
            ABS(diferencia),
            p.stock_actual,
            NEW.id,
            'lote',
            'Ajuste de cantidad en lote: ' || NEW.codigo_lote
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_stock_update ON lotes_productos;
CREATE TRIGGER trigger_sync_stock_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

-- ==========================================
-- 3. TRIGGER: Al VENDER (detalle_ventas)
-- ==========================================
-- Descuenta del lote especificado

CREATE OR REPLACE FUNCTION sync_stock_on_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la venta tiene lote_id, descontar de ese lote
    IF NEW.lote_id IS NOT NULL THEN
        UPDATE lotes_productos
        SET cantidad = cantidad - NEW.cantidad
        WHERE id = NEW.lote_id;
        
        -- El trigger de lotes_productos se encargará de actualizar stock_actual
    ELSE
        -- Si NO tiene lote_id (productos no perecederos sin lotes)
        -- Descontar directo del stock_actual
        UPDATE productos
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones
        )
        SELECT 
            p.id,
            'salida',
            p.stock_actual + NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.venta_id,
            'venta',
            'Venta sin lote específico'
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_stock_venta ON detalle_ventas;
CREATE TRIGGER trigger_sync_stock_venta
    AFTER INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_venta();

-- ==========================================
-- 4. TRIGGER: Al ELIMINAR un lote
-- ==========================================
-- Resta del stock si el lote estaba disponible

CREATE OR REPLACE FUNCTION sync_stock_on_lote_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo restar si el lote estaba disponible
    IF OLD.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad
        WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones
        )
        SELECT 
            p.id,
            'salida',
            p.stock_actual + OLD.cantidad,
            OLD.cantidad,
            p.stock_actual,
            OLD.id,
            'lote',
            'Eliminación de lote: ' || OLD.codigo_lote
        FROM productos p
        WHERE p.id = OLD.producto_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_stock_delete ON lotes_productos;
CREATE TRIGGER trigger_sync_stock_delete
    BEFORE DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_delete();

-- ==========================================
-- 5. COMENTARIOS Y DOCUMENTACIÓN
-- ==========================================

COMMENT ON FUNCTION sync_stock_on_lote_insert() IS 
'Sincroniza stock_actual al crear un lote. Suma cantidad si estado=disponible.';

COMMENT ON FUNCTION sync_stock_on_lote_update() IS 
'Sincroniza stock_actual al actualizar lote. Maneja cambios de estado y cantidad.';

COMMENT ON FUNCTION sync_stock_on_venta() IS 
'Descuenta del lote al vender. Si no hay lote_id, descuenta directo del producto.';

COMMENT ON FUNCTION sync_stock_on_lote_delete() IS 
'Sincroniza stock_actual al eliminar lote. Resta cantidad si estaba disponible.';

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================
