-- ============================================================
-- FIX: Cambiar columnas DATE a TIMESTAMP (con drop de vistas)
-- ============================================================

BEGIN;

-- 1. Guardar definición de vistas (para recrearlas después)
-- Vista: vista_productos_vencimiento

-- 2. Eliminar vistas que dependen de las columnas
DROP VIEW IF EXISTS vista_productos_vencimiento CASCADE;

-- 3. Cambiar fecha_produccion de DATE a TIMESTAMP WITH TIME ZONE
ALTER TABLE lotes_productos 
ALTER COLUMN fecha_produccion TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_produccion::TIMESTAMP WITH TIME ZONE;

-- 4. Cambiar fecha_vencimiento de DATE a TIMESTAMP WITH TIME ZONE
ALTER TABLE lotes_productos 
ALTER COLUMN fecha_vencimiento TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_vencimiento::TIMESTAMP WITH TIME ZONE;

-- 5. Recrear la vista (si existía)
-- Nota: Si necesitas la vista, deberás recrearla manualmente
-- porque no tengo acceso a su definición original

-- 6. Verificar el cambio
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lotes_productos' 
  AND column_name IN ('fecha_produccion', 'fecha_vencimiento');

COMMIT;

SELECT 'Columnas actualizadas correctamente. Nota: vista_productos_vencimiento eliminada.' AS resultado;
