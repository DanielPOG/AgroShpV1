/**
 * @fileoverview API para estadísticas del dashboard principal
 * @description Obtiene métricas generales del sistema
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const ahora = new Date()
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const finHoy = new Date(inicioHoy)
    finHoy.setDate(finHoy.getDate() + 1)

    const inicioAyer = new Date(inicioHoy)
    inicioAyer.setDate(inicioAyer.getDate() - 1)

    const anioActual = ahora.getFullYear()
    const inicioAnio = new Date(anioActual, 0, 1) // 1 de enero
    const finAnio = new Date(anioActual, 11, 31, 23, 59, 59) // 31 de diciembre

    // Obtener datos en paralelo
    const [
      ventasHoy,
      ventasAyer,
      inventarioTotal,
      productosActivos,
      productosBajoStock,
      ventasSemana,
      metodosPago,
      productosMasVendidos,
      actividadesRecientes,
      metaVentas,
      ventasAnio
    ] = await Promise.all([
      // Ventas de hoy
      prisma.$queryRaw<Array<{
        total_ventas: Prisma.Decimal
        cantidad_ventas: bigint
      }>>`
        SELECT 
          COALESCE(SUM(total), 0) as total_ventas,
          COUNT(id) as cantidad_ventas
        FROM ventas
        WHERE fecha_venta >= ${inicioHoy}
          AND fecha_venta < ${finHoy}
          AND estado = 'completada'
      `,
      
      // Ventas de ayer para comparación
      prisma.$queryRaw<Array<{
        total_ventas: Prisma.Decimal
      }>>`
        SELECT 
          COALESCE(SUM(total), 0) as total_ventas
        FROM ventas
        WHERE fecha_venta >= ${inicioAyer}
          AND fecha_venta < ${inicioHoy}
          AND estado = 'completada'
      `,
      
      // Inventario total
      prisma.$queryRaw<Array<{
        total_items: bigint
        valor_total: Prisma.Decimal
      }>>`
        SELECT 
          COALESCE(SUM(stock_actual), 0) as total_items,
          COALESCE(SUM(stock_actual * precio_unitario), 0) as valor_total
        FROM productos
        WHERE activo = true
      `,
      
      // Productos activos
      prisma.productos.count({ where: { activo: true } }),
      
      // Productos bajo stock
      prisma.productos.count({
        where: {
          activo: true,
          stock_actual: {
            lt: prisma.productos.fields.stock_minimo
          }
        }
      }),
      
      // Ventas de los últimos 7 días
      prisma.$queryRaw<Array<{
        dia: Date
        total_ventas: Prisma.Decimal
      }>>`
        SELECT 
          DATE_TRUNC('day', fecha_venta) as dia,
          COALESCE(SUM(total), 0) as total_ventas
        FROM ventas
        WHERE fecha_venta >= ${new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)}
          AND estado = 'completada'
        GROUP BY dia
        ORDER BY dia ASC
      `,
      
      // Métodos de pago (últimos 7 días)
      prisma.$queryRaw<Array<{
        metodo_pago: string
        total: Prisma.Decimal
        cantidad: bigint
      }>>`
        SELECT 
          mp.nombre as metodo_pago,
          COALESCE(SUM(
            CASE 
              WHEN (SELECT SUM(monto) FROM pagos_venta WHERE venta_id = v.id) > 0
              THEN v.total * (pv.monto / (SELECT SUM(monto) FROM pagos_venta WHERE venta_id = v.id))
              ELSE 0
            END
          ), 0) as total,
          COUNT(DISTINCT pv.venta_id) as cantidad
        FROM metodos_pago mp
        LEFT JOIN pagos_venta pv ON pv.metodo_pago_id = mp.id
        LEFT JOIN ventas v ON v.id = pv.venta_id
        WHERE mp.activo = true
          AND (v.fecha_venta IS NULL OR (
            v.fecha_venta >= ${new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)}
            AND v.estado = 'completada'
          ))
        GROUP BY mp.nombre
        ORDER BY total DESC
      `,
      
      // Productos más vendidos (últimos 7 días)
      prisma.$queryRaw<Array<{
        producto_id: number
        nombre: string
        cantidad_vendida: Prisma.Decimal
        ingresos: Prisma.Decimal
      }>>`
        SELECT 
          p.id as producto_id,
          p.nombre,
          COALESCE(SUM(dv.cantidad), 0) as cantidad_vendida,
          COALESCE(SUM(dv.subtotal), 0) as ingresos
        FROM productos p
        INNER JOIN detalle_ventas dv ON dv.producto_id = p.id
        INNER JOIN ventas v ON v.id = dv.venta_id
        WHERE v.fecha_venta >= ${new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)}
          AND v.estado = 'completada'
        GROUP BY p.id, p.nombre
        ORDER BY cantidad_vendida DESC
        LIMIT 5
      `,
      
      // Actividades recientes (últimas 10)
      prisma.$queryRaw<Array<{
        tipo: string
        mensaje: string
        fecha: Date
        usuario: string
      }>>`
        (
          SELECT 
            'venta' as tipo,
            'Venta #' || v.id || ' por $' || ROUND(v.total)::text as mensaje,
            v.fecha_venta as fecha,
            COALESCE(u.nombre, 'Sistema') as usuario
          FROM ventas v
          LEFT JOIN usuarios u ON u.id = v.usuario_id
          WHERE v.estado = 'completada'
          ORDER BY v.fecha_venta DESC
          LIMIT 5
        )
        
        UNION ALL
        
        (
          SELECT 
            'movimiento' as tipo,
            h.tipo_movimiento || ' de ' || ROUND(ABS(h.cantidad_movimiento))::text || ' ' || p.nombre as mensaje,
            h.fecha_movimiento as fecha,
            COALESCE(u.nombre, 'Sistema') as usuario
          FROM historial_inventario h
          INNER JOIN productos p ON p.id = h.producto_id
          LEFT JOIN usuarios u ON u.id = h.usuario_id
          WHERE h.tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'traspaso')
          ORDER BY h.fecha_movimiento DESC
          LIMIT 3
        )
        
        UNION ALL
        
        (
          SELECT 
            'bajo_stock' as tipo,
            p.nombre || ' bajo stock (' || p.stock_actual::text || ' unidades)' as mensaje,
            CURRENT_TIMESTAMP as fecha,
            'Sistema' as usuario
          FROM productos p
          WHERE p.activo = true 
            AND p.stock_actual < p.stock_minimo
            AND p.stock_actual > 0
          ORDER BY p.stock_actual ASC
          LIMIT 2
        )
        ORDER BY fecha DESC
      `,
      
      // Meta de ventas activa del año actual
      prisma.metas_ventas.findFirst({
        where: {
          anio: anioActual,
          activa: true
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      
      // Total de ventas del año para la meta
      prisma.$queryRaw<Array<{
        total_ventas_anio: Prisma.Decimal
      }>>`
        SELECT 
          COALESCE(SUM(total), 0) as total_ventas_anio
        FROM ventas
        WHERE fecha_venta >= ${inicioAnio}
          AND fecha_venta <= ${finAnio}
          AND estado = 'completada'
      `
    ])

    const totalVentasHoy = Number(ventasHoy[0]?.total_ventas || 0)
    const cantidadVentasHoy = Number(ventasHoy[0]?.cantidad_ventas || 0)
    const totalVentasAyer = Number(ventasAyer[0]?.total_ventas || 0)
    const totalVentasAnio = Number(ventasAnio[0]?.total_ventas_anio || 0)
    
    // Calcular tendencia
    const cambioVentas = totalVentasAyer > 0 
      ? ((totalVentasHoy - totalVentasAyer) / totalVentasAyer) * 100 
      : 0

    // Preparar datos de meta
    let metaData = null
    if (metaVentas) {
      const montoObjetivo = Number(metaVentas.monto_objetivo)
      const porcentaje = montoObjetivo > 0 ? (totalVentasAnio / montoObjetivo) * 100 : 0
      
      metaData = {
        id: metaVentas.id,
        nombre: metaVentas.nombre,
        monto_objetivo: montoObjetivo,
        anio: metaVentas.anio,
        monto_actual: totalVentasAnio,
        porcentaje: Math.round(porcentaje * 10) / 10 // Redondear a 1 decimal
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ventas_hoy: {
          total: totalVentasHoy,
          cantidad: cantidadVentasHoy,
          tendencia: cambioVentas
        },
        inventario: {
          total_items: Number(inventarioTotal[0]?.total_items || 0),
          valor_total: Number(inventarioTotal[0]?.valor_total || 0)
        },
        productos_activos: productosActivos,
        productos_bajo_stock: productosBajoStock,
        ventas_semana: ventasSemana.map(v => ({
          dia: v.dia,
          total: Number(v.total_ventas)
        })),
        metodos_pago: metodosPago.map(m => ({
          nombre: m.metodo_pago,
          total: Number(m.total),
          cantidad: Number(m.cantidad)
        })),
        productos_mas_vendidos: productosMasVendidos.map(p => ({
          id: p.producto_id,
          nombre: p.nombre,
          cantidad: Number(p.cantidad_vendida),
          ingresos: Number(p.ingresos)
        })),
        actividades_recientes: actividadesRecientes.map(a => ({
          tipo: a.tipo,
          mensaje: a.mensaje,
          fecha: a.fecha,
          usuario: a.usuario
        })),
        meta_ventas: metaData
      }
    })

  } catch (error) {
    console.error('❌ Error en GET /api/dashboard/stats:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener estadísticas del dashboard',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
