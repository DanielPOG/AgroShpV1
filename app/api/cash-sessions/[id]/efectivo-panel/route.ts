import { NextRequest, NextResponse } from 'next/server'
import { getEfectivoPanelData } from '@/lib/db/cash-sessions'

/**
 * GET /api/cash-sessions/[id]/efectivo-panel
 * 
 * Obtiene datos en tiempo real del panel de efectivo para una sesión.
 * 
 * Retorna:
 * - Composición del efectivo (fondo, ventas, ingresos, egresos, etc.)
 * - Totales y estado actual
 * - Alertas (efectivo bajo, negativo, etc.)
 * - Últimos 10 movimientos
 * 
 * @example
 * GET /api/cash-sessions/123/efectivo-panel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id)

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'ID de sesión inválido' },
        { status: 400 }
      )
    }

    const data = await getEfectivoPanelData(sessionId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Error en efectivo-panel:', error)

    if (error instanceof Error && error.message === 'Sesión no encontrada') {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Error al obtener datos del panel de efectivo' },
      { status: 500 }
    )
  }
}
