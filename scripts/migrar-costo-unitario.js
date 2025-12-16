const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    console.log(
      "🔧 Iniciando migración: agregar costo_unitario a detalle_ventas\n"
    );

    // 1. Agregar columna costo_unitario
    await prisma.$executeRaw`
      ALTER TABLE detalle_ventas 
      ADD COLUMN IF NOT EXISTS costo_unitario DECIMAL(10, 2)
    `;
    console.log("✅ Columna costo_unitario agregada");

    // 2. Rellenar costos históricos
    const resultado = await prisma.$executeRaw`
      UPDATE detalle_ventas dv
      SET costo_unitario = cp.costo_unitario
      FROM costos_produccion cp
      WHERE dv.lote_id = cp.lote_id
        AND dv.costo_unitario IS NULL
        AND cp.costo_unitario IS NOT NULL
    `;
    console.log(`✅ ${resultado} registros históricos actualizados con costos`);

    // 3. Verificar resultados
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(costo_unitario) as con_costo,
        COUNT(*) - COUNT(costo_unitario) as sin_costo
      FROM detalle_ventas
    `;

    const stat = stats[0];
    const porcentajeCon =
      stat.total > 0
        ? ((Number(stat.con_costo) / Number(stat.total)) * 100).toFixed(1)
        : 0;
    const porcentajeSin =
      stat.total > 0
        ? ((Number(stat.sin_costo) / Number(stat.total)) * 100).toFixed(1)
        : 0;

    console.log("\n📊 RESULTADOS:");
    console.log(`   Total registros: ${stat.total}`);
    console.log(`   Con costo: ${stat.con_costo} (${porcentajeCon}%)`);
    console.log(`   Sin costo: ${stat.sin_costo} (${porcentajeSin}%)`);
    console.log("\n✅ Migración completada exitosamente");
  } catch (error) {
    console.error("❌ Error en la migración:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
