-- ============================================================================
-- MIGRACIÓN: Implementación de Sistema de Turnos de Caja
-- Fecha: 14 de diciembre de 2025
-- Descripción: Agregar campos necesarios para gestión de turnos por cajero
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar campos a tabla turnos_caja
-- ============================================================================

-- Campos de control de efectivo
ALTER TABLE turnos_caja 
  ADD COLUMN IF NOT EXISTS efectivo_inicial DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS efectivo_final DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS observaciones_cierre TEXT,
  ADD COLUMN IF NOT EXISTS desglose_efectivo JSONB,
  ADD COLUMN IF NOT EXISTS turno_anterior_id INT REFERENCES turnos_caja(id),
  ADD COLUMN IF NOT EXISTS autorizado_por INT REFERENCES usuarios(id);

-- Comentarios para documentación
COMMENT ON COLUMN turnos_caja.efectivo_inicial IS 'Efectivo recibido al iniciar turno (del turno anterior o fondo inicial)';
COMMENT ON COLUMN turnos_caja.efectivo_final IS 'Efectivo contado al cerrar turno (mini-arqueo)';
COMMENT ON COLUMN turnos_caja.observaciones_cierre IS 'Notas o comentarios al cerrar el turno';
COMMENT ON COLUMN turnos_caja.desglose_efectivo IS 'JSON con conteo de billetes y monedas del mini-arqueo';
COMMENT ON COLUMN turnos_caja.turno_anterior_id IS 'ID del turno previo para trazabilidad y transferencia de efectivo';
COMMENT ON COLUMN turnos_caja.autorizado_por IS 'ID del supervisor que autorizó (para relevos de emergencia)';

-- Actualizar campos existentes si es necesario
COMMENT ON COLUMN turnos_caja.tipo_relevo IS 'Tipo: normal (programado), emergencia (imprevisto), descanso (pausa corta)';
COMMENT ON COLUMN turnos_caja.estado IS 'Estado: activo, cerrado, suspendido';
COMMENT ON COLUMN turnos_caja.diferencia IS 'Diferencia entre efectivo esperado y contado en mini-arqueo';

-- ============================================================================
-- PASO 2: Agregar turno_caja_id a tablas de transacciones
-- ============================================================================

-- Tabla ventas
ALTER TABLE ventas 
  ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);

COMMENT ON COLUMN ventas.turno_caja_id IS 'ID del turno en el que se realizó la venta (para trazabilidad)';

-- Tabla movimientos_caja
ALTER TABLE movimientos_caja 
  ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);

COMMENT ON COLUMN movimientos_caja.turno_caja_id IS 'ID del turno en el que se realizó el movimiento';

-- Tabla retiros_caja
ALTER TABLE retiros_caja 
  ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);

COMMENT ON COLUMN retiros_caja.turno_caja_id IS 'ID del turno en el que se solicitó el retiro';

-- Tabla gastos_caja
ALTER TABLE gastos_caja 
  ADD COLUMN IF NOT EXISTS turno_caja_id INT REFERENCES turnos_caja(id);

COMMENT ON COLUMN gastos_caja.turno_caja_id IS 'ID del turno en el que se registró el gasto';

-- ============================================================================
-- PASO 3: Crear índices para mejorar performance
-- ============================================================================

-- Índices en tablas de transacciones para búsquedas por turno
CREATE INDEX IF NOT EXISTS idx_ventas_turno ON ventas(turno_caja_id) WHERE turno_caja_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimientos_turno ON movimientos_caja(turno_caja_id) WHERE turno_caja_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retiros_turno ON retiros_caja(turno_caja_id) WHERE turno_caja_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gastos_turno ON gastos_caja(turno_caja_id) WHERE turno_caja_id IS NOT NULL;

