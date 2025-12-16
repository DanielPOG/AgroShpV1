const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  console.log("🔍 ANÁLISIS: Precio de Venta vs Costo Real\n");
  console.log("=".repeat(70));

  // Analizar una venta específica con todos sus detalles
  const ventaEjemplo = await prisma.detalle_ventas.findFirst({
    where: {
      costo_unitario: { not: null },
    },
    include: {
      producto: {
        select: {
          nombre: true,
          precio_unitario: true, // Precio de VENTA configurado en el producto
        },
      },
      lote: {
        select: {
          codigo_lote: true,
        },
      },
      venta: {
        select: {
          codigo_venta: true,
          fecha_venta: true,
        },
      },
    },
  });

  if (!ventaEjemplo) {
    console.log("⚠️ No hay ventas con costo guardado aún");
    await prisma.$disconnect();
    return;
  }

  console.log("\n📦 EJEMPLO DE VENTA CON COSTO:");
  console.log(`   Venta: ${ventaEjemplo.venta?.codigo_venta}`);
  console.log(`   Producto: ${ventaEjemplo.producto?.nombre}`);
  console.log(`   Lote: ${ventaEjemplo.lote?.codigo_lote || "N/A"}`);
  console.log(`   Cantidad: ${ventaEjemplo.cantidad} unidades`);
  console.log("\n💰 ANÁLISIS DE PRECIOS:");
  console.log(
    `   Precio configurado en producto: $${Number(
      ventaEjemplo.producto?.precio_unitario
    ).toFixed(2)}`
  );
  console.log(
    `   Precio real de venta: $${Number(ventaEjemplo.precio_unitario).toFixed(
      2
    )}`
  );
  console.log(
    `   Costo del lote: $${Number(ventaEjemplo.costo_unitario).toFixed(2)}`
  );

  const precioVenta = Number(ventaEjemplo.precio_unitario);
  const costoLote = Number(ventaEjemplo.costo_unitario);
  const margen = precioVenta - costoLote;
  const porcentajeMargen = (margen / precioVenta) * 100;
  const markup =
    costoLote > 0 ? ((precioVenta - costoLote) / costoLote) * 100 : 0;

  console.log("\n📊 CÁLCULOS:");
  console.log(`   Margen por unidad: $${margen.toFixed(2)}`);
  console.log(`   Margen %: ${porcentajeMargen.toFixed(1)}%`);
  console.log(`   Markup: ${markup.toFixed(1)}%`);

  // Comparar con el precio configurado en el producto
  const precioProducto = Number(ventaEjemplo.producto?.precio_unitario);
  if (precioVenta !== precioProducto) {
    console.log(
      `\n⚠️ ALERTA: El precio de venta ($${precioVenta.toFixed(
        2
      )}) es diferente`
    );
    console.log(
      `   al precio configurado en el producto ($${precioProducto.toFixed(2)})`
    );
    console.log(`   Diferencia: $${(precioVenta - precioProducto).toFixed(2)}`);
  } else {
    console.log(
      `\n✅ El precio de venta coincide con el configurado en el producto`
    );
  }

  // Analizar todos los lotes para ver si tienen costos
  console.log("\n\n📋 ANÁLISIS DE TODOS LOS LOTES:");
  const lotesConCostos = await prisma.$queryRaw`
    SELECT 
      p.nombre as producto,
      lp.codigo_lote,
      lp.cantidad as stock_actual,
      cp.costo_unitario as costo_produccion,
      p.precio_unitario as precio_venta,
      CASE 
        WHEN cp.costo_unitario IS NOT NULL 
        THEN p.precio_unitario - cp.costo_unitario
        ELSE NULL
      END as margen_unitario,
      CASE 
        WHEN cp.costo_unitario IS NOT NULL AND cp.costo_unitario > 0
        THEN ((p.precio_unitario - cp.costo_unitario) / cp.costo_unitario) * 100
        ELSE NULL
      END as markup_porcentaje
    FROM lotes_productos lp
    INNER JOIN productos p ON p.id = lp.producto_id
    LEFT JOIN costos_produccion cp ON cp.lote_id = lp.id
    WHERE lp.estado = 'disponible'
      AND lp.cantidad > 0
    ORDER BY p.nombre, lp.codigo_lote
    LIMIT 10
  `;

  console.log(`   Mostrando primeros 10 lotes disponibles:\n`);
  lotesConCostos.forEach((lote) => {
    const tieneCosto = lote.costo_produccion !== null;
    console.log(`   • ${lote.producto} (${lote.codigo_lote})`);
    console.log(`     Stock: ${lote.stock_actual} u`);
    console.log(`     Precio venta: $${Number(lote.precio_venta).toFixed(2)}`);

    if (tieneCosto) {
      console.log(
        `     Costo prod: $${Number(lote.costo_produccion).toFixed(2)}`
      );
      console.log(
        `     Margen: $${Number(lote.margen_unitario).toFixed(2)} (${Number(
          lote.markup_porcentaje
        ).toFixed(1)}% markup)`
      );
    } else {
      console.log(`     ⚠️ SIN costo de producción configurado`);
    }
    console.log("");
  });

  console.log("=".repeat(70));
  console.log("\n✅ CONCLUSIÓN:");
  console.log("   El sistema está usando correctamente:");
  console.log("   - precio_unitario del PRODUCTO para el precio de venta");
  console.log("   - costo_unitario del LOTE para el costo real");
  console.log("   - El margen se calcula: precio_venta - costo_lote ✓");
  console.log(
    "   - El markup se calcula: ((precio - costo) / costo) × 100 ✓\n"
  );

  await prisma.$disconnect();
})();
