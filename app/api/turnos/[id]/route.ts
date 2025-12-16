import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import {
  getResumenTurno,
  cerrarTurno,
  suspenderTurno,
  reanudarTurno,
} from '@/lib/db/turnos-caja'
import { cerrarTurnoSchema, suspenderTurnoSchema, reanudarTurnoSchema } from '@/lib/validations/turno-caja.schema'
import { ZodError } from 'zod'

/**
 * GET /api/turnos/[id] - Obtener resumen completo de un turno
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const turnoId = parseInt(id)
    if (isNaN(turnoId)) {
      return NextResponse.json({ error: 'ID de turno inválido' }, { status: 400 })
    }

    const resumen = await getResumenTurno(turnoId)

    // Verificar permisos: solo el cajero del turno o Admin/Supervisor pueden ver el resumen
    const userRole = session.user.role
    if (
      userRole !== 'Admin' &&
      userRole !== 'Supervisor' &&
      resumen.cajero_id !== Number(session.user.id)
    ) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver este turno' },
        { status: 403 }
      )
    }

    return NextResponse.json({ turno: resumen })
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error al obtener resumen de turno:', error.message)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    console.error('Error inesperado al obtener resumen de turno:', error)
    return NextResponse.json(
      { error: 'Error al obtener resumen de turno' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/turnos/[id] - Cerrar, suspender o reanudar un turno
 * Body: { action: 'cerrar' | 'suspender' | 'reanudar', ...data }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const turnoId = parseInt(id)
    if (isNaN(turnoId)) {
      return NextResponse.json({ error: 'ID de turno inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { action, ...data } = body

    const userRole = session.user.role
    const userId = Number(session.user.id)

    // Acción: CERRAR TURNO
    if (action === 'cerrar') {
      const validatedData = cerrarTurnoSchema.parse({
        turno_id: turnoId,
        ...data,
      })

      const resultado = await cerrarTurno(validatedData)

      return NextResponse.json({
        message: 'Turno cerrado exitosamente',
        turno: resultado.turno,
        resumen: resultado.resumen,
      })
    }

    // Acción: SUSPENDER TURNO
    if (action === 'suspender') {
      // Solo Admin o Supervisor pueden suspender
      if (userRole !== 'Admin' && userRole !== 'Supervisor') {
        return NextResponse.json(
          { error: 'Solo supervisores o administradores pueden suspender turnos' },
          { status: 403 }
        )
      }

      const validatedData = suspenderTurnoSchema.parse({
        turno_id: turnoId,
        autorizado_por: userId,
        ...data,
      })

      const turno = await suspenderTurno(
        validatedData.turno_id,
        validatedData.motivo,
        validatedData.autorizado_por
      )

      return NextResponse.json({
        message: 'Turno suspendido exitosamente',
        turno,
      })
    }

    // Acción: REANUDAR TURNO
    if (action === 'reanudar') {
      // Solo Admin o Supervisor pueden reanudar
      if (userRole !== 'Admin' && userRole !== 'Supervisor') {
        return NextResponse.json(
          { error: 'Solo supervisores o administradores pueden reanudar turnos' },
          { status: 403 }
        )
      }

      const validatedData = reanudarTurnoSchema.parse({
        turno_id: turnoId,
        ...data,
      })

      const turno = await reanudarTurno(
        validatedData.turno_id,
        validatedData.observaciones || undefined
      )

      return NextResponse.json({
        message: 'Turno reanudado exitosamente',
        turno,
      })
    }

    return NextResponse.json(
      { error: 'Acción no válida. Use: cerrar, suspender o reanudar' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      console.error('Error al actualizar turno:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Error inesperado al actualizar turno:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar turno' },
      { status: 500 }
    )
  }
}
