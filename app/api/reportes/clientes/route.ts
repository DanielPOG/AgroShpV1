/**
 * @fileoverview API para reportes de clientes
 * @description Endpoints para obtener estadísticas de clientes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getClientesTop } from '@/lib/db/reportes'
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

    const clientesTop = await getClientesTop(fechaInicio, fechaFin, params.limit)

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio: fechaInicio.toISOString(),
          fin: fechaFin.toISOString()
        },
        clientes_top: clientesTop,
        resumen: {
          total_clientes: clientesTop.length,
          total_compras: clientesTop.reduce((sum, c) => sum + c.total_compras, 0),
          ticket_promedio_global: clientesTop.length > 0
            ? clientesTop.reduce((sum, c) => sum + c.ticket_promedio, 0) / clientesTop.length
            : 0
        }
      }
    })

  } catch (error) {
    console.error('❌ Error en GET /api/reportes/clientes:', error)

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
        error: 'Error al obtener reporte de clientes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
