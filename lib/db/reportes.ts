/**
 * @fileoverview Funciones de base de datos para reportes y estadísticas
 * @description Sistema completo de reportes con datos reales para producción
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * REPORTES DE VENTAS
 */

export interface VentasPorPeriodo {
  periodo: Date
  total_ventas: number
  cantidad_ventas: number
  ticket_promedio: number
}

export interface ProductoMasVendido {
  producto_id: number
  codigo: string
  nombre: string
  cantidad_vendida: number
  total_ingresos: number
  veces_vendido: number
}

export interface VentasPorMetodoPago {
  metodo_pago: string
  total: number
  cantidad_transacciones: number
  porcentaje: number
}

export interface EstadisticasVentas {
  total_ventas: number
  cantidad_transacciones: number
  ticket_promedio: number
  total_descuentos: number
  comparacion_periodo_anterior: {
    diferencia_ventas: number
    porcentaje_cambio: number
  }
}

/**
 * Obtener ventas por día/mes/año con estadísticas
 */
export async function getVentasPorPeriodo(
  fechaInicio: Date,
  fechaFin: Date,
  agruparPor: 'dia' | 'mes' | 'año' = 'dia'
): Promise<VentasPorPeriodo[]> {
  try {
    // Mapear valores en español a inglés para PostgreSQL
    let dateTruncUnit: string
    switch (agruparPor) {
      case 'dia':
        dateTruncUnit = 'day'
        break
      case 'mes':
        dateTruncUnit = 'month'
        break
      case 'año':
        dateTruncUnit = 'year'
        break
      default:
        dateTruncUnit = 'day'
    }

    const ventas = await prisma.$queryRaw<VentasPorPeriodo[]>`
      SELECT 
        DATE_TRUNC(${dateTruncUnit}, v.fecha_venta) as periodo,
        COALESCE(SUM(v.total), 0)::DECIMAL as total_ventas,
        COUNT(v.id)::INTEGER as cantidad_ventas,
        COALESCE(AVG(v.total), 0)::DECIMAL as ticket_promedio
      FROM ventas v
      WHERE v.fecha_venta >= ${fechaInicio}
        AND v.fecha_venta <= ${fechaFin}
        AND v.estado = 'completada'
      GROUP BY periodo
      ORDER BY periodo ASC
    `

    return ventas.map(v => ({
      ...v,
      total_ventas: Number(v.total_ventas),
      ticket_promedio: Number(v.ticket_promedio)
    }))
  } catch (error) {
    console.error('❌ Error al obtener ventas por período:', error)
    throw new Error('Error al obtener ventas por período')
  }
}

/**
 * Obtener estadísticas generales de ventas
 */
export async function getEstadisticasVentas(
  fechaInicio: Date,
  fechaFin: Date
): Promise<EstadisticasVentas> {
  try {
    // Período actual
    const [ventasActuales] = await prisma.$queryRaw<Array<{
      total_ventas: Prisma.Decimal
      cantidad_transacciones: bigint
      ticket_promedio: Prisma.Decimal
      total_descuentos: Prisma.Decimal
    }>>`
      SELECT 
        COALESCE(SUM(total), 0) as total_ventas,
        COUNT(id) as cantidad_transacciones,
        COALESCE(AVG(total), 0) as ticket_promedio,
        COALESCE(SUM(descuento), 0) as total_descuentos
      FROM ventas
      WHERE fecha_venta >= ${fechaInicio}
        AND fecha_venta <= ${fechaFin}
        AND estado = 'completada'
    `

    // Período anterior (mismo rango de días)
    const diasDiferencia = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24))
    const fechaInicioAnterior = new Date(fechaInicio)
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasDiferencia)
    const fechaFinAnterior = new Date(fechaInicio)
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1)

    const [ventasAnteriores] = await prisma.$queryRaw<Array<{
      total_ventas: Prisma.Decimal
    }>>`
      SELECT 
        COALESCE(SUM(total), 0) as total_ventas
      FROM ventas
      WHERE fecha_venta >= ${fechaInicioAnterior}
        AND fecha_venta <= ${fechaFinAnterior}
        AND estado = 'completada'
    `

    const totalActual = Number(ventasActuales?.total_ventas || 0)
    const totalAnterior = Number(ventasAnteriores?.total_ventas || 0)
    const diferencia = totalActual - totalAnterior
    const porcentajeCambio = totalAnterior > 0 
      ? ((diferencia / totalAnterior) * 100) 
      : 0

    return {
      total_ventas: totalActual,
      cantidad_transacciones: Number(ventasActuales?.cantidad_transacciones || 0),
      ticket_promedio: Number(ventasActuales?.ticket_promedio || 0),
      total_descuentos: Number(ventasActuales?.total_descuentos || 0),
      comparacion_periodo_anterior: {
        diferencia_ventas: diferencia,
        porcentaje_cambio: porcentajeCambio
      }
    }
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de ventas:', error)
    throw new Error('Error al obtener estadísticas de ventas')
  }
}

