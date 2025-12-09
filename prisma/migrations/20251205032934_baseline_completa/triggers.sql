-- =====================================================
-- TRIGGERS Y FUNCIONES ADICIONALES PARA BASELINE
-- Generado: 5 de Diciembre 2025
-- =====================================================
-- Estos triggers no son generados automáticamente por Prisma
-- pero son esenciales para el funcionamiento del sistema

-- ==========================================
-- 1. TRIGGER DE AUDITORÍA DE LOTES
-- ==========================================

CREATE OR REPLACE FUNCTION auditar_lotes_productos()
RETURNS TRIGGER AS $$
DECLARE
    v_accion VARCHAR(20);
    v_datos_anteriores JSONB;
    v_datos_nuevos JSONB;
    v_usuario_id INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_accion := 'INSERT';
        v_datos_anteriores := NULL;
        v_datos_nuevos := to_jsonb(NEW);
        v_usuario_id := NEW.usuario_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_accion := 'UPDATE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := to_jsonb(NEW);
        v_usuario_id := COALESCE(NEW.usuario_id, OLD.usuario_id);
    ELSIF (TG_OP = 'DELETE') THEN
        v_accion := 'DELETE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := NULL;
        v_usuario_id := OLD.usuario_id;
    END IF;

    INSERT INTO auditoria (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id, fecha)
    VALUES ('lotes_productos', COALESCE(NEW.id, OLD.id), v_accion, v_datos_anteriores, v_datos_nuevos, v_usuario_id, NOW());

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auditoria_lotes_productos
    AFTER INSERT OR UPDATE OR DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION auditar_lotes_productos();

-- ==========================================
-- 2. TRIGGERS DE SINCRONIZACIÓN DE STOCK
-- ==========================================

-- 2.1 Al CREAR un lote
CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior, cantidad_movimiento,
            cantidad_nueva, referencia_id, referencia_tipo, observaciones, usuario_id
        )
        SELECT 
            p.id, 'entrada', p.stock_actual - NEW.cantidad, NEW.cantidad,
            p.stock_actual, NEW.id, 'lote', 'Entrada de lote: ' || NEW.codigo_lote, NEW.usuario_id
        FROM productos p WHERE p.id = NEW.producto_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_stock_on_lote_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();

-- 2.2 Al ACTUALIZAR un lote
CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
DECLARE
    diferencia DECIMAL(10,2);
    cantidad_a_restar DECIMAL(10,2);
BEGIN
    -- CASO 1: Cambio de estado disponible → vencido/retirado
    -- CRÍTICO: Detectar si también cambió la cantidad para evitar doble resta
    IF OLD.estado = 'disponible' AND NEW.estado != 'disponible' THEN
        -- Si la cantidad también cambió, usar la diferencia (no OLD.cantidad)
        IF OLD.cantidad != NEW.cantidad THEN
            diferencia := OLD.cantidad - NEW.cantidad;
            cantidad_a_restar := diferencia;
        ELSE
            -- Solo cambió el estado, restar toda la cantidad del lote
            cantidad_a_restar := NEW.cantidad;
        END IF;
        
        UPDATE productos 
        SET stock_actual = stock_actual - cantidad_a_restar 
        WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior, cantidad_movimiento,
            cantidad_nueva, referencia_id, referencia_tipo, observaciones, usuario_id
        )
        SELECT 
            p.id, 'salida', p.stock_actual + cantidad_a_restar, cantidad_a_restar, 
            p.stock_actual, NEW.id, 'lote', 
            'Lote ' || NEW.codigo_lote || ' cambió a estado: ' || NEW.estado, 
            NEW.usuario_id
        FROM productos p 
        WHERE p.id = OLD.producto_id;
        
        RETURN NEW; -- CRÍTICO: Salir aquí para evitar ejecutar CASO 3
    END IF;
    
    -- CASO 2: Cambio de vencido/retirado → disponible
    IF OLD.estado != 'disponible' AND NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad 
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior, cantidad_movimiento,
            cantidad_nueva, referencia_id, referencia_tipo, observaciones, usuario_id
        )
        SELECT 
            p.id, 'entrada', p.stock_actual - NEW.cantidad, NEW.cantidad, 
            p.stock_actual, NEW.id, 'lote', 
            'Lote ' || NEW.codigo_lote || ' reactivado a disponible', 
            NEW.usuario_id
        FROM productos p 
        WHERE p.id = NEW.producto_id;
        
        RETURN NEW; -- CRÍTICO: Salir aquí para evitar ejecutar CASO 3
    END IF;
    
    -- CASO 3: Solo cambio de cantidad (ambos estados = disponible)
    -- Este caso SOLO se ejecuta si el estado NO cambió
    IF NEW.estado = 'disponible' AND OLD.estado = 'disponible' AND OLD.cantidad != NEW.cantidad THEN
        diferencia := NEW.cantidad - OLD.cantidad;
        
        UPDATE productos 
        SET stock_actual = stock_actual + diferencia 
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior, cantidad_movimiento,
            cantidad_nueva, referencia_id, referencia_tipo, observaciones, usuario_id
        )
        SELECT 
            p.id, 
            CASE WHEN diferencia > 0 THEN 'entrada' ELSE 'salida' END,
            p.stock_actual - diferencia, 
            ABS(diferencia), 
            p.stock_actual, 
            NEW.id, 'lote', 
            'Ajuste de cantidad en lote: ' || NEW.codigo_lote, 
            NEW.usuario_id
        FROM productos p 
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_stock_on_lote_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

-- 2.3 Al ELIMINAR un lote
CREATE OR REPLACE FUNCTION sync_stock_on_lote_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'disponible' THEN
        UPDATE productos SET stock_actual = stock_actual - OLD.cantidad WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (producto_id, tipo_movimiento, cantidad_anterior, cantidad_movimiento,
            cantidad_nueva, referencia_id, referencia_tipo, observaciones, usuario_id)
        SELECT p.id, 'salida', p.stock_actual + OLD.cantidad, OLD.cantidad, p.stock_actual, OLD.id,
            'lote', 'Eliminación de lote: ' || OLD.codigo_lote, OLD.usuario_id
        FROM productos p WHERE p.id = OLD.producto_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_stock_on_lote_delete
    BEFORE DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_delete();

-- ==========================================
-- 3. ÍNDICES DE RENDIMIENTO
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro ON auditoria(tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_referencia ON historial_inventario(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial_inventario(usuario_id);

-- ==========================================
-- FIN DE TRIGGERS ADICIONALES
-- ==========================================
