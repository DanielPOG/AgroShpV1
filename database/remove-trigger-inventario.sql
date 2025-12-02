-- Script para eliminar el trigger automático de inventario
-- Este trigger causa registros duplicados y sin usuario_id

-- Eliminar el trigger
DROP TRIGGER IF EXISTS trigger_inventario_cambio ON productos;

-- Eliminar la función asociada
DROP FUNCTION IF EXISTS registrar_movimiento_inventario();

-- NOTA: Ahora el historial de inventario se maneja completamente desde la aplicación
-- con la función adjustStock() que tiene mejor control sobre:
-- - usuario_id (no queda NULL)
-- - observaciones personalizadas
-- - timestamps sincronizados
-- - auditoría completa
