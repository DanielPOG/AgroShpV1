import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { validarCambioDisponible } from '@/lib/db/sales'
import { getActiveCashSession } from '@/lib/db/cash-sessions'

/**
 * POST /api/caja/validar-cambio
 * Validar si hay suficiente efectivo en caja para dar cambio
 * 
 * Body:
 * {
 *   montoVenta: number,
 *   montoPagado: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = Number(session.user.id)

    // Obtener sesión de caja activa
    const cashSession = await getActiveCashSession(userId)
    if (!cashSession) {
      return NextResponse.json(
        { 
          error: 'No hay sesión de caja activa',
          code: 'NO_CASH_SESSION'
        },
        { status: 400 }
      )
    }

    // Parsear body
    const body = await request.json()
    const { montoVenta, montoPagado } = body

    if (typeof montoVenta !== 'number' || typeof montoPagado !== 'number') {
      return NextResponse.json(
        { error: 'montoVenta y montoPagado deben ser números' },
        { status: 400 }
      )
    }

    // Validar cambio disponible
    const validacion = await validarCambioDisponible(
      cashSession.id,
      montoVenta,
      montoPagado
    )

    return NextResponse.json({
      success: true,
      sessionId: cashSession.id,
      codigoSesion: cashSession.codigo_sesion,
      ...validacion
    })

  } catch (error) {
    console.error('Error en POST /api/caja/validar-cambio:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error al validar cambio disponible' },
      { status: 500 }
    )
  }
}
