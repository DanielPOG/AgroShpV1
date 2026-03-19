-- =====================================================================
-- P2 – Database Hardening Migration
-- Fecha: 2026-03-20
-- Objetivo: CHECK constraints financieros, índices únicos de estado,
--           validación de enums, protección contra race conditions.
--
-- IMPORTANTE: Ejecutar dentro de una transacción.
-- Si alguna constraint falla porque ya existen datos inválidos,
-- corregir esos datos PRIMERO (ver sección de limpieza al final).
-- =====================================================================

BEGIN;

-- =============================================================
-- 1) CHECK constraints monetarios – impedir valores negativos
-- =============================================================

-- VENTAS
ALTER TABLE ventas ADD CONSTRAINT chk_ventas_subtotal   CHECK (subtotal >= 0);
ALTER TABLE ventas ADD CONSTRAINT chk_ventas_impuesto   CHECK (impuesto >= 0);
ALTER TABLE ventas ADD CONSTRAINT chk_ventas_descuento  CHECK (descuento >= 0);
ALTER TABLE ventas ADD CONSTRAINT chk_ventas_total      CHECK (total >= 0);

-- DETALLE_VENTAS
ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_cantidad       CHECK (cantidad > 0);
ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_precio         CHECK (precio_unitario >= 0);
ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_subtotal       CHECK (subtotal >= 0);
ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_costo          CHECK (costo_unitario IS NULL OR costo_unitario >= 0);

-- PAGOS_VENTA
ALTER TABLE pagos_venta ADD CONSTRAINT chk_pago_monto CHECK (monto > 0);

-- SESIONES_CAJA  (todos los acumuladores >= 0)
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_fondo               CHECK (fondo_inicial >= 0);
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_efectivo     CHECK (total_ventas_efectivo IS NULL OR total_ventas_efectivo >= 0);
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_nequi        CHECK (total_ventas_nequi IS NULL OR total_ventas_nequi >= 0);
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_tarjeta      CHECK (total_ventas_tarjeta IS NULL OR total_ventas_tarjeta >= 0);
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_transferencia CHECK (total_ventas_transferencia IS NULL OR total_ventas_transferencia >= 0);
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ingresos            CHECK (total_ingresos_adicionales IS NULL OR total_ingresos_adicionales >= 0);
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_retiros             CHECK (total_retiros IS NULL OR total_retiros >= 0);
ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_gastos              CHECK (total_gastos IS NULL OR total_gastos >= 0);

-- MOVIMIENTOS_CAJA
ALTER TABLE movimientos_caja ADD CONSTRAINT chk_mov_monto CHECK (monto > 0);

-- RETIROS_CAJA
ALTER TABLE retiros_caja ADD CONSTRAINT chk_retiro_monto CHECK (monto > 0);

-- TURNOS_CAJA
ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_monto_inicial   CHECK (monto_inicial >= 0);
ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_monto_final     CHECK (monto_final IS NULL OR monto_final >= 0);
ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_efec_inicial    CHECK (efectivo_inicial >= 0);
ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_efec_final      CHECK (efectivo_final IS NULL OR efectivo_final >= 0);

-- GASTOS_CAJA
ALTER TABLE gastos_caja ADD CONSTRAINT chk_gasto_monto CHECK (monto > 0);

-- ARQUEOS_CAJA – billetes y monedas >= 0
ALTER TABLE arqueos_caja ADD CONSTRAINT chk_arqueo_billetes CHECK (
  COALESCE(billetes_100000, 0) >= 0 AND COALESCE(billetes_50000, 0) >= 0 AND
  COALESCE(billetes_20000, 0) >= 0  AND COALESCE(billetes_10000, 0) >= 0 AND
  COALESCE(billetes_5000, 0) >= 0   AND COALESCE(billetes_2000, 0) >= 0  AND
  COALESCE(billetes_1000, 0) >= 0
);
ALTER TABLE arqueos_caja ADD CONSTRAINT chk_arqueo_monedas CHECK (
  COALESCE(monedas_1000, 0) >= 0 AND COALESCE(monedas_500, 0) >= 0 AND
  COALESCE(monedas_200, 0) >= 0  AND COALESCE(monedas_100, 0) >= 0 AND
  COALESCE(monedas_50, 0) >= 0
);

-- LOTES_PRODUCTOS
ALTER TABLE lotes_productos ADD CONSTRAINT chk_lote_cantidad CHECK (cantidad >= 0);

-- PRODUCTOS – stock >= 0 (si existe trigger que ya valida, esto es defensa en profundidad)
-- Nota: desactivar si hay datos negativos legados. Corregir primero.
ALTER TABLE productos ADD CONSTRAINT chk_producto_stock CHECK (stock_actual IS NULL OR stock_actual >= 0);
ALTER TABLE productos ADD CONSTRAINT chk_producto_precio CHECK (precio_unitario >= 0);


