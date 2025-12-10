import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import {
  getTurnos,
  createTurno,
  getTurnoActivo,
  getTotalesTurno,
  getEstadisticasTurnos,
  getTurnosActivos,
} from "@/lib/db/turnos-caja"
import { turnoSchema } from "@/lib/validations/turno-caja.schema"

/**
 * GET /api/caja/turnos
 * Obtener turnos de caja
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sesionId = searchParams.get("sesion_id")
    const cajeroId = searchParams.get("cajero_id")
    const activos = searchParams.get("activos")
    const miTurno = searchParams.get("mi_turno")
    const totales = searchParams.get("totales")
    const estadisticas = searchParams.get("estadisticas")

    // Obtener totales de un turno específico
    if (totales) {
      const turnoId = parseInt(totales)
      const totalesData = await getTotalesTurno(turnoId)
      return NextResponse.json(totalesData)
    }

    // Obtener estadísticas
    if (estadisticas === "true") {
      const filters: any = {}
      if (sesionId) filters.sesionId = parseInt(sesionId)
      if (cajeroId) filters.cajeroId = parseInt(cajeroId)
      
      const stats = await getEstadisticasTurnos(filters)
      return NextResponse.json(stats)
    }

    // Obtener turno activo del usuario actual
    if (miTurno === "true") {
      const turno = await getTurnoActivo(parseInt(session.user.id))
      return NextResponse.json(turno)
    }

    // Obtener turnos activos
    if (activos === "true") {
      const turnosActivos = await getTurnosActivos(
        sesionId ? parseInt(sesionId) : undefined
      )
      return NextResponse.json(turnosActivos)
    }

    // Obtener turnos con filtros
    const filters: any = {}
    if (sesionId) filters.sesionId = parseInt(sesionId)
    if (cajeroId) filters.cajeroId = parseInt(cajeroId)

    const turnos = await getTurnos(filters)

    return NextResponse.json(turnos)
  } catch (error) {
    console.error("Error obteniendo turnos:", error)
    return NextResponse.json(
      { error: "Error al obtener turnos" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caja/turnos
 * Crear un turno de caja
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar schema
    const validatedData = turnoSchema.parse(body)

    // Verificar que el cajero sea el usuario actual (a menos que sea Admin)
    if (session.user.role !== "Admin" && validatedData.cajero_id !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Solo puedes crear turnos para ti mismo" },
        { status: 403 }
      )
    }

    // Si es tipo emergencia, requiere autorización
    if (validatedData.tipo_relevo === "emergencia") {
      if (!["Admin", "Supervisor"].includes(session.user.role)) {
        return NextResponse.json(
          { error: "Los relevos de emergencia requieren autorización de Supervisor/Admin" },
          { status: 403 }
        )
      }
      // Auto-autorizar si es Admin/Supervisor
      validatedData.autorizado_por = parseInt(session.user.id)
    }

    // Crear el turno
    const turno = await createTurno(validatedData)

    return NextResponse.json({
      success: true,
      turno,
      message: "Turno iniciado exitosamente"
    })
  } catch (error: any) {
    console.error("Error creando turno:", error)

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Error al crear turno" },
      { status: 500 }
    )
  }
}
