-- =====================================================
-- FIX: Agregar usuario_id a historial_inventario en triggers
-- =====================================================
-- Este script actualiza todos los triggers que crean registros
-- en historial_inventario para que incluyan el usuario_id

-- ==========================================
-- 1. TRIGGER: Al CREAR un lote
-- ==========================================
CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo sumar si el lote está disponible
    IF NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        -- Registrar en historial CON usuario_id
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
            p.id,
            'entrada',
            p.stock_actual - NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Entrada de lote: ' || NEW.codigo_lote,
            NEW.usuario_id
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. TRIGGER: Al ACTUALIZAR un lote
-- ==========================================
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
            observaciones,
            usuario_id
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
            NEW.usuario_id
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
            observaciones,
            usuario_id
        )
        SELECT 
            p.id,
            'entrada',
            p.stock_actual - NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Lote ' || NEW.codigo_lote || ' reactivado a disponible',
            NEW.usuario_id
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
            observaciones,
            usuario_id
        )
        SELECT 
            p.id,
            CASE WHEN diferencia > 0 THEN 'entrada' ELSE 'salida' END,
            p.stock_actual - diferencia,
            ABS(diferencia),
            p.stock_actual,
            NEW.id,
            'lote',
            'Ajuste de cantidad en lote: ' || NEW.codigo_lote,
            NEW.usuario_id
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. TRIGGER: Al ELIMINAR un lote
-- ==========================================
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
            observaciones,
            usuario_id
        )
        SELECT 
            p.id,
            'salida',
            p.stock_actual + OLD.cantidad,
            OLD.cantidad,
            p.stock_actual,
            OLD.id,
            'lote',
            'Eliminación de lote: ' || OLD.codigo_lote,
            OLD.usuario_id
        FROM productos p
        WHERE p.id = OLD.producto_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMENTARIOS
-- ==========================================
COMMENT ON FUNCTION sync_stock_on_lote_insert() IS 
'Sincroniza stock_actual al crear un lote. Suma cantidad si estado=disponible. INCLUYE usuario_id.';

COMMENT ON FUNCTION sync_stock_on_lote_update() IS 
'Sincroniza stock_actual al actualizar lote. Maneja cambios de estado y cantidad. INCLUYE usuario_id.';

COMMENT ON FUNCTION sync_stock_on_lote_delete() IS 
'Sincroniza stock_actual al eliminar lote. Resta cantidad si estaba disponible. INCLUYE usuario_id.';

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================
