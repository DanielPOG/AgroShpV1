const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  console.log("🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE RENTABILIDAD\n");
  console.log("=".repeat(60));

  // 1. Verificar estructura de detalle_ventas
  console.log("\n1️⃣ ESTRUCTURA DE DATOS:");
  const ultimaVenta = await prisma.detalle_ventas.findFirst({
    orderBy: { id: "desc" },
    include: {
      producto: { select: { nombre: true } },
      lote: { select: { codigo_lote: true } },
    },
  });

  if (ultimaVenta) {
    console.log("   ✅ Campo costo_unitario existe en detalle_ventas");
    console.log(`   📦 Última venta: ${ultimaVenta.producto?.nombre || "N/A"}`);
    console.log(
      `   💰 Precio: $${Number(ultimaVenta.precio_unitario).toFixed(2)}`
    );
    console.log(
      `   🏷️  Costo: ${
        ultimaVenta.costo_unitario
          ? `$${Number(ultimaVenta.costo_unitario).toFixed(2)}`
          : "NULL (no configurado)"
      }`
    );
  }

  // 2. Estado actual de costos
  console.log("\n2️⃣ ESTADO DE COSTOS:");
  const [stats] = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total_ventas,
      COUNT(dv.costo_unitario) as ventas_con_costo,
      COUNT(*) - COUNT(dv.costo_unitario) as ventas_sin_costo,
      COALESCE(SUM(dv.subtotal), 0) as ingresos_totales,
      COALESCE(SUM(dv.cantidad * dv.costo_unitario), 0) as costos_totales
    FROM detalle_ventas dv
    INNER JOIN ventas v ON v.id = dv.venta_id
    WHERE v.estado = 'completada'
  `;

  const porcentajeConCosto =
    Number(stats.total_ventas) > 0
      ? (
          (Number(stats.ventas_con_costo) / Number(stats.total_ventas)) *
          100
        ).toFixed(1)
      : 0;

  console.log(`   Total ventas: ${stats.total_ventas}`);
  console.log(
    `   Con costo guardado: ${stats.ventas_con_costo} (${porcentajeConCosto}%)`
  );
  console.log(`   Sin costo guardado: ${stats.ventas_sin_costo}`);
  console.log(
    `   Ingresos totales: $${Number(stats.ingresos_totales).toFixed(2)}`
  );
  console.log(`   Costos totales: $${Number(stats.costos_totales).toFixed(2)}`);

  const margenBruto =
    Number(stats.ingresos_totales) - Number(stats.costos_totales);
  const porcentajeMargen =
    Number(stats.ingresos_totales) > 0
      ? ((margenBruto / Number(stats.ingresos_totales)) * 100).toFixed(1)
      : 0;
  console.log(
    `   Margen bruto: $${margenBruto.toFixed(2)} (${porcentajeMargen}%)`
  );

  // 3. Productos con rentabilidad calculable
  console.log("\n3️⃣ TOP 5 PRODUCTOS RENTABLES:");
  const productosRentables = await prisma.$queryRaw`
    SELECT 
      p.nombre,
      COUNT(DISTINCT v.id) as num_ventas,
      SUM(dv.cantidad) as cantidad_vendida,
      SUM(dv.subtotal) as ingresos,
      SUM(dv.cantidad * dv.costo_unitario) as costos,
      SUM(dv.subtotal) - SUM(dv.cantidad * dv.costo_unitario) as margen
    FROM detalle_ventas dv
    INNER JOIN ventas v ON v.id = dv.venta_id
    INNER JOIN productos p ON p.id = dv.producto_id
    WHERE v.estado = 'completada'
      AND dv.costo_unitario IS NOT NULL
    GROUP BY p.id, p.nombre
    HAVING SUM(dv.subtotal) > 0
    ORDER BY margen DESC
    LIMIT 5
  `;

  if (productosRentables.length > 0) {
    productosRentables.forEach((p, i) => {
      const margen = Number(p.ingresos) - Number(p.costos);
      const porcentaje =
        Number(p.ingresos) > 0
          ? ((margen / Number(p.ingresos)) * 100).toFixed(1)
          : 0;
      console.log(`   ${i + 1}. ${p.nombre}`);
      console.log(
        `      Ventas: ${p.num_ventas} | Unidades: ${p.cantidad_vendida}`
      );
      console.log(
        `      Ingresos: $${Number(p.ingresos).toFixed(2)} | Costos: $${Number(
          p.costos
        ).toFixed(2)}`
      );
      console.log(`      Margen: $${margen.toFixed(2)} (${porcentaje}%)`);
    });
  } else {
    console.log("   ⚠️ No hay productos con costos configurados aún");
  }

  // 4. Productos sin costo
  console.log("\n4️⃣ PRODUCTOS SIN COSTO CONFIGURADO:");
  const productosSinCosto = await prisma.$queryRaw`
    SELECT 
      p.nombre,
      COUNT(DISTINCT v.id) as num_ventas,
      SUM(dv.cantidad) as cantidad_vendida,
      SUM(dv.subtotal) as ingresos_perdidos
    FROM detalle_ventas dv
    INNER JOIN ventas v ON v.id = dv.venta_id
    INNER JOIN productos p ON p.id = dv.producto_id
    WHERE v.estado = 'completada'
      AND dv.costo_unitario IS NULL
    GROUP BY p.id, p.nombre
    ORDER BY ingresos_perdidos DESC
    LIMIT 5
  `;

  if (productosSinCosto.length > 0) {
    console.log(
      "   ⚠️ Los siguientes productos generaron ventas sin costo guardado:"
    );
    productosSinCosto.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.nombre}`);
      console.log(
        `      Ventas: ${p.num_ventas} | Unidades: ${p.cantidad_vendida}`
      );
      console.log(
        `      Ingresos: $${Number(p.ingresos_perdidos).toFixed(
          2
        )} (sin costo para calcular rentabilidad)`
      );
    });
  } else {
    console.log("   ✅ Todos los productos vendidos tienen costo configurado");
  }

  // 5. Recomendaciones
  console.log("\n5️⃣ RECOMENDACIONES:");
  if (Number(stats.ventas_sin_costo) > 0) {
    console.log("   ⚠️ Configurar costos en los lotes para futuras ventas");
    console.log(
      "   ℹ️  Las ventas actuales sin costo NO se pueden corregir retroactivamente"
    );
    console.log(
      "   ℹ️  Los costos se guardan al momento de la venta automáticamente"
    );
  } else {
    console.log("   ✅ Sistema de rentabilidad configurado correctamente");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Verificación completada\n");

  await prisma.$disconnect();
})();
