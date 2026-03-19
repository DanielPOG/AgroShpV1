-- ============================================================================
-- Corrección: Actualizar constraint check_tipo_relevo con valores correctos
-- ============================================================================
-- Fecha: 2025-12-14
-- Descripción: Corregir los valores permitidos para tipo_relevo en turnos_caja
--              Los valores correctos son: inicio_jornada, cambio_turno, 
--              fin_jornada, emergencia
-- ============================================================================

-- 1. Eliminar constraint antigua
ALTER TABLE turnos_caja DROP CONSTRAINT IF EXISTS check_tipo_relevo;

-- 2. Agregar constraint con valores correctos
ALTER TABLE turnos_caja ADD CONSTRAINT check_tipo_relevo 
  CHECK (tipo_relevo IN ('inicio_jornada', 'cambio_turno', 'fin_jornada', 'emergencia'));

-- 3. Actualizar constraint de estado con valores correctos
ALTER TABLE turnos_caja DROP CONSTRAINT IF EXISTS check_estado_turno;
ALTER TABLE turnos_caja ADD CONSTRAINT check_estado_turno 
  CHECK (estado IN ('activo', 'finalizado', 'suspendido'));

-- 4. Verificar constraints
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'turnos_caja'::regclass
  AND contype = 'c'
ORDER BY conname;

COMMIT;
