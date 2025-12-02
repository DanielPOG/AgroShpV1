-- =====================================================
-- ELIMINAR TRIGGERS VIEJOS QUE CAUSAN DUPLICADOS
-- =====================================================
-- Estos triggers fueron reemplazados por el sistema
-- de triggers en trigger-sync-stock-lotes.sql
-- =====================================================

-- 1. Eliminar trigger que crea registros de "ajuste" automático
DROP TRIGGER IF EXISTS trigger_inventario_cambio ON productos;
DROP FUNCTION IF EXISTS registrar_movimiento_inventario();

-- 2. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Triggers viejos eliminados correctamente';
    RAISE NOTICE '   - trigger_inventario_cambio (eliminado)';
    RAISE NOTICE '   - registrar_movimiento_inventario() (eliminado)';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 El sistema ahora usa solo los triggers de trigger-sync-stock-lotes.sql';
    RAISE NOTICE '   Esto elimina los registros duplicados en historial_inventario';
END $$;
