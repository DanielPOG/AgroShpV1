import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getEfectivoDisponible } from '@/lib/db/cash-sessions'
import { getActiveCashSession } from '@/lib/db/cash-sessions'

/**
 * GET /api/caja/efectivo-disponible
 * Obtener el efectivo REAL disponible en la caja activa
 * 
 * Considera TODAS las operaciones que afectan el efectivo:
 * - Fondo inicial
 * - Ventas en efectivo
 * - Ingresos/egresos extra
 * - Retiros de caja
 * - Gastos
 */
export async function GET() {
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

    // Calcular efectivo disponible
    const efectivoDisponible = await getEfectivoDisponible(cashSession.id)

    return NextResponse.json({
      success: true,
      sessionId: cashSession.id,
      codigoSesion: cashSession.codigo_sesion,
      efectivoDisponible,
      fondoInicial: Number(cashSession.fondo_inicial),
      mensaje: efectivoDisponible < 0 
        ? 'Faltante detectado en caja'
        : efectivoDisponible < 50000
        ? 'Efectivo bajo en caja'
        : 'Efectivo suficiente'
    })

  } catch (error) {
    console.error('Error en GET /api/caja/efectivo-disponible:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error al obtener efectivo disponible' },
      { status: 500 }
    )
  }
}
