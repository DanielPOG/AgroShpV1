import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getTurnoActivo } from '@/lib/db/turnos-caja'
import { getActiveCashSession } from '@/lib/db/cash-sessions'

/**
 * GET /api/turnos/activo - Obtener turno activo del cajero actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener sesión activa del cajero
    const activeSession = await getActiveCashSession(Number(session.user.id))
    
    if (!activeSession) {
      return NextResponse.json(
        { 
          turno: null,
          message: 'No hay sesión de caja activa' 
        },
        { status: 200 }
      )
    }

    // Obtener turno activo de la sesión
    const turnoActivo = await getTurnoActivo(activeSession.id, Number(session.user.id))

    return NextResponse.json({
      turno: turnoActivo,
      sesion: {
        id: activeSession.id,
        codigo_sesion: activeSession.codigo_sesion,
        fecha_apertura: activeSession.fecha_apertura,
      },
    })
  } catch (error) {
    console.error('Error al obtener turno activo:', error)
    return NextResponse.json(
      { error: 'Error al obtener turno activo' },
      { status: 500 }
    )
  }
}