-- Índice para búsqueda de turnos activos (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_turnos_activos 
  ON turnos_caja(sesion_caja_id, estado) 
  WHERE estado = 'activo';

-- Índice compuesto para búsquedas de turnos por sesión y cajero
CREATE INDEX IF NOT EXISTS idx_turnos_sesion_cajero 
  ON turnos_caja(sesion_caja_id, cajero_id);

-- Índice para cadena de relevos (turno_anterior_id)
CREATE INDEX IF NOT EXISTS idx_turnos_anterior 
  ON turnos_caja(turno_anterior_id) 
  WHERE turno_anterior_id IS NOT NULL;

-- Índice para búsquedas por fecha de inicio
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_inicio 
  ON turnos_caja(fecha_inicio DESC);

-- ============================================================================
-- PASO 4: Crear vista para análisis de turnos completos
-- ============================================================================

CREATE OR REPLACE VIEW vista_turnos_completos AS
SELECT 
  -- Datos básicos del turno
  t.id as turno_id,
  t.sesion_caja_id,
  t.cajero_id,
  t.caja_id,
  t.fecha_inicio,
  t.fecha_fin,
  t.estado,
  t.tipo_relevo,
  t.efectivo_inicial,
  t.efectivo_final,
  t.diferencia,
  t.duracion_minutos,
  
  -- Información del cajero
  u.nombre || ' ' || COALESCE(u.apellido, '') as nombre_cajero,
  u.email as email_cajero,
  
  -- Información de la sesión
  sc.codigo_sesion,
  sc.estado as estado_sesion,
  
  -- Información de la caja
  c.nombre as nombre_caja,
  c.codigo as codigo_caja,
  
  -- Calcular ventas del turno
  COALESCE(COUNT(DISTINCT v.id), 0) as cantidad_ventas,
  COALESCE(SUM(v.total), 0) as total_ventas,
  COALESCE(SUM(CASE WHEN pv.metodo_pago_id = 1 THEN pv.monto ELSE 0 END), 0) as ventas_efectivo,
  COALESCE(SUM(CASE WHEN pv.metodo_pago_id = 2 THEN pv.monto ELSE 0 END), 0) as ventas_nequi,
  COALESCE(SUM(CASE WHEN pv.metodo_pago_id = 3 THEN pv.monto ELSE 0 END), 0) as ventas_tarjeta,
  COALESCE(SUM(CASE WHEN pv.metodo_pago_id = 4 THEN pv.monto ELSE 0 END), 0) as ventas_transferencia,
  
  -- Calcular movimientos del turno
  COALESCE(SUM(CASE 
    WHEN mc.tipo_movimiento = 'ingreso_adicional' THEN mc.monto 
    ELSE 0 
  END), 0) as ingresos_adicionales,
  COALESCE(SUM(CASE 
    WHEN mc.tipo_movimiento = 'egreso_operativo' THEN mc.monto 
    ELSE 0 
  END), 0) as egresos_operativos,
  
  -- Calcular retiros y gastos del turno
  COALESCE(SUM(CASE 
    WHEN rc.estado = 'completado' THEN rc.monto 
    ELSE 0 
  END), 0) as total_retiros,
  COALESCE(COUNT(DISTINCT rc.id) FILTER (WHERE rc.estado = 'completado'), 0) as cantidad_retiros,
  
  COALESCE(SUM(gc.monto), 0) as total_gastos,
  COALESCE(COUNT(DISTINCT gc.id), 0) as cantidad_gastos,
  
  -- Calcular efectivo esperado del turno
  t.efectivo_inicial + 
  COALESCE(SUM(CASE WHEN pv.metodo_pago_id = 1 THEN pv.monto ELSE 0 END), 0) + 
  COALESCE(SUM(CASE 
    WHEN mc.tipo_movimiento = 'ingreso_adicional' AND mc.metodo_pago = 'efectivo' 
    THEN mc.monto 
    ELSE 0 
  END), 0) -
  COALESCE(SUM(CASE 
    WHEN mc.tipo_movimiento = 'egreso_operativo' AND mc.metodo_pago = 'efectivo' 
    THEN mc.monto 
    ELSE 0 
  END), 0) -
  COALESCE(SUM(CASE 
    WHEN rc.estado = 'completado' THEN rc.monto 
    ELSE 0 
  END), 0) -
  COALESCE(SUM(CASE WHEN gc.metodo_pago = 'efectivo' THEN gc.monto ELSE 0 END), 0) 
  as efectivo_esperado_calculado,
  
  -- Indicadores de rendimiento
  CASE 
    WHEN t.duracion_minutos > 0 THEN 
      ROUND((COUNT(DISTINCT v.id)::NUMERIC / NULLIF(t.duracion_minutos, 0) * 60), 2)
    ELSE 0 
  END as ventas_por_hora,
  
  CASE 
    WHEN COUNT(DISTINCT v.id) > 0 THEN 
      ROUND(SUM(v.total) / NULLIF(COUNT(DISTINCT v.id), 0), 2)
    ELSE 0 
  END as ticket_promedio

FROM turnos_caja t
INNER JOIN usuarios u ON t.cajero_id = u.id
INNER JOIN sesiones_caja sc ON t.sesion_caja_id = sc.id
INNER JOIN cajas c ON t.caja_id = c.id
LEFT JOIN ventas v ON v.turno_caja_id = t.id AND v.estado = 'completada'
LEFT JOIN pagos_venta pv ON pv.venta_id = v.id
LEFT JOIN movimientos_caja mc ON mc.turno_caja_id = t.id
LEFT JOIN retiros_caja rc ON rc.turno_caja_id = t.id
LEFT JOIN gastos_caja gc ON gc.turno_caja_id = t.id
GROUP BY 
  t.id, t.sesion_caja_id, t.cajero_id, t.caja_id, t.fecha_inicio, 
  t.fecha_fin, t.estado, t.tipo_relevo, t.efectivo_inicial, 
  t.efectivo_final, t.diferencia, t.duracion_minutos,
  u.nombre, u.apellido, u.email,
  sc.codigo_sesion, sc.estado,
  c.nombre, c.codigo;

COMMENT ON VIEW vista_turnos_completos IS 'Vista completa de turnos con todos sus totales y métricas calculadas';

-- ============================================================================
-- PASO 5: Agregar constraints de validación
-- ============================================================================

-- Asegurar que tipo_relevo tenga valores válidos
ALTER TABLE turnos_caja DROP CONSTRAINT IF EXISTS check_tipo_relevo;
ALTER TABLE turnos_caja ADD CONSTRAINT check_tipo_relevo 
  CHECK (tipo_relevo IN ('inicio_jornada', 'cambio_turno', 'fin_jornada', 'emergencia'));

-- Asegurar que estado tenga valores válidos
ALTER TABLE turnos_caja DROP CONSTRAINT IF EXISTS check_estado_turno;
ALTER TABLE turnos_caja ADD CONSTRAINT check_estado_turno 
  CHECK (estado IN ('activo', 'finalizado', 'suspendido'));

-- Validar que efectivo_final no sea negativo
ALTER TABLE turnos_caja DROP CONSTRAINT IF EXISTS check_efectivo_final_positivo;
ALTER TABLE turnos_caja ADD CONSTRAINT check_efectivo_final_positivo 
  CHECK (efectivo_final IS NULL OR efectivo_final >= 0);

-- Validar que efectivo_inicial sea positivo
ALTER TABLE turnos_caja DROP CONSTRAINT IF EXISTS check_efectivo_inicial_positivo;
ALTER TABLE turnos_caja ADD CONSTRAINT check_efectivo_inicial_positivo 
  CHECK (efectivo_inicial >= 0);

-- ============================================================================
-- PASO 6: Actualizar datos existentes (opcional - solo si hay datos)
-- ============================================================================

-- Asignar efectivo_inicial basado en monto_inicial existente
UPDATE turnos_caja 
SET efectivo_inicial = monto_inicial 
WHERE efectivo_inicial IS NULL AND monto_inicial IS NOT NULL;

-- Asignar efectivo_final basado en monto_final existente
UPDATE turnos_caja 
SET efectivo_final = monto_final 
WHERE efectivo_final IS NULL AND monto_final IS NOT NULL AND estado = 'cerrado';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que las columnas se crearon correctamente
DO $$
BEGIN
  -- Verificar turnos_caja
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'turnos_caja' AND column_name = 'efectivo_inicial'
  ) THEN
    RAISE EXCEPTION 'Error: columna efectivo_inicial no creada en turnos_caja';
  END IF;
  
  -- Verificar ventas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ventas' AND column_name = 'turno_caja_id'
  ) THEN
    RAISE EXCEPTION 'Error: columna turno_caja_id no creada en ventas';
  END IF;
  
  -- Verificar movimientos_caja
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'movimientos_caja' AND column_name = 'turno_caja_id'
  ) THEN
    RAISE EXCEPTION 'Error: columna turno_caja_id no creada en movimientos_caja';
  END IF;
  
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '✅ Todas las columnas fueron creadas correctamente';
  RAISE NOTICE '✅ Todos los índices fueron creados';
  RAISE NOTICE '✅ Vista vista_turnos_completos creada';
END $$;

-- ============================================================================
-- INFORMACIÓN POST-MIGRACIÓN
-- ============================================================================

-- Mostrar resumen de la migración
SELECT 
  'turnos_caja' as tabla,
  COUNT(*) as registros_existentes,
  COUNT(CASE WHEN efectivo_inicial IS NOT NULL THEN 1 END) as con_efectivo_inicial,
  COUNT(CASE WHEN estado = 'activo' THEN 1 END) as turnos_activos
FROM turnos_caja
UNION ALL
SELECT 
  'ventas' as tabla,
  COUNT(*) as registros_existentes,
  COUNT(CASE WHEN turno_caja_id IS NOT NULL THEN 1 END) as con_turno_asignado,
  NULL as turnos_activos
FROM ventas;
