-- =====================================================
-- AGROSHOP - SISTEMA DE GESTIÓN AGROPECUARIO SENA
-- Base de Datos PostgreSQL
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLA: ROLES Y USUARIOS
-- =====================================================

-- Tabla de roles del sistema
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles predefinidos
INSERT INTO roles (nombre, descripcion, permisos) VALUES
('Admin', 'Acceso total al sistema', '{"all": true}'),
('Inventarista', 'Gestión de inventario y movimientos', '{"inventario": true, "movimientos": true}'),
('Cajero', 'Solo punto de venta', '{"pos": true, "ventas": true}'),
('Consulta', 'Solo lectura', '{"reportes": true, "consulta": true}');

-- Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: UNIDADES PRODUCTIVAS
-- =====================================================

CREATE TABLE unidades_productivas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50), -- Ej: Huerta, Granja, Panadería, Lácteos
    responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ubicacion VARCHAR(200),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar unidades productivas de ejemplo
INSERT INTO unidades_productivas (codigo, nombre, descripcion, tipo) VALUES
('UP-HUERTA', 'Huerta Orgánica', 'Producción de hortalizas y vegetales', 'Huerta'),
('UP-BOVINOS', 'Granja Bovina', 'Producción de lácteos y cárnicos bovinos', 'Granja'),
('UP-AVICOLA', 'Granja Avícola', 'Producción de huevos y carne de pollo', 'Granja'),
('UP-PORCINOS', 'Granja Porcina', 'Producción de carne de cerdo', 'Granja'),
('UP-PANADERIA', 'Panadería SENA', 'Producción de pan y productos de panadería', 'Panadería'),
('UP-LACTEOS', 'Planta de Lácteos', 'Procesamiento de leche y derivados', 'Procesamiento');

-- =====================================================
-- TABLA: CATEGORÍAS DE PRODUCTOS
-- =====================================================

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50), -- Nombre del icono para UI
    color VARCHAR(20), -- Color hex para UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías
INSERT INTO categorias (nombre, descripcion, icono, color) VALUES
('Hortalizas', 'Vegetales y verduras frescas', 'leaf', '#059669'),
('Lácteos', 'Leche y productos derivados', 'milk', '#3B82F6'),
('Panadería', 'Pan y productos horneados', 'croissant', '#F59E0B'),
('Cárnicos', 'Carnes y embutidos', 'beef', '#EF4444'),
('Huevos', 'Huevos frescos', 'egg', '#FBBF24'),
('Frutas', 'Frutas frescas', 'apple', '#EC4899'),
('Insumos', 'Insumos agrícolas y herramientas', 'package', '#6B7280'),
('Otros', 'Otros productos', 'shopping-bag', '#8B5CF6');

-- =====================================================
-- TABLA: PRODUCTOS
-- =====================================================

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL, -- Código de barras
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    unidad_productiva_id INTEGER REFERENCES unidades_productivas(id) ON DELETE SET NULL,
    
    -- Tipo de producto
    tipo_medida VARCHAR(20) NOT NULL, -- 'unidad', 'peso', 'volumen', 'lote'
    unidad VARCHAR(20), -- 'kg', 'litros', 'unidades', etc.
    
    -- Precios
    precio_unitario DECIMAL(10, 2) NOT NULL,
    precio_mayorista DECIMAL(10, 2),
    
    -- Inventario
    stock_actual DECIMAL(10, 2) DEFAULT 0,
    stock_minimo DECIMAL(10, 2) DEFAULT 0,
    stock_maximo DECIMAL(10, 2),
    
    -- Características del producto
    es_perecedero BOOLEAN DEFAULT false,
    dias_vencimiento INTEGER, -- Días hasta vencimiento desde producción
    
    -- Metadata
    imagen_url VARCHAR(500),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para búsqueda rápida
    CONSTRAINT chk_stock_positivo CHECK (stock_actual >= 0),
    CONSTRAINT chk_precio_positivo CHECK (precio_unitario > 0)
);

-- Índices para optimización
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_unidad ON productos(unidad_productiva_id);
CREATE INDEX idx_productos_activo ON productos(activo);

-- =====================================================
-- TABLA: LOTES DE PRODUCTOS (para perecederos)
-- =====================================================

