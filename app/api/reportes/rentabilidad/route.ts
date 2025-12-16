/**
 * @fileoverview API para reportes de rentabilidad
 * @description Endpoints para obtener análisis de rentabilidad
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getProductosRentables, getProductosSinCostos } from '@/lib/db/reportes'
import { z } from 'zod'

const querySchema = z.object({
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
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

    const productosRentables = await getProductosRentables(fechaInicio, fechaFin, params.limit)
    const productosSinCostos = await getProductosSinCostos(fechaInicio, fechaFin, params.limit)

    const totalIngresos = productosRentables.reduce((sum, p) => sum + p.ingresos, 0)
    const totalCostos = productosRentables.reduce((sum, p) => sum + p.costo_produccion, 0)
    const margenTotal = totalIngresos - totalCostos

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio: fechaInicio.toISOString(),
          fin: fechaFin.toISOString()
        },
        productos_rentables: productosRentables,
        productos_sin_costos: productosSinCostos,
        resumen: {
          total_ingresos: totalIngresos,
          total_costos: totalCostos,
          margen_total: margenTotal,
          porcentaje_margen: totalIngresos > 0 ? (margenTotal / totalIngresos) * 100 : 0
        }
      }
    })

  } catch (error) {
    console.error('❌ Error en GET /api/reportes/rentabilidad:', error)

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
        error: 'Error al obtener reporte de rentabilidad',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
