-- Crear tabla de configuración si no existe
CREATE TABLE IF NOT EXISTS configuracion (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'string',
    descripcion TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar valores por defecto de configuración
INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES
    ('nombre_tienda', 'AgroShop SENA', 'string', 'Nombre de la tienda'),
    ('email_tienda', 'agroshop@sena.edu.co', 'string', 'Email de contacto'),
    ('telefono_tienda', '(601) 5461500', 'string', 'Teléfono de contacto'),
    ('direccion_tienda', 'SENA Centro Agropecuario', 'string', 'Dirección física'),
    ('ciudad_tienda', 'Bogotá', 'string', 'Ciudad'),
    ('iva_porcentaje', '19', 'number', 'Porcentaje de IVA aplicado'),
    ('stock_minimo_default', '10', 'number', 'Stock mínimo por defecto'),
    ('dias_alerta_vencimiento', '7', 'number', 'Días antes del vencimiento para alertar'),
    ('version_sistema', '1.0.0', 'string', 'Versión actual del sistema')
ON CONFLICT (clave) DO NOTHING;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON configuracion(clave);

COMMENT ON TABLE configuracion IS 'Variables globales del sistema';
COMMENT ON COLUMN configuracion.clave IS 'Identificador único de la configuración';
COMMENT ON COLUMN configuracion.valor IS 'Valor almacenado como texto';
COMMENT ON COLUMN configuracion.tipo IS 'Tipo de dato (string, number)';
COMMENT ON COLUMN configuracion.descripcion IS 'Descripción de la configuración';
