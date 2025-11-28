-- =====================================================
-- AGROSHOP - SEED DE USUARIOS INICIALES
-- Ejecutar DESPUÉS de schema.sql
-- =====================================================

-- Este script crea usuarios iniciales para cada rol
-- Contraseñas: todas son "agroshop2024" (cambiar en producción)
-- Hashes generados con bcryptjs (rounds: 10)

-- =====================================================
-- INSERTAR USUARIOS INICIALES
-- =====================================================

-- Admin
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, activo) 
VALUES (
    'Administrador',
    'SENA',
    'admin@sena.edu.co',
    '$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu',  -- agroshop2024
    (SELECT id FROM roles WHERE nombre = 'Admin'),
    true
);

-- Inventarista
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, activo) 
VALUES (
    'Juan',
    'Inventarista',
    'inventario@sena.edu.co',
    '$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu',  -- agroshop2024
    (SELECT id FROM roles WHERE nombre = 'Inventarista'),
    true
);

-- Cajero
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, activo) 
VALUES (
    'María',
    'Cajera',
    'cajero@sena.edu.co',
    '$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu',  -- agroshop2024
    (SELECT id FROM roles WHERE nombre = 'Cajero'),
    true
);

-- Consulta
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, activo) 
VALUES (
    'Pedro',
    'Consultor',
    'consulta@sena.edu.co',
    '$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu',  -- agroshop2024
    (SELECT id FROM roles WHERE nombre = 'Consulta'),
    true
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver usuarios creados
SELECT 
    u.id,
    u.nombre || ' ' || u.apellido AS nombre_completo,
    u.email,
    r.nombre AS rol,
    u.activo,
    u.created_at
FROM usuarios u
JOIN roles r ON u.rol_id = r.id
ORDER BY r.id;

-- =====================================================
-- INFORMACIÓN IMPORTANTE
-- =====================================================

/*
CREDENCIALES DE ACCESO:

1. ADMIN:
   Email: admin@sena.edu.co
   Password: agroshop2024
   
2. INVENTARISTA:
   Email: inventario@sena.edu.co
   Password: agroshop2024
   
3. CAJERO:
   Email: cajero@sena.edu.co
   Password: agroshop2024
   
4. CONSULTA:
   Email: consulta@sena.edu.co
   Password: agroshop2024

⚠️ IMPORTANTE: Cambiar estas contraseñas en producción
⚠️ Los hashes mostrados son de ejemplo y deben regenerarse con bcryptjs

Para generar nuevos hashes con Node.js:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('tu_contraseña', 10);
console.log(hash);
```
*/

