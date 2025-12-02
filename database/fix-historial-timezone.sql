-- ============================================================
-- FIX: Cambiar fecha_movimiento a TIMESTAMP WITH TIME ZONE
-- ============================================================
-- Problema: La columna es TIMESTAMP sin timezone
-- Cuando NOW() retorna un timestamptz, se convierte a timestamp
-- perdiendo la información de timezone
-- ============================================================

BEGIN;

-- Cambiar fecha_movimiento a TIMESTAMP WITH TIME ZONE
ALTER TABLE historial_inventario 
ALTER COLUMN fecha_movimiento TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_movimiento AT TIME ZONE 'America/Bogota';

-- Verificar el cambio
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'historial_inventario' 
  AND column_name = 'fecha_movimiento';

COMMIT;

SELECT 'Columna fecha_movimiento actualizada a TIMESTAMP WITH TIME ZONE' AS resultado;
