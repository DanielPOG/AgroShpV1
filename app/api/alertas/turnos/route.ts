import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import {
  getAlertasTurno,
  getAlertasSesion,
  monitorearAlertasAutomaticas,
} from '@/lib/validations/alertas-turnos'

/**
 * GET /api/alertas/turnos
 * Obtiene alertas activas para turnos
 * 
 * Query params:
 * - turno_id: ID del turno (opcional)
 * - sesion_id: ID de la sesión (opcional)
 * - monitorear: 'true' para registrar alertas en BD
 * 
 * Roles permitidos: Admin, Supervisor, Cajero (solo sus turnos)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    const userRole = session.user.role
    const userId = Number(session.user.id)

    // Extraer parámetros
    const { searchParams } = new URL(request.url)
    const turnoId = searchParams.get('turno_id')
    const sesionId = searchParams.get('sesion_id')
    const monitorear = searchParams.get('monitorear') === 'true'

    let alertas

    if (turnoId) {
      // Validar que el cajero solo pueda ver sus propios turnos
      if (userRole === 'Cajero') {
        const turno = await prisma.turnos_caja.findUnique({
          where: { id: Number(turnoId) },
          select: { cajero_id: true },
        })
        if (turno && turno.cajero_id !== userId) {
          return NextResponse.json(
            { error: 'No tienes permiso para ver alertas de este turno' },
            { status: 403 }
          )
        }
      }

      alertas = await getAlertasTurno(Number(turnoId))
    } else if (sesionId) {
      // Solo Admin y Supervisor pueden ver alertas de toda la sesión
      if (userRole === 'Cajero') {
        return NextResponse.json(
          { error: 'No tienes permiso para ver alertas de la sesión completa' },
          { status: 403 }
        )
      }

      if (monitorear) {
        // Monitorear y registrar alertas críticas
        alertas = await monitorearAlertasAutomaticas(Number(sesionId))
      } else {
        alertas = await getAlertasSesion(Number(sesionId))
      }
    } else {
      return NextResponse.json(
        { error: 'Debe especificar turno_id o sesion_id' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        alertas,
        total: alertas.length,
        criticas: alertas.filter((a) => a.nivel === 'critical').length,
        warnings: alertas.filter((a) => a.nivel === 'warning').length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error en GET /api/alertas/turnos:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
