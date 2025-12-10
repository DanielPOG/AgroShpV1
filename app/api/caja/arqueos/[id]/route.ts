import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import {
  getArqueoById,
  aprobarArqueo,
  deleteArqueo,
} from "@/lib/db/arqueos-caja"
import { aprobarArqueoSchema } from "@/lib/validations/arqueo-caja.schema"

/**
 * GET /api/caja/arqueos/[id]
 * Obtener detalles de un arqueo
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

    const arqueo = await getArqueoById(parseInt(params.id))

    if (!arqueo) {
      return NextResponse.json(
        { error: "Arqueo no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(arqueo)
  } catch (error) {
    console.error("Error obteniendo arqueo:", error)
    return NextResponse.json(
      { error: "Error al obtener arqueo" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/caja/arqueos/[id]
 * Aprobar un arqueo con diferencia
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

    // Solo Admin y Supervisor pueden aprobar
    if (!["Admin", "Supervisor"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Solo Admin o Supervisor pueden aprobar arqueos" },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validar que incluya las observaciones de aprobación
    if (!body.observaciones_aprobacion || body.observaciones_aprobacion.length < 10) {
      return NextResponse.json(
        { error: "Debes proporcionar observaciones de aprobación (mínimo 10 caracteres)" },
        { status: 400 }
      )
    }

    // Aprobar el arqueo
    const arqueo = await aprobarArqueo(
      parseInt(params.id),
      parseInt(session.user.id),
      body.observaciones_aprobacion
    )

    return NextResponse.json({
      success: true,
      arqueo,
      message: "Arqueo aprobado y sesión cerrada exitosamente"
    })
  } catch (error: any) {
    console.error("Error aprobando arqueo:", error)
    return NextResponse.json(
      { error: error.message || "Error al aprobar arqueo" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/caja/arqueos/[id]
 * Eliminar un arqueo (solo si no está aprobado)
 */
export async function DELETE(
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

    const isAdmin = session.user.role === "Admin"

    await deleteArqueo(parseInt(params.id), parseInt(session.user.id), isAdmin)

    return NextResponse.json({
      success: true,
      message: "Arqueo eliminado exitosamente"
    })
  } catch (error: any) {
    console.error("Error eliminando arqueo:", error)
    return NextResponse.json(
      { error: error.message || "Error al eliminar arqueo" },
      { status: 500 }
    )
  }
}
