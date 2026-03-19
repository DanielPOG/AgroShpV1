-- =====================================================
-- FASE 3: MEJORAS DE ESQUEMA - PARTE 2
-- Agregar campos monto_recibido y monto_cambio a movimientos_caja
-- =====================================================
-- Fecha: 12 de diciembre de 2025
-- Objetivo: Registrar el monto pagado por el cliente y el cambio entregado
--           para mejorar auditoría y detección de errores en cambio

-- 1. Agregar columna monto_recibido (monto que pagó el cliente)
ALTER TABLE movimientos_caja
ADD COLUMN IF NOT EXISTS monto_recibido DECIMAL(10, 2) NULL;

-- 2. Agregar columna monto_cambio (cambio entregado al cliente)
ALTER TABLE movimientos_caja
ADD COLUMN IF NOT EXISTS monto_cambio DECIMAL(10, 2) NULL;

-- 3. Agregar comentarios descriptivos
COMMENT ON COLUMN movimientos_caja.monto_recibido IS 
'Monto que pagó el cliente (solo para ventas en efectivo). Ejemplo: cliente paga $2,000 por venta de $1,190';

COMMENT ON COLUMN movimientos_caja.monto_cambio IS 
'Cambio entregado al cliente (solo para ventas en efectivo). Ejemplo: $2,000 - $1,190 = $810 de cambio';

-- 4. Agregar constraint para validar coherencia (cambio no puede ser negativo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_movimientos_cambio_positivo'
  ) THEN
    ALTER TABLE movimientos_caja
    ADD CONSTRAINT chk_movimientos_cambio_positivo
    CHECK (monto_cambio IS NULL OR monto_cambio >= 0);
  END IF;
END $$;

-- 5. Agregar constraint para validar relación entre montos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_movimientos_relacion_montos'
  ) THEN
    ALTER TABLE movimientos_caja
    ADD CONSTRAINT chk_movimientos_relacion_montos
    CHECK (
      (monto_recibido IS NULL AND monto_cambio IS NULL) OR
      (monto_recibido IS NOT NULL AND monto_cambio IS NOT NULL AND monto_recibido >= monto)
    );
  END IF;
END $$;

-- Verificar resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'movimientos_caja' 
AND column_name IN ('monto_recibido', 'monto_cambio');

COMMENT ON TABLE movimientos_caja IS 
'Registros de todos los movimientos de efectivo en caja. FASE 3: Ahora incluye monto_recibido y monto_cambio para auditoría de cambio en ventas.';
