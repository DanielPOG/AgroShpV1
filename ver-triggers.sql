-- ============================================
-- SCRIPT: Ver todos los triggers activos en la BD
-- ============================================

-- 1. LISTAR TODOS LOS TRIGGERS
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE t.tgtype & 1
        WHEN 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END AS trigger_level,
    CASE t.tgtype & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS trigger_timing,
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'TRUNCATE'
    END AS trigger_event,
    t.tgenabled AS enabled,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
INNER JOIN pg_class c ON t.tgrelid = c.oid
INNER JOIN pg_namespace n ON c.relnamespace = n.oid
INNER JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- 2. VER DEFINICIÓN COMPLETA DE CADA FUNCIÓN DE TRIGGER
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND EXISTS (
      SELECT 1 
      FROM pg_trigger t 
      WHERE t.tgfoid = p.oid
  )
ORDER BY p.proname;

-- 3. TRIGGERS ESPECÍFICOS RELACIONADOS CON STOCK
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    CASE t.tgtype & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS trigger_timing,
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'TRUNCATE'
    END AS trigger_event,
    p.proname AS function_name,
    t.tgenabled AS enabled
FROM pg_trigger t
INNER JOIN pg_class c ON t.tgrelid = c.oid
INNER JOIN pg_namespace n ON c.relnamespace = n.oid
INNER JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND (
      c.relname IN ('productos', 'lotes_productos', 'detalle_ventas', 'historial_inventario')
      OR p.proname LIKE '%stock%'
      OR p.proname LIKE '%sync%'
  )
ORDER BY c.relname, t.tgname;