/**
 * Obtener productos más vendidos
 */
export async function getProductosMasVendidos(
  fechaInicio: Date,
  fechaFin: Date,
  limit: number = 10
): Promise<ProductoMasVendido[]> {
  try {
    const productos = await prisma.$queryRaw<ProductoMasVendido[]>`
      SELECT 
        p.id as producto_id,
        p.codigo,
        p.nombre,
        COALESCE(SUM(dv.cantidad), 0)::DECIMAL as cantidad_vendida,
        COALESCE(SUM(dv.subtotal), 0)::DECIMAL as total_ingresos,
        COUNT(DISTINCT v.id)::INTEGER as veces_vendido
      FROM productos p
      INNER JOIN detalle_ventas dv ON dv.producto_id = p.id
      INNER JOIN ventas v ON v.id = dv.venta_id
      WHERE v.fecha_venta >= ${fechaInicio}
        AND v.fecha_venta <= ${fechaFin}
        AND v.estado = 'completada'
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY cantidad_vendida DESC
      LIMIT ${limit}
    `

    return productos.map(p => ({
      ...p,
      cantidad_vendida: Number(p.cantidad_vendida),
      total_ingresos: Number(p.total_ingresos)
    }))
  } catch (error) {
    console.error('❌ Error al obtener productos más vendidos:', error)
    throw new Error('Error al obtener productos más vendidos')
  }
}

/**
 * Obtener ventas por método de pago
 */
