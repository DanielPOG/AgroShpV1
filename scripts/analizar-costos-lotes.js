const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  console.log("=== ANÁLISIS DE COSTOS DE PRODUCCIÓN POR LOTE ===\n");

  // 1. Ventas con lotes
  console.log("1. Total de ventas en detalle_ventas:");
  const totalVentas = await prisma.detalle_ventas.count();
  console.log(`   Total registros: ${totalVentas}`);

  // 2. Ventas con lote_id
  const ventasConLote = await prisma.detalle_ventas.count({
    where: { lote_id: { not: null } },
  });
  console.log(`   Con lote_id: ${ventasConLote}`);
  console.log(`   Sin lote_id: ${totalVentas - ventasConLote}`);

  // 3. Lotes que tienen costos
  console.log("\n2. Análisis de lotes:");
  const totalLotes = await prisma.lotes_productos.count();
  console.log(`   Total lotes: ${totalLotes}`);

  const lotesConCostos = await prisma.costos_produccion.count();
  console.log(`   Lotes con costos: ${lotesConCostos}`);
  console.log(`   Lotes sin costos: ${totalLotes - lotesConCostos}`);

  // 4. Ventas de lotes sin costos
  console.log("\n3. Ventas de productos por lote:");
  const ventasPorLote = await prisma.$queryRaw`
    SELECT 
      lp.id as lote_id,
      lp.codigo_lote,
      p.nombre as producto,
      COALESCE(SUM(dv.cantidad), 0) as cantidad_vendida,
      COALESCE(SUM(dv.subtotal), 0) as ingresos,
      cp.costo_unitario,
      CASE 
        WHEN cp.costo_unitario IS NOT NULL 
        THEN COALESCE(SUM(dv.cantidad), 0) * cp.costo_unitario
        ELSE NULL
      END as costo_total
    FROM detalle_ventas dv
    INNER JOIN lotes_productos lp ON lp.id = dv.lote_id
    INNER JOIN productos p ON p.id = dv.producto_id
    LEFT JOIN costos_produccion cp ON cp.lote_id = lp.id
    GROUP BY lp.id, lp.codigo_lote, p.nombre, cp.costo_unitario
    HAVING COALESCE(SUM(dv.cantidad), 0) > 0
    ORDER BY ingresos DESC
    LIMIT 10
  `;

  console.log("\n   Top 10 lotes vendidos:");
  ventasPorLote.forEach((v) => {
    const costo = v.costo_unitario
      ? `$${Number(v.costo_unitario).toFixed(2)}/u`
      : "SIN COSTO";
    const costoTotal = v.costo_total
      ? `$${Number(v.costo_total).toFixed(2)}`
      : "N/A";
    console.log(`   - ${v.codigo_lote} (${v.producto})`);
    console.log(
      `     Vendidas: ${v.cantidad_vendida} u | Ingresos: $${Number(
        v.ingresos
      ).toFixed(2)}`
    );
    console.log(`     Costo: ${costo} | Costo Total: ${costoTotal}`);
  });

  // 5. Verificar si hay ventas sin lote_id
  console.log("\n4. Ventas sin lote asignado:");
  const ventasSinLote = await prisma.detalle_ventas.findMany({
    where: { lote_id: null },
    include: {
      producto: { select: { nombre: true } },
      venta: { select: { codigo_venta: true, fecha_venta: true } },
    },
    take: 5,
  });

  if (ventasSinLote.length > 0) {
    console.log(
      `   ⚠️ Hay ${totalVentas - ventasConLote} ventas sin lote asignado:`
    );
    ventasSinLote.forEach((v) => {
      console.log(
        `   - ${v.venta?.codigo_venta}: ${v.producto?.nombre} (${v.cantidad} u)`
      );
    });
  } else {
    console.log("   ✅ Todas las ventas tienen lote asignado");
  }

  await prisma.$disconnect();
})();
