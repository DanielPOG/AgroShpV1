-- =====================================================
-- FASE 3: MEJORAS DE ESQUEMA - PARTE 1
-- Agregar campo metodo_pago a gastos_caja
-- =====================================================
-- Fecha: 12 de diciembre de 2025
-- Objetivo: Permitir registrar el método de pago de gastos
--           para distinguir gastos en efectivo de otros métodos

-- 1. Agregar columna metodo_pago con default 'efectivo'
ALTER TABLE gastos_caja
ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'efectivo';

-- 2. Actualizar gastos existentes (por si alguno tiene NULL)
UPDATE gastos_caja
SET metodo_pago = 'efectivo'
WHERE metodo_pago IS NULL;

-- 3. Hacer columna NOT NULL
ALTER TABLE gastos_caja
ALTER COLUMN metodo_pago SET NOT NULL;

-- 4. Agregar constraint para validar valores permitidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_gastos_metodo_pago'
  ) THEN
    ALTER TABLE gastos_caja
    ADD CONSTRAINT chk_gastos_metodo_pago
    CHECK (metodo_pago IN ('efectivo', 'nequi', 'tarjeta', 'transferencia'));
  END IF;
END $$;

-- 5. Agregar comentario descriptivo
COMMENT ON COLUMN gastos_caja.metodo_pago IS 
'Método de pago del gasto: efectivo, nequi, tarjeta o transferencia. Solo gastos en efectivo afectan el efectivo disponible en caja.';

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'gastos_caja' AND column_name = 'metodo_pago';

COMMENT ON TABLE gastos_caja IS 
'Registros de gastos operativos pagados desde la caja. FASE 3: Ahora incluye método de pago para distinguir gastos en efectivo.';