-- =============================================================
-- 2) CHECK constraints de estados (enum validation)
-- =============================================================

ALTER TABLE ventas ADD CONSTRAINT chk_ventas_estado
  CHECK (estado IN ('completada', 'cancelada', 'pendiente'));

ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_estado
  CHECK (estado IN ('abierta', 'cerrada'));

ALTER TABLE retiros_caja ADD CONSTRAINT chk_retiro_estado
  CHECK (estado IN ('pendiente', 'autorizado', 'rechazado', 'completado'));

ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_estado
  CHECK (estado IN ('activo', 'finalizado', 'suspendido'));

ALTER TABLE lotes_productos ADD CONSTRAINT chk_lote_estado
  CHECK (estado IN ('disponible', 'reservado', 'vencido', 'retirado', 'bloqueado'));


-- =============================================================
-- 3) Constraints de lógica de negocio
-- =============================================================

-- Si un retiro está autorizado, DEBE tener un autorizador
ALTER TABLE retiros_caja ADD CONSTRAINT chk_retiro_auth_coherencia
  CHECK (
    CASE WHEN estado IN ('autorizado', 'completado')
         THEN autorizado_por IS NOT NULL
         ELSE TRUE
    END
  );

-- Si un turno está finalizado, DEBE tener fecha_fin y efectivo_final
ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_cierre_coherencia
  CHECK (
    CASE WHEN estado = 'finalizado'
         THEN fecha_fin IS NOT NULL AND efectivo_final IS NOT NULL
         ELSE TRUE
    END
  );


-- =============================================================
-- 4) Índices únicos parciales – prevenir race conditions
-- =============================================================

-- Solo UNA sesión abierta por cajero
CREATE UNIQUE INDEX IF NOT EXISTS idx_sesion_activa_unica
  ON sesiones_caja(cajero_id)
  WHERE estado = 'abierta';

-- Solo UN turno activo por sesión de caja
CREATE UNIQUE INDEX IF NOT EXISTS idx_turno_activo_unico
  ON turnos_caja(sesion_caja_id)
  WHERE estado = 'activo';


-- =============================================================
-- 5) Índices de rendimiento para consultas frecuentes
-- =============================================================

-- Búsqueda rápida de sesión activa por cajero
CREATE INDEX IF NOT EXISTS idx_sesion_cajero_activa
  ON sesiones_caja(cajero_id, estado)
  WHERE estado = 'abierta';

-- Retiros pendientes por sesión
CREATE INDEX IF NOT EXISTS idx_retiro_sesion_pendiente
  ON retiros_caja(sesion_caja_id, estado)
  WHERE estado IN ('pendiente', 'autorizado');

-- Ventas no eliminadas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_venta_activas_usuario_fecha
  ON ventas(usuario_id, estado, fecha_venta DESC)
  WHERE deleted_at IS NULL;

-- Movimientos de caja por sesión y tipo (para reconciliación de turno)
CREATE INDEX IF NOT EXISTS idx_mov_caja_sesion_tipo_fecha
  ON movimientos_caja(sesion_caja_id, tipo_movimiento, fecha_movimiento DESC);


-- =============================================================
-- 6) Trigger: validar que turno esté activo al insertar venta
-- =============================================================

CREATE OR REPLACE FUNCTION validar_turno_activo_en_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.turno_caja_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM turnos_caja
      WHERE id = NEW.turno_caja_id AND estado = 'activo'
    ) THEN
      RAISE EXCEPTION 'No se puede registrar venta: turno % no está activo', NEW.turno_caja_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_turno_activo_venta ON ventas;
CREATE TRIGGER trg_validar_turno_activo_venta
  BEFORE INSERT ON ventas
  FOR EACH ROW
  EXECUTE FUNCTION validar_turno_activo_en_venta();


COMMIT;


-- =============================================================
-- NOTAS DE DESPLIEGUE
-- =============================================================
--
-- 1. Si existen datos legados que violan algún CHECK, corregirlos antes:
--
--    -- Ejemplo: ventas con total negativo
--    UPDATE ventas SET total = ABS(total) WHERE total < 0;
--
--    -- Ejemplo: sesiones con estado no reconocido
--    UPDATE sesiones_caja SET estado = 'cerrada' WHERE estado NOT IN ('abierta', 'cerrada');
--
--    -- Ejemplo: stock negativo en productos
--    UPDATE productos SET stock_actual = 0 WHERE stock_actual < 0;
--
-- 2. Después de aplicar esta migración, realizar un prisma db pull
--    para sincronizar schema.prisma con las nuevas constraints.
--
-- 3. Los índices únicos parciales (sesion_activa_unica, turno_activo_unico)
--    son la protección a nivel DB contra race conditions. El código de aplicación
--    debe capturar el error de unique constraint violation y retornar 409 Conflict.
--
-- =============================================================
