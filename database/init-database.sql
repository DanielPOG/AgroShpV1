-- =====================================================
-- SCRIPT COMBINADO PARA INICIALIZAR AGROSHOP
-- Ejecutar este archivo en pgAdmin o cualquier cliente PostgreSQL
-- =====================================================

-- Conectar a la base de datos AgroShop antes de ejecutar

\echo '========================================='
\echo 'Iniciando creación de esquema AgroShop...'
\echo '========================================='

\i 'C:/Users/santi/OneDrive/Documentos/GitHub/AgroShpV1/database/schema.sql'

\echo '========================================='
\echo 'Aplicando mejoras al esquema...'
\echo '========================================='

\i 'C:/Users/santi/OneDrive/Documentos/GitHub/AgroShpV1/database/schema-mejoras.sql'

\echo '========================================='
\echo 'Base de datos AgroShop configurada exitosamente!'
\echo '========================================='
