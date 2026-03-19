-- Script para limpiar índices duplicados antes de la migración
-- Ejecutar este script si prisma db push falla por índices duplicados

-- Eliminar índices problemáticos si existen (se recrearán con prisma db push)
DROP INDEX IF EXISTS idx_gastos_turno;
DROP INDEX IF EXISTS idx_gastos_sesion;
DROP INDEX IF EXISTS idx_gastos_categoria;
DROP INDEX IF EXISTS idx_gastos_fecha;

-- Verificar que se eliminaron
SELECT 
    indexname, 
    tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_gastos%'
ORDER BY indexname;