CREATE TABLE lotes_productos (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    codigo_lote VARCHAR(50) UNIQUE NOT NULL,
    cantidad DECIMAL(10, 2) NOT NULL,
    fecha_produccion DATE NOT NULL,
    fecha_vencimiento DATE,
    unidad_productiva_id INTEGER REFERENCES unidades_productivas(id),
    estado VARCHAR(20) DEFAULT 'disponible', -- 'disponible', 'vendido', 'vencido', 'movido'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX idx_lotes_producto ON lotes_productos(producto_id);
CREATE INDEX idx_lotes_vencimiento ON lotes_productos(fecha_vencimiento);
CREATE INDEX idx_lotes_estado ON lotes_productos(estado);

-- =====================================================
-- TABLA: MOVIMIENTOS ENTRE UNIDADES PRODUCTIVAS
-- =====================================================

CREATE TABLE movimientos_unidades (
    id SERIAL PRIMARY KEY,
    codigo_movimiento VARCHAR(50) UNIQUE NOT NULL,
    unidad_origen_id INTEGER REFERENCES unidades_productivas(id),
    unidad_destino_id INTEGER REFERENCES unidades_productivas(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    estado VARCHAR(20) DEFAULT 'completado', -- 'pendiente', 'completado', 'cancelado'
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de movimientos
CREATE TABLE detalle_movimientos (
    id SERIAL PRIMARY KEY,
    movimiento_id INTEGER REFERENCES movimientos_unidades(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    lote_id INTEGER REFERENCES lotes_productos(id),
    cantidad DECIMAL(10, 2) NOT NULL,
    unidad VARCHAR(20),
    
    CONSTRAINT chk_cantidad_movimiento CHECK (cantidad > 0)
);

CREATE INDEX idx_movimientos_origen ON movimientos_unidades(unidad_origen_id);
CREATE INDEX idx_movimientos_destino ON movimientos_unidades(unidad_destino_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_unidades(fecha_movimiento);

-- =====================================================
-- TABLA: VENTAS
-- =====================================================

CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    codigo_venta VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id), -- Cajero que realizó la venta
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Totales
    subtotal DECIMAL(10, 2) NOT NULL,
    impuesto DECIMAL(10, 2) DEFAULT 0, -- IVA 19%
    descuento DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Cliente (opcional)
    cliente_nombre VARCHAR(150),
    cliente_email VARCHAR(150),
    cliente_telefono VARCHAR(20),
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'completada', -- 'completada', 'cancelada', 'pendiente'
    
    -- Facturación
    requiere_factura BOOLEAN DEFAULT false,
    factura_generada BOOLEAN DEFAULT false,
    factura_url VARCHAR(500),
    
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_total_positivo CHECK (total >= 0)
);

-- Detalle de ventas
CREATE TABLE detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    lote_id INTEGER REFERENCES lotes_productos(id),
    cantidad DECIMAL(10, 2) NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    
    CONSTRAINT chk_cantidad_venta CHECK (cantidad > 0),
    CONSTRAINT chk_precio_venta CHECK (precio_unitario > 0)
);

CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_estado ON ventas(estado);

-- =====================================================
-- TABLA: MÉTODOS DE PAGO
-- =====================================================

CREATE TABLE metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    icono VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar métodos de pago
INSERT INTO metodos_pago (nombre, descripcion, icono) VALUES
('Efectivo', 'Pago en efectivo', 'banknote'),
('Nequi', 'Pago por Nequi', 'smartphone'),
('Tarjeta', 'Pago con tarjeta débito/crédito', 'credit-card'),
('Transferencia', 'Transferencia bancaria', 'arrow-right-left');

-- Tabla de pagos por venta (puede haber múltiples métodos en una venta)
CREATE TABLE pagos_venta (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    metodo_pago_id INTEGER REFERENCES metodos_pago(id),
    monto DECIMAL(10, 2) NOT NULL,
    referencia VARCHAR(100), -- Número de transacción, referencia Nequi, etc.
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);

CREATE INDEX idx_pagos_venta ON pagos_venta(venta_id);
CREATE INDEX idx_pagos_metodo ON pagos_venta(metodo_pago_id);

-- =====================================================
-- TABLA: HISTORIAL DE INVENTARIO (Auditoría)
-- =====================================================

CREATE TABLE historial_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(30) NOT NULL, -- 'entrada', 'salida', 'ajuste', 'venta', 'transferencia'
    cantidad_anterior DECIMAL(10, 2),
    cantidad_movimiento DECIMAL(10, 2) NOT NULL,
    cantidad_nueva DECIMAL(10, 2),
    usuario_id INTEGER REFERENCES usuarios(id),
    referencia_id INTEGER, -- ID de la venta, movimiento, etc.
    referencia_tipo VARCHAR(30), -- 'venta', 'movimiento', 'ajuste'
    observaciones TEXT,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historial_producto ON historial_inventario(producto_id);
CREATE INDEX idx_historial_fecha ON historial_inventario(fecha_movimiento);
CREATE INDEX idx_historial_tipo ON historial_inventario(tipo_movimiento);

-- =====================================================
-- TABLA: CONFIGURACIÓN DEL SISTEMA
-- =====================================================

CREATE TABLE configuracion (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(20), -- 'string', 'number', 'boolean', 'json'
    descripcion TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuraciones iniciales
INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES
('iva_porcentaje', '19', 'number', 'Porcentaje de IVA aplicado a las ventas'),
('stock_bajo_umbral', '10', 'number', 'Cantidad mínima para alertar stock bajo'),
('dias_alerta_vencimiento', '7', 'number', 'Días antes del vencimiento para alertar'),
('nombre_tienda', 'AgroShop SENA', 'string', 'Nombre de la tienda'),
('email_tienda', 'agroshop@sena.edu.co', 'string', 'Email de contacto'),
('telefono_tienda', '(601) 5461500', 'string', 'Teléfono de contacto');

-- =====================================================
-- TABLA: NOTIFICACIONES DEL SISTEMA
-- =====================================================

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL, -- 'stock_bajo', 'vencimiento_proximo', 'venta', 'movimiento'
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'normal', -- 'baja', 'normal', 'alta', 'urgente'
    leida BOOLEAN DEFAULT false,
    usuario_id INTEGER REFERENCES usuarios(id),
    referencia_id INTEGER,
    referencia_tipo VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_fecha ON notificaciones(created_at);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de productos con información completa
CREATE VIEW vista_productos_completa AS
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

-- Vista de ventas con totales por día
CREATE VIEW vista_ventas_diarias AS
SELECT 
    DATE(fecha_venta) AS fecha,
    COUNT(*) AS total_ventas,
    SUM(total) AS monto_total,
    AVG(total) AS ticket_promedio
FROM ventas
WHERE estado = 'completada'
GROUP BY DATE(fecha_venta)
ORDER BY fecha DESC;

-- Vista de productos próximos a vencer
CREATE VIEW vista_productos_vencimiento AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    l.codigo_lote,
    l.cantidad,
    l.fecha_vencimiento,
    l.fecha_vencimiento - CURRENT_DATE AS dias_restantes,
    up.nombre AS unidad_productiva
FROM lotes_productos l
JOIN productos p ON l.producto_id = p.id
JOIN unidades_productivas up ON l.unidad_productiva_id = up.id
WHERE l.estado = 'disponible'
  AND l.fecha_vencimiento IS NOT NULL
  AND l.fecha_vencimiento > CURRENT_DATE
ORDER BY l.fecha_vencimiento ASC;

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER trigger_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_unidades_updated_at
    BEFORE UPDATE ON unidades_productivas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Función para registrar movimientos de inventario
CREATE OR REPLACE FUNCTION registrar_movimiento_inventario()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stock_actual IS DISTINCT FROM NEW.stock_actual THEN
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            observaciones
        ) VALUES (
            NEW.id,
            'ajuste',
            OLD.stock_actual,
            NEW.stock_actual - OLD.stock_actual,
            NEW.stock_actual,
            'Actualización automática de stock'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventario_cambio
    AFTER UPDATE ON productos
    FOR EACH ROW
    WHEN (OLD.stock_actual IS DISTINCT FROM NEW.stock_actual)
    EXECUTE FUNCTION registrar_movimiento_inventario();

-- Función para generar código de producto automático
CREATE OR REPLACE FUNCTION generar_codigo_producto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        NEW.codigo := 'PROD-' || LPAD(NEXTVAL('productos_id_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_producto
    BEFORE INSERT ON productos
    FOR EACH ROW
    EXECUTE FUNCTION generar_codigo_producto();

-- =====================================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- =====================================================

-- Índices para búsquedas de texto
CREATE INDEX idx_productos_nombre ON productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX idx_productos_descripcion ON productos USING gin(to_tsvector('spanish', descripcion));

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================

COMMENT ON TABLE productos IS 'Catálogo de productos del sistema AgroShop';
COMMENT ON TABLE ventas IS 'Registro de todas las ventas realizadas';
COMMENT ON TABLE movimientos_unidades IS 'Transferencias de productos entre unidades productivas';
COMMENT ON TABLE historial_inventario IS 'Auditoría de todos los movimientos de inventario';
COMMENT ON TABLE usuarios IS 'Usuarios del sistema con roles y permisos';
COMMENT ON TABLE unidades_productivas IS 'Unidades productivas del SENA (Huerta, Granja, etc.)';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