export async function getVentasPorMetodoPago(
  fechaInicio: Date,
  fechaFin: Date
): Promise<VentasPorMetodoPago[]> {
  try {
    // Calculamos el total de ventas proporcional a cada método de pago
    // En vez de SUM(pv.monto) que puede incluir cambio, usamos la proporción del total de la venta
    const metodosPago = await prisma.$queryRaw<Array<{
      metodo_pago: string
      total: Prisma.Decimal
      cantidad_transacciones: bigint
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
    `

    const totalGeneral = metodosPago.reduce((sum, m) => sum + Number(m.total), 0)

    return metodosPago.map(m => ({
      metodo_pago: m.metodo_pago,
      total: Number(m.total),
      cantidad_transacciones: Number(m.cantidad_transacciones),
      porcentaje: totalGeneral > 0 ? (Number(m.total) / totalGeneral) * 100 : 0
    }))
  } catch (error) {
    console.error('❌ Error al obtener ventas por método de pago:', error)
    throw new Error('Error al obtener ventas por método de pago')
  }
}

/**
 * Obtener ventas por hora (horas pico)
 */
export async function getVentasPorHora(
  fechaInicio: Date,
  fechaFin: Date
): Promise<Array<{ hora: number; total_ventas: number; cantidad_ventas: number }>> {
  try {
    const ventasPorHora = await prisma.$queryRaw<Array<{
      hora: number
      total_ventas: Prisma.Decimal
      cantidad_ventas: bigint
    }>>`
      SELECT 
        EXTRACT(HOUR FROM fecha_venta)::INTEGER as hora,
        COALESCE(SUM(total), 0) as total_ventas,
        COUNT(id) as cantidad_ventas
      FROM ventas
      WHERE fecha_venta >= ${fechaInicio}
        AND fecha_venta <= ${fechaFin}
        AND estado = 'completada'
      GROUP BY hora
      ORDER BY hora ASC
    `

    return ventasPorHora.map(v => ({
      hora: v.hora,
      total_ventas: Number(v.total_ventas),
      cantidad_ventas: Number(v.cantidad_ventas)
    }))
  } catch (error) {
    console.error('❌ Error al obtener ventas por hora:', error)
    throw new Error('Error al obtener ventas por hora')
  }
}

/**
 * REPORTES DE INVENTARIO
 */

export interface ProductoInventario {
  id: number
  codigo: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  stock_maximo: number | null
  valor_total: number
  estado: 'critico' | 'bajo' | 'normal' | 'exceso'
}

export interface LoteProximoVencer {
  id: number
  codigo_lote: string
  producto_nombre: string
  cantidad: number
  fecha_vencimiento: Date
  dias_restantes: number
}

/**
 * Obtener productos con stock crítico o bajo
 */
export async function getProductosStockCritico(): Promise<ProductoInventario[]> {
  try {
    const productos = await prisma.productos.findMany({
      where: {
        activo: true,
        OR: [
          { stock_actual: 0 },
          {
            stock_actual: {
              lt: prisma.productos.fields.stock_minimo
            }
          }
        ]
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        stock_actual: true,
        stock_minimo: true,
        stock_maximo: true,
        precio_unitario: true
      },
      orderBy: {
        stock_actual: 'asc'
      }
    })

    return productos.map(p => {
      const stockActual = Number(p.stock_actual)
      const stockMinimo = Number(p.stock_minimo)
      const stockMaximo = p.stock_maximo ? Number(p.stock_maximo) : null
      const valorTotal = stockActual * Number(p.precio_unitario)

      let estado: 'critico' | 'bajo' | 'normal' | 'exceso'
      if (stockActual === 0) {
        estado = 'critico'
      } else if (stockActual < stockMinimo) {
        estado = 'bajo'
      } else if (stockMaximo && stockActual >= stockMaximo) {
        estado = 'exceso'
      } else {
        estado = 'normal'
      }

      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        stock_maximo: stockMaximo,
        valor_total: valorTotal,
        estado
      }
    })
  } catch (error) {
    console.error('❌ Error al obtener productos con stock crítico:', error)
    throw new Error('Error al obtener productos con stock crítico')
  }
}

/**
 * Obtener lotes próximos a vencer
 */
export async function getLotesProximosVencer(
  diasAnticipacion: number = 30
): Promise<LoteProximoVencer[]> {
  try {
    const ahora = new Date()
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion)

    const lotes = await prisma.lotes_productos.findMany({
      where: {
        estado: 'disponible',
        fecha_vencimiento: {
          gte: ahora,
          lte: fechaLimite
        }
      },
      include: {
        producto: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        fecha_vencimiento: 'asc'
      }
    })

    return lotes.map(lote => {
      const diasRestantes = Math.ceil(
        (new Date(lote.fecha_vencimiento!).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: lote.id,
        codigo_lote: lote.codigo_lote,
        producto_nombre: lote.producto?.nombre || 'Desconocido',
        cantidad: Number(lote.cantidad),
        fecha_vencimiento: lote.fecha_vencimiento!,
        dias_restantes: diasRestantes
      }
    })
  } catch (error) {
    console.error('❌ Error al obtener lotes próximos a vencer:', error)
    throw new Error('Error al obtener lotes próximos a vencer')
  }
}

/**
 * Obtener valorización total del inventario
 */
export async function getValorizacionInventario(): Promise<{
  total_productos: number
  valor_total: number
  productos_activos: number
}> {
  try {
    const [resultado] = await prisma.$queryRaw<Array<{
      total_productos: bigint
      valor_total: Prisma.Decimal
      productos_activos: bigint
    }>>`
      SELECT 
        COUNT(id) as total_productos,
        COALESCE(SUM(stock_actual * precio_unitario), 0) as valor_total,
        SUM(CASE WHEN activo = true THEN 1 ELSE 0 END) as productos_activos
      FROM productos
    `

    return {
      total_productos: Number(resultado?.total_productos || 0),
      valor_total: Number(resultado?.valor_total || 0),
      productos_activos: Number(resultado?.productos_activos || 0)
    }
  } catch (error) {
    console.error('❌ Error al obtener valorización de inventario:', error)
    throw new Error('Error al obtener valorización de inventario')
  }
}

/**
 * REPORTES DE CLIENTES
 */

export interface ClienteTop {
  id: number
  nombre_completo: string
  tipo_cliente: string
  total_compras: number
  cantidad_compras: number
  ultima_compra: Date | null
  ticket_promedio: number
}

/**
 * Obtener clientes top por compras
 */
export async function getClientesTop(
  fechaInicio: Date,
  fechaFin: Date,
  limit: number = 10
): Promise<ClienteTop[]> {
  try {
    const clientes = await prisma.$queryRaw<Array<{
      id: number
      nombre_completo: string
      tipo_cliente: string
      total_compras: Prisma.Decimal
      cantidad_compras: bigint
      ultima_compra: Date | null
      ticket_promedio: Prisma.Decimal
    }>>`
      SELECT 
        c.id,
        CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as nombre_completo,
        c.tipo_cliente,
        COALESCE(SUM(v.total), 0) as total_compras,
        COUNT(v.id) as cantidad_compras,
        MAX(v.fecha_venta) as ultima_compra,
        COALESCE(AVG(v.total), 0) as ticket_promedio
      FROM clientes c
      LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
      WHERE v.fecha_venta >= ${fechaInicio}
        AND v.fecha_venta <= ${fechaFin}
      GROUP BY c.id, c.nombre, c.apellido, c.tipo_cliente
      ORDER BY total_compras DESC
      LIMIT ${limit}
    `

    return clientes.map(c => ({
      id: c.id,
      nombre_completo: c.nombre_completo,
      tipo_cliente: c.tipo_cliente,
      total_compras: Number(c.total_compras),
      cantidad_compras: Number(c.cantidad_compras),
      ultima_compra: c.ultima_compra,
      ticket_promedio: Number(c.ticket_promedio)
    }))
  } catch (error) {
    console.error('❌ Error al obtener clientes top:', error)
    throw new Error('Error al obtener clientes top')
  }
}

/**
 * REPORTES DE RENTABILIDAD
 */

export interface ProductoRentabilidad {
  producto_id: number
  nombre: string
  cantidad_vendida: number
  ingresos: number
  costo_produccion: number
  margen_ganancia: number
  porcentaje_margen: number
}

/**
 * Obtener productos más rentables (solo los que tienen costos de producción)
 * IMPORTANTE: Usa el costo_unitario guardado en detalle_ventas al momento de la venta
 */
export async function getProductosRentables(
  fechaInicio: Date,
  fechaFin: Date,
  limit: number = 10
): Promise<ProductoRentabilidad[]> {
  try {
    const productos = await prisma.$queryRaw<Array<{
      producto_id: number
      nombre: string
      cantidad_vendida: Prisma.Decimal
      ingresos: Prisma.Decimal
      costo_produccion: Prisma.Decimal
    }>>`
      SELECT 
        p.id as producto_id,
        p.nombre,
        COALESCE(SUM(dv.cantidad), 0) as cantidad_vendida,
        COALESCE(SUM(dv.subtotal), 0) as ingresos,
        COALESCE(SUM(dv.cantidad * dv.costo_unitario), 0) as costo_produccion
      FROM productos p
      INNER JOIN detalle_ventas dv ON dv.producto_id = p.id
      INNER JOIN ventas v ON v.id = dv.venta_id
      WHERE v.fecha_venta >= ${fechaInicio}
        AND v.fecha_venta <= ${fechaFin}
        AND v.estado = 'completada'
        AND dv.costo_unitario IS NOT NULL
      GROUP BY p.id, p.nombre
      HAVING COALESCE(SUM(dv.subtotal), 0) > 0
        AND COALESCE(SUM(dv.cantidad * dv.costo_unitario), 0) > 0
      ORDER BY (COALESCE(SUM(dv.subtotal), 0) - COALESCE(SUM(dv.cantidad * dv.costo_unitario), 0)) DESC
      LIMIT ${limit}
    `

    return productos.map(p => {
      const ingresos = Number(p.ingresos)
      const costos = Number(p.costo_produccion)
      const margen = ingresos - costos
      const porcentajeMargen = ingresos > 0 ? (margen / ingresos) * 100 : 0

      return {
        producto_id: p.producto_id,
        nombre: p.nombre,
        cantidad_vendida: Number(p.cantidad_vendida),
        ingresos,
        costo_produccion: costos,
        margen_ganancia: margen,
        porcentaje_margen: porcentajeMargen
      }
    })
  } catch (error) {
    console.error('❌ Error al obtener productos rentables:', error)
    throw new Error('Error al obtener productos rentables')
  }
}

/**
 * Interfaz para productos sin costos de producción
 */
export interface ProductoSinCostos {
  producto_id: number
  nombre: string
  cantidad_vendida: number
  ingresos: number
}

/**
 * Obtener productos sin costos de producción (para alertar que falta configurarlos)
 * IMPORTANTE: Busca ventas donde costo_unitario es NULL en detalle_ventas
 */
export async function getProductosSinCostos(
  fechaInicio: Date,
  fechaFin: Date,
  limit: number = 10
): Promise<ProductoSinCostos[]> {
  try {
    const productos = await prisma.$queryRaw<Array<{
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
      WHERE v.fecha_venta >= ${fechaInicio}
        AND v.fecha_venta <= ${fechaFin}
        AND v.estado = 'completada'
        AND dv.costo_unitario IS NULL
      GROUP BY p.id, p.nombre
      HAVING COALESCE(SUM(dv.subtotal), 0) > 0
      ORDER BY ingresos DESC
      LIMIT ${limit}
    `

    return productos.map(p => ({
      producto_id: p.producto_id,
      nombre: p.nombre,
      cantidad_vendida: Number(p.cantidad_vendida),
      ingresos: Number(p.ingresos)
    }))
  } catch (error) {
    console.error('❌ Error al obtener productos sin costos:', error)
    throw new Error('Error al obtener productos sin costos')
  }
}
