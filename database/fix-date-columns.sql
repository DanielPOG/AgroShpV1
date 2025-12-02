-- ============================================================
-- FIX: Cambiar columnas DATE a TIMESTAMP para lotes_productos
-- ============================================================
-- Problema: @db.Date solo guarda día, sin hora
-- Cuando JS manda fecha+hora, PostgreSQL convierte a UTC primero
-- y luego guarda solo el día, causando fechas incorrectas
--
-- Solución: Usar TIMESTAMP WITH TIME ZONE para mantener fecha+hora
-- ============================================================

BEGIN;

-- 1. Cambiar fecha_produccion de DATE a TIMESTAMP WITH TIME ZONE
ALTER TABLE lotes_productos 
ALTER COLUMN fecha_produccion TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_produccion::TIMESTAMP WITH TIME ZONE;

-- 2. Cambiar fecha_vencimiento de DATE a TIMESTAMP WITH TIME ZONE
ALTER TABLE lotes_productos 
ALTER COLUMN fecha_vencimiento TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_vencimiento::TIMESTAMP WITH TIME ZONE;

-- 3. Verificar el cambio
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lotes_productos' 
  AND column_name IN ('fecha_produccion', 'fecha_vencimiento');

COMMIT;

SELECT 'Columnas de fecha actualizadas correctamente a TIMESTAMP WITH TIME ZONE' AS resultado;
