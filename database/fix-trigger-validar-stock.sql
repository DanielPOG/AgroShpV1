-- ========================================
-- FIX: Trigger validar_stock_venta
-- ========================================
-- Problema: El trigger validaba stock_actual DESPUÉS de que el código
--           TypeScript ya había descontado de los lotes usando FIFO.
-- 
-- Solución: Solo validar si NO hay lote_id (venta directa sin lotes).
--           Si tiene lote_id, significa que ya se validó y descontó.
-- ========================================

CREATE OR REPLACE FUNCTION public.validar_stock_venta()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    stock_disponible DECIMAL(10,2);
BEGIN
    -- Si el detalle tiene lote_id, significa que ya se validó y descontó en el código
    -- Solo validar si NO tiene lote_id (venta directa sin lotes)
    IF NEW.lote_id IS NULL THEN
        SELECT stock_actual INTO stock_disponible
        FROM productos
        WHERE id = NEW.producto_id;
        
        IF stock_disponible < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %, Solicitado: %',
                NEW.producto_id, stock_disponible, NEW.cantidad;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Reactivar el trigger
ALTER TABLE detalle_ventas ENABLE TRIGGER trigger_validar_stock_venta;

COMMENT ON FUNCTION validar_stock_venta() IS 
'Valida disponibilidad de stock antes de vender. 
Si detalle_venta tiene lote_id, asume que la validación ya se hizo en código TypeScript.
Solo valida para ventas directas sin lotes (lote_id IS NULL).';
