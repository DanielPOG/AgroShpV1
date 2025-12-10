import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import {
  getTurnoById,
  finalizarTurno,
  suspenderTurno,
  reanudarTurno,
} from "@/lib/db/turnos-caja"
import { finalizarTurnoSchema, suspenderTurnoSchema } from "@/lib/validations/turno-caja.schema"

/**
 * GET /api/caja/turnos/[id]
 * Obtener detalles de un turno
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const turno = await getTurnoById(parseInt(params.id))

    if (!turno) {
      return NextResponse.json(
        { error: "Turno no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(turno)
  } catch (error) {
    console.error("Error obteniendo turno:", error)
    return NextResponse.json(
      { error: "Error al obtener turno" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/caja/turnos/[id]
 * Finalizar, suspender o reanudar un turno
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const turnoId = parseInt(params.id)

    // Verificar acción
    if (body.accion === "finalizar") {
      // Validar datos de finalización
      const validatedData = finalizarTurnoSchema.parse({
        turno_id: turnoId,
        ...body
      })

      // Obtener el turno para verificar permisos
      const turno = await getTurnoById(turnoId)
      if (!turno) {
        return NextResponse.json(
          { error: "Turno no encontrado" },
          { status: 404 }
        )
      }

      // Solo el cajero del turno o Admin pueden finalizarlo
      if (session.user.role !== "Admin" && turno.cajero_id !== parseInt(session.user.id)) {
        return NextResponse.json(
          { error: "Solo puedes finalizar tu propio turno" },
          { status: 403 }
        )
      }

      const turnoFinalizado = await finalizarTurno(validatedData)

      return NextResponse.json({
        success: true,
        turno: turnoFinalizado,
        message: "Turno finalizado exitosamente"
      })
    }

    if (body.accion === "suspender") {
      // Solo Admin y Supervisor pueden suspender turnos
      if (!["Admin", "Supervisor"].includes(session.user.role)) {
        return NextResponse.json(
          { error: "Solo Admin o Supervisor pueden suspender turnos" },
          { status: 403 }
        )
      }

      const validatedData = suspenderTurnoSchema.parse({
        turno_id: turnoId,
        motivo: body.motivo,
        autorizado_por: session.user.id,
      })

      const turnoSuspendido = await suspenderTurno(validatedData)

      return NextResponse.json({
        success: true,
        turno: turnoSuspendido,
        message: "Turno suspendido"
      })
    }

    if (body.accion === "reanudar") {
      // Solo Admin y Supervisor pueden reanudar turnos
      if (!["Admin", "Supervisor"].includes(session.user.role)) {
        return NextResponse.json(
          { error: "Solo Admin o Supervisor pueden reanudar turnos" },
          { status: 403 }
        )
      }

      const turnoReanudado = await reanudarTurno(turnoId, body.observaciones)

      return NextResponse.json({
        success: true,
        turno: turnoReanudado,
        message: "Turno reanudado"
      })
    }

    return NextResponse.json(
      { error: "Acción no válida" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("Error actualizando turno:", error)

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Error al actualizar turno" },
      { status: 500 }
    )
  }
}
