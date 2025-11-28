-- =====================================================
-- AGROSHOP - ACTUALIZACIÓN DE CONFIGURACIONES
-- Ejecutar DESPUÉS de schema.sql
-- =====================================================
-- Este script mejora la tabla de configuraciones
-- =====================================================

-- =====================================================
-- LIMPIAR CONFIGURACIÓN ANTIGUA (si ya existe)
-- =====================================================

-- Eliminar configuración ambigua
DELETE FROM configuracion WHERE clave = 'stock_bajo_umbral';

-- =====================================================
-- INSERTAR CONFIGURACIONES MEJORADAS
-- =====================================================

-- Configuraciones del Sistema (EDITABLES desde panel de admin)
INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES

-- ===== INFORMACIÓN DE LA TIENDA =====
('nombre_tienda', 'AgroShop SENA', 'string', 'Nombre de la tienda'),
('email_tienda', 'agroshop@sena.edu.co', 'string', 'Email de contacto'),
('telefono_tienda', '(601) 5461500', 'string', 'Teléfono de contacto'),
('direccion_tienda', 'SENA Centro Agropecuario', 'string', 'Dirección física'),
('ciudad_tienda', 'Bogotá', 'string', 'Ciudad'),
('logo_url', '', 'string', 'URL del logo de la empresa'),

-- ===== IMPUESTOS Y FACTURACIÓN =====
('iva_porcentaje', '19', 'number', 'Porcentaje de IVA aplicado (Colombia = 19%)'),
('aplica_iva_todos', 'true', 'boolean', 'Aplicar IVA a todos los productos'),
('prefijo_factura', 'FAC-', 'string', 'Prefijo para número de factura'),
('resolucion_dian', '', 'string', 'Número de resolución DIAN'),
('fecha_resolucion', '', 'string', 'Fecha de resolución DIAN (YYYY-MM-DD)'),
('rango_facturacion_desde', '1', 'number', 'Rango de facturación inicio'),
('rango_facturacion_hasta', '10000', 'number', 'Rango de facturación fin'),

-- ===== INVENTARIO =====
('stock_minimo_default', '10', 'number', 'Stock mínimo por defecto al crear nuevos productos'),
('dias_alerta_vencimiento', '7', 'number', 'Días antes del vencimiento para alertar'),
('permitir_venta_stock_cero', 'false', 'boolean', 'Permitir vender productos sin stock (backorder)'),
('notificar_stock_bajo', 'true', 'boolean', 'Enviar notificaciones cuando hay stock bajo'),
('notificar_vencimiento', 'true', 'boolean', 'Enviar notificaciones de productos próximos a vencer'),

-- ===== CONTROL DE CAJA =====
('fondo_inicial_default', '200000', 'number', 'Fondo inicial sugerido para caja (en pesos)'),
('umbral_diferencia_caja', '5000', 'number', 'Diferencia máxima aceptable al cerrar caja'),
('requiere_autorizacion_retiro', 'true', 'boolean', 'Retiros de caja requieren autorización'),
('monto_minimo_autorizacion', '100000', 'number', 'Monto mínimo de retiro que requiere autorización'),
('max_horas_sesion_abierta', '12', 'number', 'Horas máximas que puede estar abierta una sesión'),
('notificar_diferencia_caja', 'true', 'boolean', 'Notificar diferencias en arqueo de caja'),

-- ===== PUNTO DE VENTA (POS) =====
('mostrar_imagenes_productos', 'true', 'boolean', 'Mostrar imágenes de productos en POS'),
('permitir_descuentos_cajero', 'false', 'boolean', 'Cajero puede aplicar descuentos manualmente'),
('descuento_maximo_cajero', '5', 'number', 'Porcentaje máximo de descuento que puede dar cajero'),
('requiere_cliente_factura', 'true', 'boolean', 'Requiere datos de cliente para generar factura'),
('generar_factura_automatica', 'false', 'boolean', 'Generar factura automáticamente en cada venta'),
('imprimir_ticket_automatico', 'true', 'boolean', 'Imprimir ticket automáticamente al completar venta'),

-- ===== DESCUENTOS Y PROMOCIONES =====
('permitir_descuentos', 'true', 'boolean', 'Sistema de descuentos activo'),
('acumular_descuentos', 'false', 'boolean', 'Permitir múltiples descuentos en una venta'),
('descuento_aprendices_activo', 'true', 'boolean', 'Descuento para aprendices SENA activo'),
('descuento_aprendices_porcentaje', '10', 'number', 'Porcentaje de descuento para aprendices'),

-- ===== CLIENTES =====
('requiere_cliente_venta', 'false', 'boolean', 'Requerir datos de cliente en cada venta'),
('cliente_frecuente_minimo', '5', 'number', 'Número de compras para ser cliente frecuente'),
('monto_minimo_cliente_frecuente', '100000', 'number', 'Monto mínimo de compras para ser frecuente'),

-- ===== SISTEMA =====
('mantenimiento_activo', 'false', 'boolean', 'Modo mantenimiento activo'),
('mensaje_mantenimiento', 'Sistema en mantenimiento', 'string', 'Mensaje a mostrar en mantenimiento'),
('version_sistema', '1.0.0', 'string', 'Versión actual del sistema'),
('ultima_actualizacion', '2025-11-28', 'string', 'Fecha de última actualización')

ON CONFLICT (clave) DO UPDATE SET
    valor = EXCLUDED.valor,
    tipo = EXCLUDED.tipo,
    descripcion = EXCLUDED.descripcion,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- TRIGGER PARA updated_at EN CONFIGURACION
-- =====================================================

CREATE TRIGGER trigger_configuracion_updated_at
    BEFORE UPDATE ON configuracion
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE configuracion IS 'Configuraciones del sistema (EDITABLES desde panel de admin)';
COMMENT ON COLUMN configuracion.clave IS 'Identificador único de la configuración';
COMMENT ON COLUMN configuracion.valor IS 'Valor de la configuración (como texto)';
COMMENT ON COLUMN configuracion.tipo IS 'Tipo de dato: string, number, boolean, json';
COMMENT ON COLUMN configuracion.descripcion IS 'Descripción de para qué sirve esta configuración';

-- =====================================================
-- FIN DE ACTUALIZACIÓN DE CONFIGURACIONES
-- =====================================================

