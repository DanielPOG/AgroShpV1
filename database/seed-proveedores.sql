-- =====================================================
-- SEED DATA: PROVEEDORES
-- =====================================================
-- Script para insertar proveedores de ejemplo
-- Ejecutar: psql -U postgres -d AgroShop -f seed-proveedores.sql

-- Limpiar proveedores existentes (opcional, comentar si no quieres borrar)
-- TRUNCATE TABLE proveedores RESTART IDENTITY CASCADE;

-- Insertar proveedores de ejemplo
INSERT INTO proveedores (
  codigo,
  nombre,
  nit,
  contacto_nombre,
  contacto_telefono,
  contacto_email,
  direccion,
  ciudad,
  tipo_productos,
  activo,
  created_at
) VALUES 
-- Proveedor 1: Lácteos
(
  'PROV-001',
  'Lácteos San Fernando',
  '900123456-7',
  'Juan Pérez',
  '3101234567',
  'ventas@lacteossanfernando.com',
  'Calle 50 #25-30',
  'Bogotá',
  ARRAY['Lácteos', 'Derivados lácteos', 'Quesos', 'Yogurt'],
  true,
  NOW()
),

-- Proveedor 2: Frutas y Verduras
(
  'PROV-002',
  'Frutas y Verduras El Campo',
  '900234567-8',
  'María González',
  '3109876543',
  'pedidos@frutaselcampo.com',
  'Carrera 15 #80-45',
  'Medellín',
  ARRAY['Frutas', 'Verduras', 'Hortalizas', 'Productos frescos'],
  true,
  NOW()
),

-- Proveedor 3: Carnes
(
  'PROV-003',
  'Carnes y Embutidos Don José',
  '900345678-9',
  'Carlos Rodríguez',
  '3157654321',
  'info@carnesdoñjose.com',
  'Avenida 6 #12-30',
  'Cali',
  ARRAY['Carnes', 'Embutidos', 'Productos cárnicos', 'Pollo'],
  true,
  NOW()
),

-- Proveedor 4: Granos y Cereales
(
  'PROV-004',
  'Distribuidora de Granos La Cosecha',
  '900456789-0',
  'Ana Martínez',
  '3124567890',
  'ventas@granoslacosecha.com',
  'Calle 100 #15-25',
  'Barranquilla',
  ARRAY['Granos', 'Cereales', 'Legumbres', 'Arroz'],
  true,
  NOW()
),

-- Proveedor 5: Insumos Agrícolas
(
  'PROV-005',
  'Agroquímicos del Valle',
  '900567890-1',
  'Luis Fernández',
  '3135678901',
  'comercial@agroquimicosdelvalle.com',
  'Km 5 Vía Panamericana',
  'Palmira',
  ARRAY['Fertilizantes', 'Pesticidas', 'Herbicidas', 'Insumos agrícolas'],
  true,
  NOW()
),

-- Proveedor 6: Panadería
(
  'PROV-006',
  'Panadería y Pastelería El Trigo',
  '900678901-2',
  'Sofia López',
  '3146789012',
  'pedidos@panaderiaeltrigo.com',
  'Carrera 30 #45-60',
  'Bogotá',
  ARRAY['Pan', 'Pasteles', 'Productos de panadería', 'Harinas'],
  true,
  NOW()
),

-- Proveedor 7: Bebidas
(
  'PROV-007',
  'Distribuidora de Bebidas Refrescos',
  '900789012-3',
  'Pedro Ramírez',
  '3198765432',
  'ventas@refrescosdist.com',
  'Zona Industrial Calle 80',
  'Bogotá',
  ARRAY['Bebidas', 'Refrescos', 'Jugos', 'Agua'],
  true,
  NOW()
),

-- Proveedor 8: Empaque
(
  'PROV-008',
  'Empaques y Envases Plásticos S.A.',
  '900890123-4',
  'Laura Jiménez',
  '3102345678',
  'comercial@empaquesplasticos.com',
  'Parque Industrial Norte',
  'Medellín',
  ARRAY['Empaques', 'Envases', 'Bolsas plásticas', 'Material de empaque'],
  true,
  NOW()
)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar inserción
SELECT 
  id,
  codigo,
  nombre,
  nit,
  contacto_nombre,
  contacto_telefono,
  ciudad,
  activo
FROM proveedores
ORDER BY codigo;

-- Mostrar estadísticas
SELECT 
  COUNT(*) as total_proveedores,
  COUNT(*) FILTER (WHERE activo = true) as activos,
  COUNT(*) FILTER (WHERE activo = false) as inactivos
FROM proveedores;
