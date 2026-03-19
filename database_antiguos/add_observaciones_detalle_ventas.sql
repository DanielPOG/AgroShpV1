-- Agregar campo observaciones a detalle_ventas para productos ficticios
-- Migración: add_observaciones_to_detalle_ventas
-- Fecha: 2025-12-12

ALTER TABLE detalle_ventas 
ADD COLUMN IF NOT EXISTS observaciones VARCHAR(500);

COMMENT ON COLUMN detalle_ventas.observaciones IS 'Información adicional del item de venta. Usado para productos ficticios (no en inventario).';
