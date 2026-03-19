-- =====================================================
-- Script para eliminar métodos de pago duplicados
-- y agregar constraint único
-- =====================================================

-- 1. Ver métodos duplicados antes de eliminar
SELECT nombre, COUNT(*) as cantidad, ARRAY_AGG(id) as ids
FROM metodos_pago
GROUP BY nombre
HAVING COUNT(*) > 1;

-- 2. Eliminar duplicados manteniendo solo el de menor ID
DELETE FROM metodos_pago a
USING metodos_pago b
WHERE a.id > b.id 
  AND a.nombre = b.nombre;

-- 3. Agregar constraint único para evitar duplicados futuros
ALTER TABLE metodos_pago 
ADD CONSTRAINT metodos_pago_nombre_unique UNIQUE (nombre);

-- 4. Verificar que no hay duplicados
SELECT nombre, COUNT(*) as cantidad
FROM metodos_pago
GROUP BY nombre
HAVING COUNT(*) > 1;

-- Si no hay resultados, la limpieza fue exitosa ✅
