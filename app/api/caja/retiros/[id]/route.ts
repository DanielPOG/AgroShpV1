import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { 
  getRetiroById,
  autorizarRetiro,
  completarRetiro,
  cancelarRetiro
} from "@/lib/db/retiros-caja"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/caja/retiros/[id]
 * Obtener detalles de un retiro específico
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const retiroId = parseInt(id)
    const retiro = await getRetiroById(retiroId)

    if (!retiro) {
      return NextResponse.json(
        { error: "Retiro no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ retiro })

  } catch (error) {
    console.error(`Error en GET /api/caja/retiros/[id]:`, error)
    return NextResponse.json(
      { error: "Error al obtener retiro" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/caja/retiros/[id]
 * Autorizar/Rechazar o Completar un retiro
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const retiroId = parseInt(id)
    const userId = parseInt(session.user.id)
    const body = await request.json()

    // Autorizar o Rechazar (solo Admin/Supervisor)
    if (body.estado === "autorizado" || body.estado === "rechazado") {
      const userRole = session.user.role
      if (userRole !== "Admin" && userRole !== "Supervisor") {
        return NextResponse.json(
          { error: "No tienes permisos para autorizar retiros" },
          { status: 403 }
        )
      }

      const retiro = await autorizarRetiro(
        retiroId,
        userId,
        body.estado,
        body.observaciones
      )

      return NextResponse.json({
        success: true,
        retiro,
        message: `Retiro ${body.estado} exitosamente`
      })
    }

    // Completar retiro
    if (body.completar === true) {
      const retiro = await completarRetiro(retiroId, body.recibo_url)

      return NextResponse.json({
        success: true,
        retiro,
        message: "Retiro completado exitosamente"
      })
    }

    return NextResponse.json(
      { error: "Acción no válida" },
      { status: 400 }
    )

  } catch (error) {
    console.error(`Error en PUT /api/caja/retiros/[id]:`, error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al procesar retiro" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/caja/retiros/[id]
 * Cancelar un retiro (solo si está pendiente)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const retiroId = parseInt(id)
    const userId = parseInt(session.user.id)

    await cancelarRetiro(retiroId, userId)

    return NextResponse.json({
      success: true,
      message: "Retiro cancelado exitosamente"
    })

  } catch (error) {
    console.error(`Error en DELETE /api/caja/retiros/[id]:`, error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al cancelar retiro" },
      { status: 500 }
    )
  }
}
