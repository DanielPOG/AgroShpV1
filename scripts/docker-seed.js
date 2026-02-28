// Script de seed simplificado para Docker
// Se ejecuta sin necesidad de tsx/typescript

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...\n");

  // 1. ROLES
  console.log("📋 Creando roles...");
  const roles = await Promise.all([
    prisma.roles.upsert({
      where: { nombre: "Admin" },
      update: {},
      create: {
        nombre: "Admin",
        descripcion: "Acceso total al sistema",
        permisos: { all: true },
      },
    }),
    prisma.roles.upsert({
      where: { nombre: "Inventarista" },
      update: {},
      create: {
        nombre: "Inventarista",
        descripcion: "Gestión de inventario y movimientos",
        permisos: { inventario: true, movimientos: true },
      },
    }),
    prisma.roles.upsert({
      where: { nombre: "Cajero" },
      update: {},
      create: {
        nombre: "Cajero",
        descripcion: "Solo punto de venta",
        permisos: { pos: true, ventas: true },
      },
    }),
    prisma.roles.upsert({
      where: { nombre: "Consulta" },
      update: {},
      create: {
        nombre: "Consulta",
        descripcion: "Solo lectura",
        permisos: { consulta: true, reportes: true },
      },
    }),
  ]);
  console.log(`✅ ${roles.length} roles creados\n`);

  // 2. USUARIOS
  console.log("👤 Creando usuarios...");
  const passwordHash = await bcrypt.hash("agroshop2024", 10);

  await Promise.all([
    prisma.usuarios.upsert({
      where: { email: "admin@sena.edu.co" },
      update: {},
      create: {
        nombre: "Administrador",
        apellido: "SENA",
        email: "admin@sena.edu.co",
        password_hash: passwordHash,
        rol_id: roles[0].id,
        activo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: "inventario@sena.edu.co" },
      update: {},
      create: {
        nombre: "Juan",
        apellido: "Inventarista",
        email: "inventario@sena.edu.co",
        password_hash: passwordHash,
        rol_id: roles[1].id,
        activo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: "cajero@sena.edu.co" },
      update: {},
      create: {
        nombre: "María",
        apellido: "Cajera",
        email: "cajero@sena.edu.co",
        password_hash: passwordHash,
        rol_id: roles[2].id,
        activo: true,
      },
    }),
    prisma.usuarios.upsert({
      where: { email: "consulta@sena.edu.co" },
      update: {},
      create: {
        nombre: "Pedro",
        apellido: "Consultor",
        email: "consulta@sena.edu.co",
        password_hash: passwordHash,
        rol_id: roles[3].id,
        activo: true,
      },
    }),
  ]);
  console.log(`✅ 4 usuarios creados`);
  console.log(`   📧 Email: admin@sena.edu.co | Password: agroshop2024\n`);

  // 3. CATEGORÍAS
  console.log("🏷️  Creando categorías...");
  await Promise.all([
    prisma.categorias.upsert({
      where: { nombre: "Hortalizas" },
      update: {},
      create: {
        nombre: "Hortalizas",
        descripcion: "Vegetales y verduras frescas",
        icono: "leaf",
        color: "#059669",
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: "Lácteos" },
      update: {},
      create: {
        nombre: "Lácteos",
        descripcion: "Leche y productos derivados",
        icono: "milk",
        color: "#3B82F6",
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: "Panadería" },
      update: {},
      create: {
        nombre: "Panadería",
        descripcion: "Pan y productos horneados",
        icono: "croissant",
        color: "#F59E0B",
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: "Cárnicos" },
      update: {},
      create: {
        nombre: "Cárnicos",
        descripcion: "Carnes y embutidos",
        icono: "beef",
        color: "#EF4444",
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: "Huevos" },
      update: {},
      create: {
        nombre: "Huevos",
        descripcion: "Huevos frescos",
        icono: "egg",
        color: "#FBBF24",
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: "Frutas" },
      update: {},
      create: {
        nombre: "Frutas",
        descripcion: "Frutas frescas",
        icono: "apple",
        color: "#EC4899",
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: "Insumos" },
      update: {},
      create: {
        nombre: "Insumos",
        descripcion: "Insumos agrícolas y herramientas",
        icono: "package",
        color: "#6B7280",
      },
    }),
    prisma.categorias.upsert({
      where: { nombre: "Otros" },
      update: {},
      create: {
        nombre: "Otros",
        descripcion: "Otros productos",
        icono: "shopping-bag",
        color: "#8B5CF6",
      },
    }),
  ]);
  console.log(`✅ 8 categorías creadas\n`);

  // 4. UNIDADES PRODUCTIVAS
  console.log("🏭 Creando unidades productivas...");
  await Promise.all([
    prisma.unidades_productivas.upsert({
      where: { codigo: "UP-HUERTA" },
      update: {},
      create: {
        codigo: "UP-HUERTA",
        nombre: "Huerta Orgánica",
        descripcion: "Producción de hortalizas y vegetales",
        tipo: "Huerta",
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: "UP-BOVINOS" },
      update: {},
      create: {
        codigo: "UP-BOVINOS",
        nombre: "Granja Bovina",
        descripcion: "Producción de lácteos y cárnicos bovinos",
        tipo: "Granja",
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: "UP-AVICOLA" },
      update: {},
      create: {
        codigo: "UP-AVICOLA",
        nombre: "Granja Avícola",
        descripcion: "Producción de huevos y carne de pollo",
        tipo: "Granja",
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: "UP-PORCINOS" },
      update: {},
      create: {
        codigo: "UP-PORCINOS",
        nombre: "Granja Porcina",
        descripcion: "Producción de carne de cerdo",
        tipo: "Granja",
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: "UP-PANADERIA" },
      update: {},
      create: {
        codigo: "UP-PANADERIA",
        nombre: "Panadería SENA",
        descripcion: "Producción de pan y productos de panadería",
        tipo: "Panadería",
        activa: true,
      },
    }),
    prisma.unidades_productivas.upsert({
      where: { codigo: "UP-LACTEOS" },
      update: {},
      create: {
        codigo: "UP-LACTEOS",
        nombre: "Planta de Lácteos",
        descripcion: "Procesamiento de leche y derivados",
        tipo: "Procesamiento",
        activa: true,
      },
    }),
  ]);
  console.log(`✅ 6 unidades productivas creadas\n`);

  // 5. MÉTODOS DE PAGO
  console.log("💳 Creando métodos de pago...");
  // Verificar si ya existen
  const existingMetodos = await prisma.metodos_pago.count();
  if (existingMetodos === 0) {
    await prisma.metodos_pago.createMany({
      data: [
        {
          nombre: "Efectivo",
          descripcion: "Pago en efectivo",
          activo: true,
          icono: "banknote",
        },
        {
          nombre: "Nequi",
          descripcion: "Pago por Nequi",
          activo: true,
          icono: "smartphone",
        },
        {
          nombre: "Tarjeta",
          descripcion: "Pago con tarjeta débito/crédito",
          activo: true,
          icono: "credit-card",
        },
        {
          nombre: "Transferencia",
          descripcion: "Transferencia bancaria",
          activo: true,
          icono: "arrow-right-left",
        },
      ],
    });
  }
  console.log(`✅ 4 métodos de pago creados\n`);

  // 6. CONFIGURACIONES
  console.log("⚙️  Creando configuraciones...");
  const configuraciones = [
    {
      clave: "nombre_tienda",
      valor: "AgroShop SENA",
      tipo: "string",
      descripcion: "Nombre de la tienda",
    },
    {
      clave: "email_tienda",
      valor: "agroshop@sena.edu.co",
      tipo: "string",
      descripcion: "Email de contacto",
    },
    {
      clave: "telefono_tienda",
      valor: "(601) 5461500",
      tipo: "string",
      descripcion: "Teléfono de contacto",
    },
    {
      clave: "direccion_tienda",
      valor: "SENA Centro Agropecuario",
      tipo: "string",
      descripcion: "Dirección física",
    },
    {
      clave: "ciudad_tienda",
      valor: "Bogotá",
      tipo: "string",
      descripcion: "Ciudad",
    },
    {
      clave: "iva_porcentaje",
      valor: "19",
      tipo: "number",
      descripcion: "Porcentaje de IVA aplicado",
    },
    {
      clave: "stock_minimo_default",
      valor: "10",
      tipo: "number",
      descripcion: "Stock mínimo por defecto",
    },
    {
      clave: "dias_alerta_vencimiento",
      valor: "7",
      tipo: "number",
      descripcion: "Días antes del vencimiento para alertar",
    },
    {
      clave: "version_sistema",
      valor: "1.0.0",
      tipo: "string",
      descripcion: "Versión actual del sistema",
    },
  ];

  for (const config of configuraciones) {
    await prisma.configuracion.upsert({
      where: { clave: config.clave },
      update: { valor: config.valor },
      create: config,
    });
  }
  console.log(`✅ ${configuraciones.length} configuraciones creadas\n`);

  // 7. DESCUENTOS
  console.log("🎁 Creando descuentos...");
  await Promise.all([
    prisma.descuentos.upsert({
      where: { codigo: "APRENDIZ10" },
      update: {},
      create: {
        codigo: "APRENDIZ10",
        nombre: "Descuento Aprendices",
        descripcion: "Descuento del 10% para aprendices SENA",
        tipo: "porcentaje",
        valor: 10,
        minimo_compra: 0,
        solo_aprendices: true,
        activo: true,
      },
    }),
    prisma.descuentos.upsert({
      where: { codigo: "EMPLEADO15" },
      update: {},
      create: {
        codigo: "EMPLEADO15",
        nombre: "Descuento Empleados",
        descripcion: "Descuento del 15% para empleados SENA",
        tipo: "porcentaje",
        valor: 15,
        minimo_compra: 0,
        solo_empleados: true,
        activo: true,
      },
    }),
    prisma.descuentos.upsert({
      where: { codigo: "MAYORISTA" },
      update: {},
      create: {
        codigo: "MAYORISTA",
        nombre: "Descuento Mayorista",
        descripcion: "Descuento por compra mayor a $100,000",
        tipo: "porcentaje",
        valor: 5,
        minimo_compra: 100000,
        activo: true,
      },
    }),
  ]);
  console.log(`✅ 3 descuentos creados\n`);

  console.log("✅ ¡Seed completado exitosamente!\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
