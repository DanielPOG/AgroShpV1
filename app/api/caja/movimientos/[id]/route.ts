import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { 
  getMovimientoCajaById,
  autorizarMovimiento,
  deleteMovimientoCaja
} from "@/lib/db/movimientos-caja-extra"

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET /api/caja/movimientos/[id]
 * Obtener detalles de un movimiento específico
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const movimientoId = parseInt(params.id)
    const movimiento = await getMovimientoCajaById(movimientoId)

    if (!movimiento) {
      return NextResponse.json(
        { error: "Movimiento no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ movimiento })

  } catch (error) {
    console.error(`Error en GET /api/caja/movimientos/${params.id}:`, error)
    return NextResponse.json(
      { error: "Error al obtener movimiento" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/caja/movimientos/[id]
 * Autorizar un movimiento de caja
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Solo Admin y Supervisor pueden autorizar
    const userRole = session.user.role
    if (userRole !== "Admin" && userRole !== "Supervisor") {
      return NextResponse.json(
        { error: "No tienes permisos para autorizar movimientos" },
        { status: 403 }
      )
    }

    const movimientoId = parseInt(params.id)
    const userId = parseInt(session.user.id)

    const movimiento = await autorizarMovimiento(movimientoId, userId)

    return NextResponse.json({
      success: true,
      movimiento,
      message: "Movimiento autorizado exitosamente"
    })

  } catch (error) {
    console.error(`Error en PUT /api/caja/movimientos/${params.id}:`, error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al autorizar movimiento" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/caja/movimientos/[id]
 * Eliminar un movimiento de caja (solo si no está autorizado)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const movimientoId = parseInt(params.id)
    const userId = parseInt(session.user.id)

    // Admin puede eliminar cualquier movimiento no autorizado
    const userRole = session.user.role
    const isAdmin = userRole === "Admin"

    await deleteMovimientoCaja(movimientoId, isAdmin ? 0 : userId)

    return NextResponse.json({
      success: true,
      message: "Movimiento eliminado exitosamente"
    })

  } catch (error) {
    console.error(`Error en DELETE /api/caja/movimientos/${params.id}:`, error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al eliminar movimiento" },
      { status: 500 }
    )
  }
}
