-- =====================================================
-- FUNCIONES Y TRIGGERS PARA AGROSHOP
-- =====================================================

-- 1. FUNCIÓN: Actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCIÓN: Generar código de producto automático
CREATE OR REPLACE FUNCTION generar_codigo_producto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL THEN
        NEW.codigo := 'PROD-' || LPAD(nextval('productos_id_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCIÓN: Sincronizar stock al insertar lote
CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
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

-- 4. FUNCIÓN: Sincronizar stock al actualizar lote
CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
DECLARE
    diferencia DECIMAL(10,2);
BEGIN
    -- Cambio de disponible a otro estado
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
    
    -- Cambio de otro estado a disponible
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
    
    -- Cambio de cantidad (solo si está disponible)
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

-- 5. FUNCIÓN: Sincronizar stock al eliminar lote
CREATE OR REPLACE FUNCTION sync_stock_on_lote_delete()
RETURNS TRIGGER AS $$
BEGIN
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

-- 6. FUNCIÓN: Sincronizar stock en ventas
CREATE OR REPLACE FUNCTION sync_stock_on_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lote_id IS NOT NULL THEN
        UPDATE lotes_productos
        SET cantidad = cantidad - NEW.cantidad
        WHERE id = NEW.lote_id;
    ELSE
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

-- 7. FUNCIÓN: Validar stock antes de venta
CREATE OR REPLACE FUNCTION validar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
    stock_disponible DECIMAL(10,2);
BEGIN
    SELECT stock_actual INTO stock_disponible
    FROM productos
    WHERE id = NEW.producto_id;
    
    IF stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %, Solicitado: %',
            NEW.producto_id, stock_disponible, NEW.cantidad;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCIÓN: Auditoría de lotes
CREATE OR REPLACE FUNCTION auditar_lotes_productos()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO auditoria_lotes (
            lote_id,
            accion,
            campo_modificado,
            valor_anterior,
            valor_nuevo,
            usuario_id,
            observaciones
        ) VALUES (
            NEW.id,
            'UPDATE',
            'estado/cantidad',
            row_to_json(OLD)::TEXT,
            row_to_json(NEW)::TEXT,
            current_setting('app.current_user_id', TRUE)::INTEGER,
            'Modificación de lote'
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO auditoria_lotes (
            lote_id,
            accion,
            campo_modificado,
            valor_anterior,
            observaciones
        ) VALUES (
            OLD.id,
            'DELETE',
            NULL,
            row_to_json(OLD)::TEXT,
            'Eliminación de lote'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Triggers updated_at
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_productos ON productos;
CREATE TRIGGER trigger_actualizar_updated_at_productos
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_lotes ON lotes_productos;
CREATE TRIGGER trigger_actualizar_updated_at_lotes
    BEFORE UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_clientes ON clientes;
CREATE TRIGGER trigger_actualizar_updated_at_clientes
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_proveedores ON proveedores;
CREATE TRIGGER trigger_actualizar_updated_at_proveedores
    BEFORE UPDATE ON proveedores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_usuarios ON usuarios;
CREATE TRIGGER trigger_actualizar_updated_at_usuarios
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_categorias ON categorias;
CREATE TRIGGER trigger_actualizar_updated_at_categorias
    BEFORE UPDATE ON categorias
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Triggers de sincronización de stock
DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON lotes_productos;
CREATE TRIGGER trigger_sync_stock_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();

DROP TRIGGER IF EXISTS trigger_sync_stock_update ON lotes_productos;
CREATE TRIGGER trigger_sync_stock_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

DROP TRIGGER IF EXISTS trigger_sync_stock_delete ON lotes_productos;
CREATE TRIGGER trigger_sync_stock_delete
    BEFORE DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_delete();

DROP TRIGGER IF EXISTS trigger_sync_stock_venta ON detalle_ventas;
CREATE TRIGGER trigger_sync_stock_venta
    AFTER INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_venta();

DROP TRIGGER IF EXISTS trigger_validar_stock_venta ON detalle_ventas;
CREATE TRIGGER trigger_validar_stock_venta
    BEFORE INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION validar_stock_venta();

-- Trigger de auditoría
DROP TRIGGER IF EXISTS trigger_auditoria_lotes ON lotes_productos;
CREATE TRIGGER trigger_auditoria_lotes
    AFTER UPDATE OR DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION auditar_lotes_productos();

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista: Productos con información completa
CREATE OR REPLACE VIEW vista_productos_completa AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.precio_unitario,
    p.precio_mayorista,
    p.stock_actual,
    p.stock_minimo,
    p.stock_maximo,
    p.imagen_url,
    p.es_perecedero,
    p.dias_vencimiento,
    p.activo,
    c.nombre as categoria_nombre,
    c.descripcion as categoria_descripcion,
    up.nombre as unidad_productiva_nombre,
    up.descripcion as unidad_productiva_descripcion,
    COUNT(DISTINCT l.id) as total_lotes,
    SUM(CASE WHEN l.estado = 'disponible' THEN l.cantidad ELSE 0 END) as stock_en_lotes,
    MIN(CASE WHEN l.estado = 'disponible' THEN l.fecha_vencimiento END) as proximo_vencimiento,
    p.created_at,
    p.updated_at
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN unidades_productivas up ON p.unidad_productiva_id = up.id
LEFT JOIN lotes_productos l ON p.id = l.producto_id
GROUP BY p.id, c.nombre, c.descripcion, up.nombre, up.descripcion;

-- Vista: Clientes frecuentes
CREATE OR REPLACE VIEW vista_clientes_frecuentes AS
SELECT 
    c.id,
    c.nombre,
    c.apellido,
    c.numero_documento,
    c.telefono,
    c.email,
    COUNT(v.id) as total_compras,
    SUM(v.total) as monto_total_comprado,
    MAX(v.fecha_venta) as ultima_compra,
    AVG(v.total) as promedio_compra
FROM clientes c
LEFT JOIN ventas v ON c.id = v.cliente_id
GROUP BY c.id
ORDER BY total_compras DESC;

-- Vista: Rentabilidad de productos
CREATE OR REPLACE VIEW vista_rentabilidad_productos AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.precio_unitario,
    COUNT(dv.id) as unidades_vendidas,
    SUM(dv.subtotal) as total_ventas
FROM productos p
LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
GROUP BY p.id
ORDER BY total_ventas DESC NULLS LAST;

-- Vista: Transferencias pendientes
CREATE OR REPLACE VIEW vista_transferencias_pendientes AS
SELECT 
    st.id,
    st.codigo_solicitud,
    st.fecha_solicitud,
    st.estado,
    st.observaciones,
    us.nombre as unidad_solicitante,
    up.nombre as unidad_proveedora,
    usu.nombre || ' ' || usu.apellido as solicitante,
    COUNT(dst.id) as cantidad_productos,
    st.fecha_respuesta
FROM solicitudes_transferencia st
LEFT JOIN unidades_productivas us ON st.unidad_solicitante_id = us.id
LEFT JOIN unidades_productivas up ON st.unidad_proveedora_id = up.id
LEFT JOIN usuarios usu ON st.usuario_solicitante_id = usu.id
LEFT JOIN detalle_solicitudes dst ON st.id = dst.solicitud_id
WHERE st.estado IN ('pendiente', 'aprobada', 'en_transito')
GROUP BY st.id, us.nombre, up.nombre, usu.nombre, usu.apellido
ORDER BY st.fecha_solicitud DESC;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION actualizar_updated_at() IS 'Actualiza automáticamente el campo updated_at';
COMMENT ON FUNCTION sync_stock_on_lote_insert() IS 'Sincroniza stock al crear lote';
COMMENT ON FUNCTION sync_stock_on_lote_update() IS 'Sincroniza stock al actualizar lote';
COMMENT ON FUNCTION sync_stock_on_lote_delete() IS 'Sincroniza stock al eliminar lote';
COMMENT ON FUNCTION sync_stock_on_venta() IS 'Descuenta stock al realizar venta';
COMMENT ON FUNCTION validar_stock_venta() IS 'Valida disponibilidad antes de vender';
COMMENT ON FUNCTION auditar_lotes_productos() IS 'Registra cambios en lotes';

COMMENT ON VIEW vista_productos_completa IS 'Información completa de productos con lotes';
COMMENT ON VIEW vista_clientes_frecuentes IS 'Ranking de clientes por frecuencia y monto';
COMMENT ON VIEW vista_rentabilidad_productos IS 'Análisis de rentabilidad por producto';
COMMENT ON VIEW vista_transferencias_pendientes IS 'Transferencias activas entre unidades productivas';
