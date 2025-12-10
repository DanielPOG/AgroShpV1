-- ============================================
-- SOLUCIÓN: Deshabilitar trigger que causa doble descuento
-- ============================================

-- El problema:
-- 1. descontarStockDeLotes() → UPDATE lotes_productos → trigger descuenta
-- 2. createSale() → INSERT detalle_ventas → trigger VUELVE a descontar
-- Resultado: DOBLE DESCUENTO

-- Solución: Deshabilitar trigger_sync_stock_venta
-- Ya no es necesario porque el trigger de lotes_productos se encarga

ALTER TABLE detalle_ventas 
DISABLE TRIGGER trigger_sync_stock_venta;

-- Verificar que se deshabilitó
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    CASE t.tgenabled 
        WHEN 'O' THEN '✅ HABILITADO'
        WHEN 'D' THEN '❌ DESHABILITADO'
        ELSE 'OTRO'
    END AS estado
FROM pg_trigger t
INNER JOIN pg_class c ON t.tgrelid = c.oid
INNER JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND c.relname = 'detalle_ventas'
  AND t.tgname = 'trigger_sync_stock_venta';
