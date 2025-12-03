-- =====================================================
-- AGROSHOP - TRIGGERS Y VISTAS
-- Migración personalizada para funcionalidad avanzada
-- =====================================================

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de producto automáticamente
CREATE OR REPLACE FUNCTION generar_codigo_producto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        NEW.codigo := 'PROD-' || LPAD(NEXTVAL('productos_id_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de turno automáticamente
CREATE OR REPLACE FUNCTION generar_numero_turno()
RETURNS TRIGGER AS $$
BEGIN
    SELECT COALESCE(MAX(numero_turno), 0) + 1
    INTO NEW.numero_turno
    FROM turnos
    WHERE fecha = CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIONES DE SINCRONIZACIÓN DE STOCK CON LOTES
-- =====================================================

-- Función: Sincronizar stock al INSERTAR un lote
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Sincronizar stock al ACTUALIZAR un lote
CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso 1: Cambio de disponible a otro estado
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
        
    -- Caso 2: Cambio de otro estado a disponible
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
        
    -- Caso 3: Cambio de cantidad en estado disponible
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

-- Función: Sincronizar stock al ELIMINAR un lote
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

-- =====================================================
-- FUNCIONES DE VENTAS
-- =====================================================

-- Función: Validar stock antes de venta
CREATE OR REPLACE FUNCTION validar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
    stock_disponible DECIMAL(10, 2);
BEGIN
    SELECT stock_actual INTO stock_disponible
    FROM productos
    WHERE id = NEW.producto_id;
    
    IF stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID %. Disponible: %, Solicitado: %', 
            NEW.producto_id, stock_disponible, NEW.cantidad;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Sincronizar stock en venta
CREATE OR REPLACE FUNCTION sync_stock_on_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lote_id IS NOT NULL THEN
        -- Descontar del lote
        UPDATE lotes_productos
        SET cantidad = cantidad - NEW.cantidad
        WHERE id = NEW.lote_id;
    ELSE
        -- Descontar directo del producto
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

COMMENT ON FUNCTION sync_stock_on_venta() IS 'Descuenta del lote al vender. Si no hay lote_id, descuenta directo del producto.';

-- Función: Actualizar total de compras del cliente
CREATE OR REPLACE FUNCTION actualizar_total_compras_cliente()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cliente_id IS NOT NULL THEN
        UPDATE clientes
        SET 
            total_compras = total_compras + NEW.total,
            ultima_compra = NEW.fecha_venta
        WHERE id = NEW.cliente_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN DE AUDITORÍA
-- =====================================================

CREATE OR REPLACE FUNCTION auditar_lotes_productos()
RETURNS TRIGGER AS $$
DECLARE
    v_accion VARCHAR(20);
    v_datos_anteriores JSONB;
    v_datos_nuevos JSONB;
BEGIN
    -- Determinar el tipo de acción
    IF (TG_OP = 'INSERT') THEN
        v_accion := 'INSERT';
        v_datos_anteriores := NULL;
        v_datos_nuevos := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_accion := 'UPDATE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_accion := 'DELETE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := NULL;
    END IF;

    -- Insertar registro de auditoría
    INSERT INTO auditoria (
        tabla,
        registro_id,
        accion,
        datos_anteriores,
        datos_nuevos,
        fecha
    ) VALUES (
        'lotes_productos',
        COALESCE(NEW.id, OLD.id),
        v_accion,
        v_datos_anteriores,
        v_datos_nuevos,
        NOW()
    );

    -- Retornar el registro apropiado según la operación
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auditar_lotes_productos() IS 'Función para registrar cambios en lotes_productos en la tabla auditoria';

-- =====================================================
-- CREAR TRIGGERS
-- =====================================================

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_clientes_updated_at ON clientes;
CREATE TRIGGER trigger_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_productos_updated_at ON productos;
CREATE TRIGGER trigger_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_proveedores_updated_at ON proveedores;
CREATE TRIGGER trigger_proveedores_updated_at
    BEFORE UPDATE ON proveedores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_usuarios_updated_at ON usuarios;
CREATE TRIGGER trigger_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_unidades_updated_at ON unidades_productivas;
CREATE TRIGGER trigger_unidades_updated_at
    BEFORE UPDATE ON unidades_productivas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_configuracion_updated_at ON configuracion;
CREATE TRIGGER trigger_configuracion_updated_at
    BEFORE UPDATE ON configuracion
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Triggers para generación automática
DROP TRIGGER IF EXISTS trigger_generar_codigo_producto ON productos;
CREATE TRIGGER trigger_generar_codigo_producto
    BEFORE INSERT ON productos
    FOR EACH ROW
    EXECUTE FUNCTION generar_codigo_producto();

DROP TRIGGER IF EXISTS trigger_generar_numero_turno ON turnos;
CREATE TRIGGER trigger_generar_numero_turno
    BEFORE INSERT ON turnos
    FOR EACH ROW
    WHEN (NEW.numero_turno IS NULL)
    EXECUTE FUNCTION generar_numero_turno();

-- Triggers de sincronización de stock con lotes
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
    AFTER DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_delete();

-- Triggers de ventas
DROP TRIGGER IF EXISTS trigger_validar_stock_venta ON detalle_ventas;
CREATE TRIGGER trigger_validar_stock_venta
    BEFORE INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION validar_stock_venta();

DROP TRIGGER IF EXISTS trigger_sync_stock_venta ON detalle_ventas;
CREATE TRIGGER trigger_sync_stock_venta
    AFTER INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_venta();

DROP TRIGGER IF EXISTS trigger_actualizar_compras_cliente ON ventas;
CREATE TRIGGER trigger_actualizar_compras_cliente
    AFTER INSERT ON ventas
    FOR EACH ROW
    WHEN (NEW.estado = 'completada')
    EXECUTE FUNCTION actualizar_total_compras_cliente();

-- Trigger de auditoría para lotes
DROP TRIGGER IF EXISTS trigger_auditoria_lotes_productos ON lotes_productos;
CREATE TRIGGER trigger_auditoria_lotes_productos
    AFTER INSERT OR UPDATE OR DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION auditar_lotes_productos();

COMMENT ON TRIGGER trigger_auditoria_lotes_productos ON lotes_productos IS 'Registra automáticamente INSERT, UPDATE y DELETE en auditoria';

-- =====================================================
-- CREAR VISTAS
-- =====================================================

-- Vista: Productos con información completa
CREATE OR REPLACE VIEW vista_productos_completa AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.tipo_medida,
    p.unidad,
    p.precio_unitario,
    p.stock_actual,
    p.stock_minimo,
    p.es_perecedero,
    c.nombre AS categoria,
    c.color AS categoria_color,
    up.nombre AS unidad_productiva,
    up.codigo AS unidad_productiva_codigo,
    CASE
        WHEN p.stock_actual = 0 THEN 'agotado'
        WHEN p.stock_actual <= p.stock_minimo THEN 'bajo_stock'
        ELSE 'disponible'
    END AS estado_stock,
    p.activo,
    p.created_at,
    p.updated_at
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN unidades_productivas up ON p.unidad_productiva_id = up.id;

-- Vista: Clientes frecuentes
CREATE OR REPLACE VIEW vista_clientes_frecuentes AS
SELECT 
    c.id,
    c.nombre,
    c.apellido,
    c.email,
    c.telefono,
    c.tipo_cliente,
    c.total_compras,
    COUNT(v.id) AS total_transacciones,
    c.ultima_compra,
    CASE
        WHEN c.ultima_compra >= CURRENT_DATE - INTERVAL '30 days' THEN 'activo'
        WHEN c.ultima_compra >= CURRENT_DATE - INTERVAL '90 days' THEN 'regular'
        ELSE 'inactivo'
    END AS estado_cliente
FROM clientes c
LEFT JOIN ventas v ON c.id = v.cliente_id
GROUP BY c.id, c.nombre, c.apellido, c.email, c.telefono, c.tipo_cliente, c.total_compras, c.ultima_compra
ORDER BY c.total_compras DESC;

-- Vista: Rentabilidad de productos
CREATE OR REPLACE VIEW vista_rentabilidad_productos AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.precio_unitario,
    COALESCE(AVG(cp.costo_unitario), 0) AS costo_promedio,
    (p.precio_unitario - COALESCE(AVG(cp.costo_unitario), 0)) AS margen_bruto,
    CASE
        WHEN COALESCE(AVG(cp.costo_unitario), 0) > 0 THEN
            ((p.precio_unitario - COALESCE(AVG(cp.costo_unitario), 0)) / COALESCE(AVG(cp.costo_unitario), 0) * 100)
        ELSE 0
    END AS margen_porcentaje
FROM productos p
LEFT JOIN costos_produccion cp ON p.id = cp.producto_id
GROUP BY p.id, p.codigo, p.nombre, p.precio_unitario;

-- Vista: Solicitudes pendientes
CREATE OR REPLACE VIEW vista_solicitudes_pendientes AS
SELECT 
    st.id,
    st.codigo_solicitud,
    up_sol.nombre AS unidad_solicitante,
    up_prov.nombre AS unidad_proveedora,
    (u.nombre || ' ' || u.apellido) AS solicitante,
    st.fecha_solicitud,
    COUNT(ds.id) AS total_productos,
    SUM(ds.cantidad_solicitada) AS cantidad_total,
    st.observaciones
FROM solicitudes_transferencia st
JOIN unidades_productivas up_sol ON st.unidad_solicitante_id = up_sol.id
JOIN unidades_productivas up_prov ON st.unidad_proveedora_id = up_prov.id
JOIN usuarios u ON st.usuario_solicitante_id = u.id
LEFT JOIN detalle_solicitudes ds ON st.id = ds.solicitud_id
WHERE st.estado = 'pendiente'
GROUP BY st.id, st.codigo_solicitud, up_sol.nombre, up_prov.nombre, u.nombre, u.apellido, st.fecha_solicitud, st.observaciones
ORDER BY st.fecha_solicitud;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
