/**
 * @fileoverview API para reportes de inventario
 * @description Endpoints para obtener estadísticas de inventario y stock
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import {
  getProductosStockCritico,
  getLotesProximosVencer,
  getValorizacionInventario
} from '@/lib/db/reportes'
import { z } from 'zod'

const querySchema = z.object({
  dias_vencimiento: z.string().nullable().optional().transform(val => val ? parseInt(val) : 30)
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
      dias_vencimiento: searchParams.get('dias_vencimiento')
    })

    // Obtener datos en paralelo
    const [
      productosStockCritico,
      lotesProximosVencer,
      valorizacionInventario
    ] = await Promise.all([
      getProductosStockCritico(),
      getLotesProximosVencer(params.dias_vencimiento),
      getValorizacionInventario()
    ])

    return NextResponse.json({
      success: true,
      data: {
        valorizacion: valorizacionInventario,
        productos_stock_critico: productosStockCritico,
        lotes_proximos_vencer: lotesProximosVencer,
        resumen: {
          productos_criticos: productosStockCritico.filter(p => p.estado === 'critico').length,
          productos_bajo_stock: productosStockCritico.filter(p => p.estado === 'bajo').length,
          lotes_por_vencer: lotesProximosVencer.length
        }
      }
    })

  } catch (error) {
    console.error('❌ Error en GET /api/reportes/inventario:', error)

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
        error: 'Error al obtener reporte de inventario',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
