const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const fechaInicio = new Date("2025-12-09");
  const fechaFin = new Date("2025-12-16T23:59:59");

  console.log("=== CONSULTA 1: Total desde tabla VENTAS ===");
  const ventas = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(total), 0) as total_ventas,
      COUNT(id) as cantidad
    FROM ventas
    WHERE fecha_venta >= ${fechaInicio}
      AND fecha_venta <= ${fechaFin}
      AND estado = 'completada'
  `;
  console.log("Total ventas:", ventas[0]);

  console.log("\n=== CONSULTA 2: Total desde tabla PAGOS_VENTA ===");
  const pagos = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(pv.monto), 0) as total_pagos,
      COUNT(DISTINCT pv.venta_id) as ventas_con_pago
    FROM pagos_venta pv
    INNER JOIN ventas v ON v.id = pv.venta_id
    WHERE v.fecha_venta >= ${fechaInicio}
      AND v.fecha_venta <= ${fechaFin}
      AND v.estado = 'completada'
  `;
  console.log("Total pagos:", pagos[0]);

  console.log(
    "\n=== CONSULTA 3: Verificar ventas sin pagos o con diferencias ==="
  );
  const diferencias = await prisma.$queryRaw`
    SELECT 
      v.id,
      v.codigo_venta,
      v.total as total_venta,
      COALESCE(SUM(pv.monto), 0) as total_pagos,
      v.total - COALESCE(SUM(pv.monto), 0) as diferencia
    FROM ventas v
    LEFT JOIN pagos_venta pv ON pv.venta_id = v.id
    WHERE v.fecha_venta >= ${fechaInicio}
      AND v.fecha_venta <= ${fechaFin}
      AND v.estado = 'completada'
    GROUP BY v.id, v.codigo_venta, v.total
    HAVING v.total != COALESCE(SUM(pv.monto), 0)
    ORDER BY v.id
  `;
  console.log("Ventas con diferencias:", diferencias.length, "ventas");
  if (diferencias.length > 0) {
    console.log("Primeras 5 diferencias:");
    diferencias.slice(0, 5).forEach((d) => {
      console.log(
        `  Venta ${d.codigo_venta}: Total=$${d.total_venta}, Pagos=$${d.total_pagos}, Diferencia=$${d.diferencia}`
      );
    });
  }

  await prisma.$disconnect();
})();
