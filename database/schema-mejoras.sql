-- =====================================================
-- AGROSHOP - MEJORAS AL SCHEMA ORIGINAL
-- Ejecutar DESPUÉS del schema.sql principal
-- =====================================================

-- =====================================================
-- TABLA: CLIENTES
-- =====================================================

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    tipo_cliente VARCHAR(20) DEFAULT 'ocasional', -- 'ocasional', 'frecuente', 'institucional'
    tipo_documento VARCHAR(20), -- 'CC', 'NIT', 'CE', 'TI'
    numero_documento VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    apellido VARCHAR(150),
    email VARCHAR(150),
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    
    -- Para clientes institucionales (otras dependencias SENA)
    es_institucional BOOLEAN DEFAULT false,
    dependencia VARCHAR(200),
    
    -- Estadísticas
    total_compras DECIMAL(10, 2) DEFAULT 0,
    ultima_compra TIMESTAMP,
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modificar tabla ventas para referenciar clientes
ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id);

-- Índices
CREATE INDEX idx_clientes_documento ON clientes(numero_documento);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_tipo ON clientes(tipo_cliente);

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =====================================================
-- TABLA: DESCUENTOS
-- =====================================================

CREATE TABLE descuentos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL, -- 'porcentaje', 'monto_fijo', 'por_cantidad'
    valor DECIMAL(10, 2) NOT NULL,
    
    -- Condiciones
    minimo_compra DECIMAL(10, 2),
    maximo_descuento DECIMAL(10, 2),
    aplica_a VARCHAR(20), -- 'todos', 'categoria', 'producto'
    categoria_id INTEGER REFERENCES categorias(id),
    producto_id INTEGER REFERENCES productos(id),
    
    -- Restricciones de uso
    usos_maximos INTEGER,
    usos_actuales INTEGER DEFAULT 0,
    fecha_inicio DATE,
    fecha_fin DATE,
    
    -- Restricciones de usuario
    solo_aprendices BOOLEAN DEFAULT false,
    solo_empleados BOOLEAN DEFAULT false,
    solo_institucional BOOLEAN DEFAULT false,
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_descuento_tipo CHECK (tipo IN ('porcentaje', 'monto_fijo', 'por_cantidad')),
    CONSTRAINT chk_descuento_valor CHECK (valor > 0)
);

-- Tabla para aplicar descuentos a ventas
CREATE TABLE descuentos_aplicados (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    descuento_id INTEGER REFERENCES descuentos(id),
    monto_descuento DECIMAL(10, 2) NOT NULL,
    aplicado_por INTEGER REFERENCES usuarios(id),
    fecha_aplicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_monto_descuento CHECK (monto_descuento >= 0)
);

-- Índices
CREATE INDEX idx_descuentos_codigo ON descuentos(codigo);
CREATE INDEX idx_descuentos_activo ON descuentos(activo);
CREATE INDEX idx_descuentos_aplicados_venta ON descuentos_aplicados(venta_id);

-- =====================================================
-- TABLA: PROVEEDORES
-- =====================================================

CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    nit VARCHAR(50),
    contacto_nombre VARCHAR(150),
    contacto_email VARCHAR(150),
    contacto_telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    tipo_productos TEXT[], -- Array de tipos de productos que provee
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar campos a productos para rastrear origen
ALTER TABLE productos ADD COLUMN proveedor_id INTEGER REFERENCES proveedores(id);
ALTER TABLE productos ADD COLUMN es_produccion_propia BOOLEAN DEFAULT true;

-- Índices
CREATE INDEX idx_proveedores_codigo ON proveedores(codigo);
CREATE INDEX idx_proveedores_activo ON proveedores(activo);

-- Trigger
CREATE TRIGGER trigger_proveedores_updated_at
    BEFORE UPDATE ON proveedores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =====================================================
-- TABLA: AUDITORÍA COMPLETA
-- =====================================================

CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    registro_id INTEGER NOT NULL,
    accion VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    usuario_id INTEGER REFERENCES usuarios(id),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX idx_auditoria_registro ON auditoria(registro_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX idx_auditoria_accion ON auditoria(accion);

-- =====================================================
-- TABLA: COSTOS DE PRODUCCIÓN
-- =====================================================

CREATE TABLE costos_produccion (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes_productos(id),
    
    -- Costos detallados
    costo_materia_prima DECIMAL(10, 2) DEFAULT 0,
    costo_mano_obra DECIMAL(10, 2) DEFAULT 0,
    costo_insumos DECIMAL(10, 2) DEFAULT 0,
    costo_energia DECIMAL(10, 2) DEFAULT 0,
    otros_costos DECIMAL(10, 2) DEFAULT 0,
    
    -- Costo total calculado automáticamente
    costo_total DECIMAL(10, 2) GENERATED ALWAYS AS (
        costo_materia_prima + costo_mano_obra + costo_insumos + costo_energia + otros_costos
    ) STORED,
    
    cantidad_producida DECIMAL(10, 2) NOT NULL,
    
    -- Costo unitario calculado automáticamente
    costo_unitario DECIMAL(10, 2) GENERATED ALWAYS AS (
        (costo_materia_prima + costo_mano_obra + costo_insumos + costo_energia + otros_costos) / NULLIF(cantidad_producida, 0)
    ) STORED,
    
    fecha_registro DATE DEFAULT CURRENT_DATE,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_cantidad_producida CHECK (cantidad_producida > 0)
);

-- Índices
CREATE INDEX idx_costos_producto ON costos_produccion(producto_id);
CREATE INDEX idx_costos_lote ON costos_produccion(lote_id);
CREATE INDEX idx_costos_fecha ON costos_produccion(fecha_registro);

-- =====================================================
-- TABLA: SOLICITUDES DE TRANSFERENCIA
-- =====================================================

CREATE TABLE solicitudes_transferencia (
    id SERIAL PRIMARY KEY,
    codigo_solicitud VARCHAR(50) UNIQUE NOT NULL,
    unidad_solicitante_id INTEGER REFERENCES unidades_productivas(id),
    unidad_proveedora_id INTEGER REFERENCES unidades_productivas(id),
    usuario_solicitante_id INTEGER REFERENCES usuarios(id),
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'aprobada', 'rechazada', 'completada'
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta TIMESTAMP,
    usuario_respuesta_id INTEGER REFERENCES usuarios(id),
    observaciones TEXT,
    motivo_rechazo TEXT,
    
    CONSTRAINT chk_unidades_diferentes CHECK (unidad_solicitante_id != unidad_proveedora_id)
);

CREATE TABLE detalle_solicitudes (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes_transferencia(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad_solicitada DECIMAL(10, 2) NOT NULL,
    cantidad_aprobada DECIMAL(10, 2),
    observaciones TEXT,
    
    CONSTRAINT chk_cantidad_solicitada CHECK (cantidad_solicitada > 0)
);

-- Índices
CREATE INDEX idx_solicitudes_estado ON solicitudes_transferencia(estado);
CREATE INDEX idx_solicitudes_solicitante ON solicitudes_transferencia(unidad_solicitante_id);
CREATE INDEX idx_solicitudes_proveedora ON solicitudes_transferencia(unidad_proveedora_id);
CREATE INDEX idx_solicitudes_fecha ON solicitudes_transferencia(fecha_solicitud);

-- =====================================================
-- TABLA: TURNOS (para gestión de cola en POS)
-- =====================================================

CREATE TABLE turnos (
    id SERIAL PRIMARY KEY,
    numero_turno INTEGER NOT NULL,
    cliente_nombre VARCHAR(150),
    cliente_id INTEGER REFERENCES clientes(id),
    estado VARCHAR(20) DEFAULT 'esperando', -- 'esperando', 'atendiendo', 'completado', 'cancelado'
    cajero_id INTEGER REFERENCES usuarios(id),
    fecha DATE DEFAULT CURRENT_DATE,
    hora_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hora_atencion TIMESTAMP,
    hora_finalizacion TIMESTAMP,
    
    UNIQUE(numero_turno, fecha)
);

-- Índices
CREATE INDEX idx_turnos_fecha ON turnos(fecha);
CREATE INDEX idx_turnos_estado ON turnos(estado);
CREATE INDEX idx_turnos_cajero ON turnos(cajero_id);

-- =====================================================
-- VISTAS ADICIONALES
-- =====================================================

-- Vista de rentabilidad por producto
CREATE VIEW vista_rentabilidad_productos AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.precio_unitario,
    COALESCE(AVG(cp.costo_unitario), 0) AS costo_promedio,
    p.precio_unitario - COALESCE(AVG(cp.costo_unitario), 0) AS margen_bruto,
    CASE 
        WHEN COALESCE(AVG(cp.costo_unitario), 0) > 0 
        THEN ((p.precio_unitario - COALESCE(AVG(cp.costo_unitario), 0)) / COALESCE(AVG(cp.costo_unitario), 0)) * 100
        ELSE 0
    END AS margen_porcentaje
FROM productos p
LEFT JOIN costos_produccion cp ON p.id = cp.producto_id
GROUP BY p.id, p.codigo, p.nombre, p.precio_unitario;

-- Vista de clientes frecuentes
CREATE VIEW vista_clientes_frecuentes AS
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

-- Vista de solicitudes pendientes
CREATE VIEW vista_solicitudes_pendientes AS
SELECT 
    st.id,
    st.codigo_solicitud,
    up_sol.nombre AS unidad_solicitante,
    up_prov.nombre AS unidad_proveedora,
    u.nombre || ' ' || u.apellido AS solicitante,
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
ORDER BY st.fecha_solicitud ASC;

-- =====================================================
-- FUNCIONES ADICIONALES
-- =====================================================

-- Función para actualizar total de compras del cliente
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

CREATE TRIGGER trigger_actualizar_compras_cliente
    AFTER INSERT ON ventas
    FOR EACH ROW
    WHEN (NEW.estado = 'completada')
    EXECUTE FUNCTION actualizar_total_compras_cliente();

-- Función para validar stock antes de venta
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

CREATE TRIGGER trigger_validar_stock_venta
    BEFORE INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION validar_stock_venta();

-- Función para actualizar stock después de venta
CREATE OR REPLACE FUNCTION actualizar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad
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
        NEW.producto_id,
        'venta',
        stock_actual + NEW.cantidad,
        -NEW.cantidad,
        stock_actual,
        NEW.venta_id,
        'venta',
        'Venta automática'
    FROM productos
    WHERE id = NEW.producto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_stock_venta
    AFTER INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_venta();

-- Función para generar número de turno
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

CREATE TRIGGER trigger_generar_numero_turno
    BEFORE INSERT ON turnos
    FOR EACH ROW
    WHEN (NEW.numero_turno IS NULL)
    EXECUTE FUNCTION generar_numero_turno();

-- =====================================================
-- DATOS INICIALES ADICIONALES
-- =====================================================

-- Insertar descuentos de ejemplo
INSERT INTO descuentos (codigo, nombre, descripcion, tipo, valor, minimo_compra, solo_aprendices, activo) VALUES
('APRENDIZ10', 'Descuento Aprendices', 'Descuento del 10% para aprendices SENA', 'porcentaje', 10, 0, true, true),
('EMPLEADO15', 'Descuento Empleados', 'Descuento del 15% para empleados SENA', 'porcentaje', 15, 0, true, true),
('MAYORISTA', 'Descuento Mayorista', 'Descuento por compra mayor a $100,000', 'porcentaje', 5, 100000, false, true);

-- Insertar cliente de ejemplo
INSERT INTO clientes (tipo_cliente, tipo_documento, numero_documento, nombre, apellido, email, telefono, es_institucional) VALUES
('ocasional', 'CC', '1234567890', 'Cliente', 'General', 'cliente@example.com', '3001234567', false),
('institucional', 'NIT', '900123456', 'SENA Regional', '', 'regional@sena.edu.co', '6015461500', true);

-- =====================================================
-- COMENTARIOS EN NUEVAS TABLAS
-- =====================================================

COMMENT ON TABLE clientes IS 'Registro de clientes del sistema AgroShop';
COMMENT ON TABLE descuentos IS 'Descuentos y promociones aplicables a ventas';
COMMENT ON TABLE proveedores IS 'Proveedores de insumos externos (futuro)';
COMMENT ON TABLE auditoria IS 'Auditoría completa de todas las operaciones del sistema';
COMMENT ON TABLE costos_produccion IS 'Costos de producción para análisis de rentabilidad';
COMMENT ON TABLE solicitudes_transferencia IS 'Solicitudes de transferencia entre unidades productivas';
COMMENT ON TABLE turnos IS 'Sistema de turnos para gestión de cola en POS';

-- =====================================================
-- FIN DE MEJORAS
-- =====================================================
