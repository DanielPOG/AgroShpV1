-- ============================================================
-- FIX: Cambiar TODAS las columnas de fecha a TIMESTAMP WITH TIME ZONE
-- ============================================================
-- Estas columnas estaban causando problemas de timezone
-- al guardar fechas sin información de zona horaria
-- ============================================================

BEGIN;

-- 1. auditoria.fecha
ALTER TABLE auditoria 
ALTER COLUMN fecha TYPE TIMESTAMP WITH TIME ZONE 
USING fecha AT TIME ZONE 'America/Bogota';

-- 2. movimientos_unidades
ALTER TABLE movimientos_unidades 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
USING created_at AT TIME ZONE 'America/Bogota';

ALTER TABLE movimientos_unidades 
ALTER COLUMN fecha_movimiento TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_movimiento AT TIME ZONE 'America/Bogota';

-- 3. pagos_venta
ALTER TABLE pagos_venta 
ALTER COLUMN fecha_pago TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_pago AT TIME ZONE 'America/Bogota';

-- 4. turnos
ALTER TABLE turnos 
ALTER COLUMN hora_atencion TYPE TIMESTAMP WITH TIME ZONE 
USING hora_atencion AT TIME ZONE 'America/Bogota';

ALTER TABLE turnos 
ALTER COLUMN hora_creacion TYPE TIMESTAMP WITH TIME ZONE 
USING hora_creacion AT TIME ZONE 'America/Bogota';

ALTER TABLE turnos 
ALTER COLUMN hora_finalizacion TYPE TIMESTAMP WITH TIME ZONE 
USING hora_finalizacion AT TIME ZONE 'America/Bogota';

-- 5. ventas
ALTER TABLE ventas 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
USING created_at AT TIME ZONE 'America/Bogota';

ALTER TABLE ventas 
ALTER COLUMN fecha_venta TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_venta AT TIME ZONE 'America/Bogota';

COMMIT;

-- Verificar los cambios
SELECT 
    table_name, 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name IN (
    'auditoria', 
    'movimientos_unidades', 
    'pagos_venta', 
    'turnos', 
    'ventas'
)
AND column_name LIKE '%fecha%' 
   OR column_name LIKE '%hora%' 
   OR column_name = 'created_at'
ORDER BY table_name, column_name;

SELECT 'TODAS las columnas de fecha actualizadas correctamente' AS resultado;
