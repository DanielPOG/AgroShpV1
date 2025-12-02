-- =====================================================
-- FIX: Cambiar onDelete de Cascade a SetNull en historial_inventario
-- =====================================================
-- Esto preserva el historial cuando se elimina un producto
-- =====================================================

-- 1. Eliminar constraint existente
ALTER TABLE historial_inventario 
DROP CONSTRAINT IF EXISTS historial_inventario_producto_id_fkey;

-- 2. Recrear constraint con SET NULL
ALTER TABLE historial_inventario 
ADD CONSTRAINT historial_inventario_producto_id_fkey 
FOREIGN KEY (producto_id) 
REFERENCES productos(id) 
ON DELETE SET NULL 
ON UPDATE NO ACTION;

-- Verificar el cambio
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'historial_inventario' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'producto_id';
