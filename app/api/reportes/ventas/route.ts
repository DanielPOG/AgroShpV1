/**
 * @fileoverview API para reportes de ventas
 * @description Endpoints para obtener estadísticas y reportes de ventas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import {
  getVentasPorPeriodo,
  getEstadisticasVentas,
  getProductosMasVendidos,
  getVentasPorMetodoPago,
  getVentasPorHora
} from '@/lib/db/reportes'
import { z } from 'zod'

const querySchema = z.object({
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  agrupar_por: z.enum(['dia', 'mes', 'año']).optional().default('dia'),
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val) : 10)
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Extraer parámetros
    const searchParams = request.nextUrl.searchParams
    const params = querySchema.parse({
      fecha_inicio: searchParams.get('fecha_inicio'),
      fecha_fin: searchParams.get('fecha_fin'),
      agrupar_por: searchParams.get('agrupar_por') || 'dia',
      limit: searchParams.get('limit')
    })

    const fechaInicio = new Date(params.fecha_inicio)
    const fechaFin = new Date(params.fecha_fin)

    // Validar fechas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return NextResponse.json(
        { error: 'Fechas inválidas' },
        { status: 400 }
      )
    }

    if (fechaInicio > fechaFin) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      )
    }

    // Obtener datos en paralelo
    const [
      ventasPorPeriodo,
      estadisticas,
      productosMasVendidos,
      ventasPorMetodoPago,
      ventasPorHora
    ] = await Promise.all([
      getVentasPorPeriodo(fechaInicio, fechaFin, params.agrupar_por),
      getEstadisticasVentas(fechaInicio, fechaFin),
      getProductosMasVendidos(fechaInicio, fechaFin, params.limit),
      getVentasPorMetodoPago(fechaInicio, fechaFin),
      getVentasPorHora(fechaInicio, fechaFin)
    ])

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio: fechaInicio.toISOString(),
          fin: fechaFin.toISOString(),
          agrupar_por: params.agrupar_por
        },
        estadisticas,
        ventas_por_periodo: ventasPorPeriodo,
        productos_mas_vendidos: productosMasVendidos,
        ventas_por_metodo_pago: ventasPorMetodoPago,
        ventas_por_hora: ventasPorHora
      }
    })

  } catch (error) {
    console.error('❌ Error en GET /api/reportes/ventas:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Error al obtener reporte de ventas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
