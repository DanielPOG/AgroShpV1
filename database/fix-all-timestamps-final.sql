-- ============================================================
-- FIX: Cambiar TODAS las columnas de fecha (con drop de vistas)
-- ============================================================

BEGIN;

-- 1. Eliminar vistas que dependen de las columnas
DROP VIEW IF EXISTS vista_ventas_diarias CASCADE;

-- 2. auditoria.fecha
ALTER TABLE auditoria 
ALTER COLUMN fecha TYPE TIMESTAMP WITH TIME ZONE 
USING fecha AT TIME ZONE 'America/Bogota';

-- 3. movimientos_unidades
ALTER TABLE movimientos_unidades 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
USING created_at AT TIME ZONE 'America/Bogota';

ALTER TABLE movimientos_unidades 
ALTER COLUMN fecha_movimiento TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_movimiento AT TIME ZONE 'America/Bogota';

-- 4. pagos_venta
ALTER TABLE pagos_venta 
ALTER COLUMN fecha_pago TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_pago AT TIME ZONE 'America/Bogota';

-- 5. turnos
ALTER TABLE turnos 
ALTER COLUMN hora_atencion TYPE TIMESTAMP WITH TIME ZONE 
USING hora_atencion AT TIME ZONE 'America/Bogota';

ALTER TABLE turnos 
ALTER COLUMN hora_creacion TYPE TIMESTAMP WITH TIME ZONE 
USING hora_creacion AT TIME ZONE 'America/Bogota';

ALTER TABLE turnos 
ALTER COLUMN hora_finalizacion TYPE TIMESTAMP WITH TIME ZONE 
USING hora_finalizacion AT TIME ZONE 'America/Bogota';

-- 6. ventas
ALTER TABLE ventas 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
USING created_at AT TIME ZONE 'America/Bogota';

ALTER TABLE ventas 
ALTER COLUMN fecha_venta TYPE TIMESTAMP WITH TIME ZONE 
USING fecha_venta AT TIME ZONE 'America/Bogota';

COMMIT;

SELECT 'Todas las columnas de fecha/hora actualizadas. Vistas eliminadas: vista_ventas_diarias' AS resultado;
