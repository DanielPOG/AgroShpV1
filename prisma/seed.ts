import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // =====================================================
  // 1. ROLES
  // =====================================================
  console.log('📋 Creando roles...');
  const roles = await prisma.$transaction([
    prisma.roles.upsert({
      where: { nombre: 'Admin' },
      update: {},
      create: {
        nombre: 'Admin',
        descripcion: 'Acceso total al sistema',
        permisos: { all: true },
      },
    }),
    prisma.roles.upsert({
      where: { nombre: 'Inventarista' },
      update: {},
      create: {
        nombre: 'Inventarista',
        descripcion: 'Gestión de inventario y movimientos',
        permisos: { inventario: true, movimientos: true },
      },
    }),
    prisma.roles.upsert({
      where: { nombre: 'Cajero' },
      update: {},
      create: {
        nombre: 'Cajero',
        descripcion: 'Solo punto de venta',
        permisos: { pos: true, ventas: true },
      },
    }),
    prisma.roles.upsert({
      where: { nombre: 'Consulta' },
      update: {},
      create: {
        nombre: 'Consulta',
        descripcion: 'Solo lectura',
        permisos: { consulta: true, reportes: true },
      },
    }),
  ]);
  console.log(`✅ ${roles.length} roles creados\n`);

  // =====================================================
  // 2. USUARIOS
  // =====================================================
  console.log('👤 Creando usuarios...');
  const passwordHash = await bcrypt.hash('agroshop2024', 10);

  const usuarios = await prisma.$transaction([
    prisma.usuarios.upsert({
      where: { email: 'admin@sena.edu.co' },
      update: {},
      create: {
        nombre: 'Administrador',
        apellido: 'SENA',
        email: 'admin@sena.edu.co',
        password_hash: passwordHash,
        rol_id: roles[0].id,
        activo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: 'inventario@sena.edu.co' },
      update: {},
      create: {
        nombre: 'Juan',
        apellido: 'Inventarista',
        email: 'inventario@sena.edu.co',
        password_hash: passwordHash,
        rol_id: roles[1].id,
        activo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: 'cajero@sena.edu.co' },
      update: {},
      create: {
        nombre: 'María',
        apellido: 'Cajera',
        email: 'cajero@sena.edu.co',
        password_hash: passwordHash,
        rol_id: roles[2].id,
        activo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: 'consulta@sena.edu.co' },
      update: {},
      create: {
        nombre: 'Pedro',
        apellido: 'Consultor',
        email: 'consulta@sena.edu.co',
        password_hash: passwordHash,
        rol_id: roles[3].id,
        activo: true,
      },
    }),
  ]);
  console.log(`✅ ${usuarios.length} usuarios creados`);
  console.log(`   📧 Email: admin@sena.edu.co | Password: agroshop2024\n`);

  // =====================================================
  // 3. CATEGORÍAS
  // =====================================================
  console.log('🏷️  Creando categorías...');
  const categorias = await prisma.$transaction([
    prisma.categorias.upsert({
      where: { nombre: 'Hortalizas' },
      update: {},
      create: {
        nombre: 'Hortalizas',
        descripcion: 'Vegetales y verduras frescas',
        icono: 'leaf',
        color: '#059669',
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: 'Lácteos' },
      update: {},
      create: {
        nombre: 'Lácteos',
        descripcion: 'Leche y productos derivados',
        icono: 'milk',
        color: '#3B82F6',
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: 'Panadería' },
      update: {},
      create: {
        nombre: 'Panadería',
        descripcion: 'Pan y productos horneados',
        icono: 'croissant',
        color: '#F59E0B',
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: 'Cárnicos' },
      update: {},
      create: {
        nombre: 'Cárnicos',
        descripcion: 'Carnes y embutidos',
        icono: 'beef',
        color: '#EF4444',
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: 'Huevos' },
      update: {},
      create: {
        nombre: 'Huevos',
        descripcion: 'Huevos frescos',
        icono: 'egg',
        color: '#FBBF24',
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: 'Frutas' },
      update: {},
      create: {
        nombre: 'Frutas',
        descripcion: 'Frutas frescas',
        icono: 'apple',
        color: '#EC4899',
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: 'Insumos' },
      update: {},
      create: {
        nombre: 'Insumos',
        descripcion: 'Insumos agrícolas y herramientas',
        icono: 'package',
        color: '#6B7280',
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: 'Otros' },
      update: {},
      create: {
        nombre: 'Otros',
        descripcion: 'Otros productos',
        icono: 'shopping-bag',
        color: '#8B5CF6',
      },
    }),
  ]);
  console.log(`✅ ${categorias.length} categorías creadas\n`);

  // =====================================================
  // 4. UNIDADES PRODUCTIVAS
  // =====================================================
  console.log('🏭 Creando unidades productivas...');
  const unidades = await prisma.$transaction([
    prisma.unidades_productivas.upsert({
      where: { codigo: 'UP-HUERTA' },
      update: {},
      create: {
        codigo: 'UP-HUERTA',
        nombre: 'Huerta Orgánica',
        descripcion: 'Producción de hortalizas y vegetales',
        tipo: 'Huerta',
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: 'UP-BOVINOS' },
      update: {},
      create: {
        codigo: 'UP-BOVINOS',
        nombre: 'Granja Bovina',
        descripcion: 'Producción de lácteos y cárnicos bovinos',
        tipo: 'Granja',
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: 'UP-AVICOLA' },
      update: {},
      create: {
        codigo: 'UP-AVICOLA',
        nombre: 'Granja Avícola',
        descripcion: 'Producción de huevos y carne de pollo',
        tipo: 'Granja',
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: 'UP-PORCINOS' },
      update: {},
      create: {
        codigo: 'UP-PORCINOS',
        nombre: 'Granja Porcina',
        descripcion: 'Producción de carne de cerdo',
        tipo: 'Granja',
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: 'UP-PANADERIA' },
      update: {},
      create: {
        codigo: 'UP-PANADERIA',
        nombre: 'Panadería SENA',
        descripcion: 'Producción de pan y productos de panadería',
        tipo: 'Panadería',
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: 'UP-LACTEOS' },
      update: {},
      create: {
        codigo: 'UP-LACTEOS',
        nombre: 'Planta de Lácteos',
        descripcion: 'Procesamiento de leche y derivados',
        tipo: 'Procesamiento',
        activa: true,
      },
    }),
  ]);
  console.log(`✅ ${unidades.length} unidades productivas creadas\n`);

  // =====================================================
  // 5. MÉTODOS DE PAGO
  // =====================================================
  console.log('💳 Creando métodos de pago...');
  const metodosPago = await prisma.$transaction([
    prisma.metodos_pago.create({
      data: {
        nombre: 'Efectivo',
        descripcion: 'Pago en efectivo',
        activo: true,
        icono: 'banknote',
      },
    }),
    prisma.metodos_pago.create({
      data: {
        nombre: 'Nequi',
        descripcion: 'Pago por Nequi',
        activo: true,
        icono: 'smartphone',
      },
    }),
    prisma.metodos_pago.create({
      data: {
        nombre: 'Tarjeta',
        descripcion: 'Pago con tarjeta débito/crédito',
        activo: true,
        icono: 'credit-card',
      },
    }),
    prisma.metodos_pago.create({
      data: {
        nombre: 'Transferencia',
        descripcion: 'Transferencia bancaria',
        activo: true,
        icono: 'arrow-right-left',
      },
    }),
  ]);
  console.log(`✅ ${metodosPago.length} métodos de pago creados\n`);

  // =====================================================
  // 6. CONFIGURACIONES
  // =====================================================
  console.log('⚙️  Creando configuraciones...');
  const configuraciones = [
    // Información de la tienda
    { clave: 'nombre_tienda', valor: 'AgroShop SENA', tipo: 'string', descripcion: 'Nombre de la tienda' },
    { clave: 'email_tienda', valor: 'agroshop@sena.edu.co', tipo: 'string', descripcion: 'Email de contacto' },
    { clave: 'telefono_tienda', valor: '(601) 5461500', tipo: 'string', descripcion: 'Teléfono de contacto' },
    { clave: 'direccion_tienda', valor: 'SENA Centro Agropecuario', tipo: 'string', descripcion: 'Dirección física' },
    { clave: 'ciudad_tienda', valor: 'Bogotá', tipo: 'string', descripcion: 'Ciudad' },
    
    // Impuestos
    { clave: 'iva_porcentaje', valor: '19', tipo: 'number', descripcion: 'Porcentaje de IVA aplicado (Colombia = 19%)' },
    
    // Inventario
    { clave: 'stock_minimo_default', valor: '10', tipo: 'number', descripcion: 'Stock mínimo por defecto al crear nuevos productos' },
    { clave: 'dias_alerta_vencimiento', valor: '7', tipo: 'number', descripcion: 'Días antes del vencimiento para alertar' },
    
    // Sistema
    { clave: 'version_sistema', valor: '1.0.0', tipo: 'string', descripcion: 'Versión actual del sistema' },
  ];

  for (const config of configuraciones) {
    await prisma.configuracion.upsert({
      where: { clave: config.clave },
      update: { valor: config.valor },
      create: config,
    });
  }
  console.log(`✅ ${configuraciones.length} configuraciones creadas\n`);

  // =====================================================
  // 7. DESCUENTOS
  // =====================================================
  console.log('🎁 Creando descuentos...');
  const descuentos = await prisma.$transaction([
    prisma.descuentos.upsert({
      where: { codigo: 'APRENDIZ10' },
      update: {},
      create: {
        codigo: 'APRENDIZ10',
        nombre: 'Descuento Aprendices',
        descripcion: 'Descuento del 10% para aprendices SENA',
        tipo: 'porcentaje',
        valor: 10,
        minimo_compra: 0,
        solo_aprendices: true,
        activo: true,
      },
    }),
    prisma.descuentos.upsert({
      where: { codigo: 'EMPLEADO15' },
      update: {},
      create: {
        codigo: 'EMPLEADO15',
        nombre: 'Descuento Empleados',
        descripcion: 'Descuento del 15% para empleados SENA',
        tipo: 'porcentaje',
        valor: 15,
        minimo_compra: 0,
        solo_empleados: true,
        activo: true,
      },
    }),
    prisma.descuentos.upsert({
      where: { codigo: 'MAYORISTA' },
      update: {},
      create: {
        codigo: 'MAYORISTA',
        nombre: 'Descuento Mayorista',
        descripcion: 'Descuento por compra mayor a $100,000',
        tipo: 'porcentaje',
        valor: 5,
        minimo_compra: 100000,
        activo: true,
      },
    }),
  ]);
  console.log(`✅ ${descuentos.length} descuentos creados\n`);

  // =====================================================
  // 8. CLIENTES DE EJEMPLO
  // =====================================================
  console.log('👥 Creando clientes de ejemplo...');
  const clientes = await prisma.$transaction([
    prisma.clientes.create({
      data: {
        tipo_cliente: 'ocasional',
        tipo_documento: 'CC',
        numero_documento: '1234567890',
        nombre: 'Cliente',
        apellido: 'General',
        email: 'cliente@example.com',
        telefono: '3001234567',
        activo: true,
      },
    }),
    prisma.clientes.create({
      data: {
        tipo_cliente: 'institucional',
        tipo_documento: 'NIT',
        numero_documento: '900123456',
        nombre: 'SENA Regional',
        email: 'regional@sena.edu.co',
        telefono: '6015461500',
        es_institucional: true,
        activo: true,
      },
    }),
  ]);
  console.log(`✅ ${clientes.length} clientes creados\n`);

  // =====================================================
  // 9. PROVEEDORES
  // =====================================================
  console.log('🚚 Creando proveedores...');
  const proveedores = await prisma.$transaction([
    prisma.proveedores.upsert({
      where: { codigo: 'PROV-001' },
      update: {},
      create: {
        codigo: 'PROV-001',
        nombre: 'Lácteos San Fernando',
        nit: '900123456-7',
        contacto_nombre: 'Juan Pérez',
        contacto_telefono: '3101234567',
        contacto_email: 'ventas@lacteossanfernando.com',
        direccion: 'Calle 50 #25-30',
        ciudad: 'Bogotá',
        tipo_productos: ['Lácteos', 'Derivados lácteos', 'Quesos', 'Yogurt'],
        activo: true,
      },
    }),
    prisma.proveedores.upsert({
      where: { codigo: 'PROV-002' },
      update: {},
      create: {
        codigo: 'PROV-002',
        nombre: 'Frutas y Verduras El Campo',
        nit: '900234567-8',
        contacto_nombre: 'María González',
        contacto_telefono: '3109876543',
        contacto_email: 'pedidos@frutaselcampo.com',
        direccion: 'Carrera 15 #80-45',
        ciudad: 'Medellín',
        tipo_productos: ['Frutas', 'Verduras', 'Hortalizas', 'Productos frescos'],
        activo: true,
      },
    }),
    prisma.proveedores.upsert({
      where: { codigo: 'PROV-003' },
      update: {},
      create: {
        codigo: 'PROV-003',
        nombre: 'Carnes y Embutidos Don José',
        nit: '900345678-9',
        contacto_nombre: 'Carlos Rodríguez',
        contacto_telefono: '3157654321',
        contacto_email: 'info@carnesdoñjose.com',
        direccion: 'Avenida 6 #12-30',
        ciudad: 'Cali',
        tipo_productos: ['Carnes', 'Embutidos', 'Productos cárnicos', 'Pollo'],
        activo: true,
      },
    }),
  ]);
  console.log(`✅ ${proveedores.length} proveedores creados\n`);

  console.log('✅ ¡Seed completado exitosamente!\n');
  console.log('📝 Resumen:');
  console.log(`   - ${roles.length} roles`);
  console.log(`   - ${usuarios.length} usuarios`);
  console.log(`   - ${categorias.length} categorías`);
  console.log(`   - ${unidades.length} unidades productivas`);
  console.log(`   - ${metodosPago.length} métodos de pago`);
  console.log(`   - ${configuraciones.length} configuraciones`);
  console.log(`   - ${descuentos.length} descuentos`);
  console.log(`   - ${clientes.length} clientes`);
  console.log(`   - ${proveedores.length} proveedores`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
