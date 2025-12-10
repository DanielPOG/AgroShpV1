-- =====================================================
-- CORRECCIÓN DE TRIGGER: EVITAR STOCK NEGATIVO
-- Fecha: 10 de Diciembre 2025
-- Problema: El trigger puede restar stock aunque cantidad = 0
-- =====================================================

-- Reemplazar trigger de actualización de lotes para blindar contra stock negativo
CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
DECLARE
    diferencia DECIMAL(10,2);
    cantidad_a_restar DECIMAL(10,2);
    stock_actual_producto DECIMAL(10,2);
    nombre_producto VARCHAR(255);
BEGIN
    -- CASO 1: Cambio de estado disponible → vencido/retirado/agotado
    IF OLD.estado = 'disponible' AND NEW.estado != 'disponible' THEN
        
        -- ⚠️ CRÍTICO: Solo restar si el lote tiene cantidad > 0
        -- Si cantidad = 0, significa que ya se vendió todo y el stock ya se descontó
        IF NEW.cantidad > 0 THEN
            cantidad_a_restar := NEW.cantidad;
            
            -- Obtener stock actual y nombre del producto para logs
            SELECT stock_actual, nombre INTO stock_actual_producto, nombre_producto
            FROM productos WHERE id = OLD.producto_id;
            
            -- ⚠️ PROTECCIÓN: Evitar que el stock quede negativo
            -- Si el stock actual es menor que la cantidad a restar, algo está mal
            IF stock_actual_producto < cantidad_a_restar THEN
                RAISE WARNING 'ALERTA: Stock insuficiente para restar. Producto: %, Stock actual: %, Intentando restar: %. Se ajustará a 0.',
                    nombre_producto, stock_actual_producto, cantidad_a_restar;
                
                -- Ajustar el stock a 0 en lugar de dejarlo negativo
                UPDATE productos 
                SET stock_actual = 0
                WHERE id = OLD.producto_id;
                
                cantidad_a_restar := stock_actual_producto; -- Para el historial
            ELSE
                -- Stock suficiente, restar normalmente
                UPDATE productos 
                SET stock_actual = stock_actual - cantidad_a_restar 
                WHERE id = OLD.producto_id;
            END IF;
            
            -- Log en consola del servidor
            RAISE NOTICE '📉 TRIGGER: % cambió de disponible → %. Stock: % → % (-% unidades)',
                nombre_producto, NEW.estado, 
                stock_actual_producto, 
                (stock_actual_producto - cantidad_a_restar),
                cantidad_a_restar;
            
            -- Crear registro en historial
            INSERT INTO historial_inventario (
                producto_id, tipo_movimiento, cantidad_anterior, cantidad_movimiento,
                cantidad_nueva, referencia_id, referencia_tipo, observaciones, usuario_id
            )
            SELECT 
                p.id, 'salida', 
                stock_actual_producto, 
                cantidad_a_restar, 
                p.stock_actual, 
                NEW.id, 'lote', 
                'Lote ' || NEW.codigo_lote || ' cambió a estado: ' || NEW.estado || 
                ' (Trigger SQL - cantidad lote: ' || NEW.cantidad || ')', 
                NEW.usuario_id
            FROM productos p 
            WHERE p.id = OLD.producto_id;
        ELSE
            -- Cantidad = 0, no hacer nada (stock ya se descontó en venta)
            RAISE NOTICE '✅ TRIGGER: Lote % cambió a % pero cantidad=0. Stock ya descontado previamente.',
                NEW.codigo_lote, NEW.estado;
        END IF;
        
        RETURN NEW; -- CRÍTICO: Salir aquí para evitar ejecutar CASO 3
    END IF;
    
    -- CASO 2: Cambio de vencido/retirado/agotado → disponible (reactivación)
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
            'Lote ' || NEW.codigo_lote || ' reactivado a disponible (Trigger SQL)', 
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
            'Ajuste de cantidad en lote: ' || NEW.codigo_lote || ' (Trigger SQL)', 
            NEW.usuario_id
        FROM productos p 
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger anterior si existe y crear el nuevo
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_update ON lotes_productos;

CREATE TRIGGER trg_sync_stock_on_lote_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Conectar a la base de datos de producción
-- 2. Ejecutar este script completo
-- 3. Verificar que el trigger se actualizó:
--    SELECT tgname, proname FROM pg_trigger t
--    JOIN pg_proc p ON t.tgfoid = p.oid
--    WHERE tgname = 'trg_sync_stock_on_lote_update';
-- =====================================================
