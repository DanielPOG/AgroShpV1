const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const fechaInicio = new Date("2025-12-09");
  const fechaFin = new Date("2025-12-16T23:59:59");

  console.log(
    "=== CONSULTA CORREGIDA: Ventas por método de pago (proporcional) ==="
  );
  const metodosPago = await prisma.$queryRaw`
    SELECT 
      mp.nombre as metodo_pago,
      COALESCE(SUM(
        CASE 
          WHEN (SELECT SUM(monto) FROM pagos_venta WHERE venta_id = v.id) > 0
          THEN v.total * (pv.monto / (SELECT SUM(monto) FROM pagos_venta WHERE venta_id = v.id))
          ELSE 0
        END
      ), 0) as total,
      COUNT(DISTINCT pv.venta_id) as cantidad_transacciones
    FROM metodos_pago mp
    LEFT JOIN pagos_venta pv ON pv.metodo_pago_id = mp.id
    LEFT JOIN ventas v ON v.id = pv.venta_id
    WHERE mp.activo = true
      AND (v.fecha_venta IS NULL OR (
        v.fecha_venta >= ${fechaInicio}
        AND v.fecha_venta <= ${fechaFin}
        AND v.estado = 'completada'
      ))
    GROUP BY mp.nombre
    ORDER BY total DESC
  `;

  console.log("Resultados:");
  let totalGeneral = 0;
  metodosPago.forEach((m) => {
    const total = Number(m.total);
    totalGeneral += total;
    console.log(
      `  ${m.metodo_pago}: $${total.toFixed(2)} (${
        m.cantidad_transacciones
      } transacciones)`
    );
  });
  console.log(`\n📊 TOTAL GENERAL: $${totalGeneral.toFixed(2)}`);

  console.log("\n=== Comparación con total de ventas ===");
  const [ventasTotal] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(total), 0) as total_ventas
    FROM ventas
    WHERE fecha_venta >= ${fechaInicio}
      AND fecha_venta <= ${fechaFin}
      AND estado = 'completada'
  `;
  console.log(
    `Total en tabla ventas: $${Number(ventasTotal.total_ventas).toFixed(2)}`
  );
  console.log(
    `Diferencia: $${(Number(ventasTotal.total_ventas) - totalGeneral).toFixed(
      2
    )}`
  );

  await prisma.$disconnect();
})();
