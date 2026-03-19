-- =====================================================================
-- AgroShop – Database Constraints (Post db-push)
-- Se ejecuta automáticamente desde docker-seed.js después de prisma db push.
-- También se puede ejecutar manualmente:
--   psql -U postgres -d AgroShop -f database/init-constraints.sql
--
-- Todas las constraints usan IF NOT EXISTS / DO $$ para ser idempotentes.
-- =====================================================================

-- =============================================================
-- 1) CHECK constraints monetarios – impedir valores negativos
-- =============================================================

-- Helper: agregar constraint solo si no existe
DO $$ BEGIN
  -- VENTAS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ventas_subtotal') THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_subtotal CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ventas_impuesto') THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_impuesto CHECK (impuesto >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ventas_descuento') THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_descuento CHECK (descuento >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ventas_total') THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_total CHECK (total >= 0);
  END IF;

  -- DETALLE_VENTAS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_det_cantidad') THEN
    ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_cantidad CHECK (cantidad > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_det_precio') THEN
    ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_precio CHECK (precio_unitario >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_det_subtotal') THEN
    ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_subtotal CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_det_costo') THEN
    ALTER TABLE detalle_ventas ADD CONSTRAINT chk_det_costo CHECK (costo_unitario IS NULL OR costo_unitario >= 0);
  END IF;

  -- PAGOS_VENTA
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pago_monto') THEN
    ALTER TABLE pagos_venta ADD CONSTRAINT chk_pago_monto CHECK (monto > 0);
  END IF;

  -- SESIONES_CAJA
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_fondo') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_fondo CHECK (fondo_inicial >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_ventas_efectivo') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_efectivo CHECK (total_ventas_efectivo IS NULL OR total_ventas_efectivo >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_ventas_nequi') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_nequi CHECK (total_ventas_nequi IS NULL OR total_ventas_nequi >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_ventas_tarjeta') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_tarjeta CHECK (total_ventas_tarjeta IS NULL OR total_ventas_tarjeta >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_ventas_transferencia') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ventas_transferencia CHECK (total_ventas_transferencia IS NULL OR total_ventas_transferencia >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_ingresos') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_ingresos CHECK (total_ingresos_adicionales IS NULL OR total_ingresos_adicionales >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_retiros') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_retiros CHECK (total_retiros IS NULL OR total_retiros >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_gastos') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_gastos CHECK (total_gastos IS NULL OR total_gastos >= 0);
  END IF;

  -- MOVIMIENTOS_CAJA
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mov_monto') THEN
    ALTER TABLE movimientos_caja ADD CONSTRAINT chk_mov_monto CHECK (monto > 0);
  END IF;

  -- RETIROS_CAJA
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_retiro_monto') THEN
    ALTER TABLE retiros_caja ADD CONSTRAINT chk_retiro_monto CHECK (monto > 0);
  END IF;

  -- TURNOS_CAJA
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_turno_monto_inicial') THEN
    ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_monto_inicial CHECK (monto_inicial >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_turno_monto_final') THEN
    ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_monto_final CHECK (monto_final IS NULL OR monto_final >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_turno_efec_inicial') THEN
    ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_efec_inicial CHECK (efectivo_inicial >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_turno_efec_final') THEN
    ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_efec_final CHECK (efectivo_final IS NULL OR efectivo_final >= 0);
  END IF;

  -- GASTOS_CAJA
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_gasto_monto') THEN
    ALTER TABLE gastos_caja ADD CONSTRAINT chk_gasto_monto CHECK (monto > 0);
  END IF;

  -- ARQUEOS_CAJA
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_arqueo_billetes') THEN
    ALTER TABLE arqueos_caja ADD CONSTRAINT chk_arqueo_billetes CHECK (
      COALESCE(billetes_100000, 0) >= 0 AND COALESCE(billetes_50000, 0) >= 0 AND
      COALESCE(billetes_20000, 0) >= 0  AND COALESCE(billetes_10000, 0) >= 0 AND
      COALESCE(billetes_5000, 0) >= 0   AND COALESCE(billetes_2000, 0) >= 0  AND
      COALESCE(billetes_1000, 0) >= 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_arqueo_monedas') THEN
    ALTER TABLE arqueos_caja ADD CONSTRAINT chk_arqueo_monedas CHECK (
      COALESCE(monedas_1000, 0) >= 0 AND COALESCE(monedas_500, 0) >= 0 AND
      COALESCE(monedas_200, 0) >= 0  AND COALESCE(monedas_100, 0) >= 0 AND
      COALESCE(monedas_50, 0) >= 0
    );
  END IF;

  -- LOTES_PRODUCTOS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lote_cantidad') THEN
    ALTER TABLE lotes_productos ADD CONSTRAINT chk_lote_cantidad CHECK (cantidad >= 0);
  END IF;

  -- PRODUCTOS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_producto_stock') THEN
    ALTER TABLE productos ADD CONSTRAINT chk_producto_stock CHECK (stock_actual IS NULL OR stock_actual >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_producto_precio') THEN
    ALTER TABLE productos ADD CONSTRAINT chk_producto_precio CHECK (precio_unitario >= 0);
  END IF;
END $$;


-- =============================================================
-- 2) CHECK constraints de estados (enum validation)
-- =============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ventas_estado') THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_estado
      CHECK (estado IN ('completada', 'cancelada', 'pendiente'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sesion_estado') THEN
    ALTER TABLE sesiones_caja ADD CONSTRAINT chk_sesion_estado
      CHECK (estado IN ('abierta', 'cerrada'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_retiro_estado') THEN
    ALTER TABLE retiros_caja ADD CONSTRAINT chk_retiro_estado
      CHECK (estado IN ('pendiente', 'autorizado', 'rechazado', 'completado'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_turno_estado') THEN
    ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_estado
      CHECK (estado IN ('activo', 'finalizado', 'suspendido'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lote_estado') THEN
    ALTER TABLE lotes_productos ADD CONSTRAINT chk_lote_estado
      CHECK (estado IN ('disponible', 'reservado', 'vencido', 'retirado', 'bloqueado'));
  END IF;
END $$;


-- =============================================================
-- 3) Constraints de lógica de negocio
-- =============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_retiro_auth_coherencia') THEN
    ALTER TABLE retiros_caja ADD CONSTRAINT chk_retiro_auth_coherencia
      CHECK (
        CASE WHEN estado IN ('autorizado', 'completado')
             THEN autorizado_por IS NOT NULL
             ELSE TRUE
        END
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_turno_cierre_coherencia') THEN
    ALTER TABLE turnos_caja ADD CONSTRAINT chk_turno_cierre_coherencia
      CHECK (
        CASE WHEN estado = 'finalizado'
             THEN fecha_fin IS NOT NULL AND efectivo_final IS NOT NULL
             ELSE TRUE
        END
      );
  END IF;
END $$;


-- =============================================================
-- 4) Índices únicos parciales – prevenir race conditions
-- =============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_sesion_activa_unica
  ON sesiones_caja(cajero_id)
  WHERE estado = 'abierta';

CREATE UNIQUE INDEX IF NOT EXISTS idx_turno_activo_unico
  ON turnos_caja(sesion_caja_id)
  WHERE estado = 'activo';


-- =============================================================
-- 5) Índices de rendimiento
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_sesion_cajero_activa
  ON sesiones_caja(cajero_id, estado)
  WHERE estado = 'abierta';

CREATE INDEX IF NOT EXISTS idx_retiro_sesion_pendiente
  ON retiros_caja(sesion_caja_id, estado)
  WHERE estado IN ('pendiente', 'autorizado');

CREATE INDEX IF NOT EXISTS idx_venta_activas_usuario_fecha
  ON ventas(usuario_id, estado, fecha_venta DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mov_caja_sesion_tipo_fecha
  ON movimientos_caja(sesion_caja_id, tipo_movimiento, fecha_movimiento DESC);


-- =============================================================
-- 6) Trigger: validar turno activo al insertar venta
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
