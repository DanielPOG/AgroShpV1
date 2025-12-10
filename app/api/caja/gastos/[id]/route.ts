import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { 
  getGastoById,
  updateGastoCaja,
  deleteGastoCaja,
} from "@/lib/db/gastos-caja"

/**
 * GET /api/caja/gastos/[id]
 * Obtener detalles de un gasto
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

    const gasto = await getGastoById(parseInt(params.id))

    if (!gasto) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(gasto)
  } catch (error) {
    console.error("Error obteniendo gasto:", error)
    return NextResponse.json(
      { error: "Error al obtener gasto" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/caja/gastos/[id]
 * Actualizar comprobante y observaciones de un gasto
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

    // Solo Admin puede actualizar gastos
    if (session.user.role !== "Admin") {
      return NextResponse.json(
        { error: "Solo Admin puede actualizar gastos" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { comprobante_url, observaciones } = body

    const gasto = await updateGastoCaja(parseInt(params.id), {
      comprobante_url,
      observaciones,
    })

    return NextResponse.json({
      success: true,
      gasto,
      message: "Gasto actualizado exitosamente"
    })
  } catch (error: any) {
    console.error("Error actualizando gasto:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar gasto" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/caja/gastos/[id]
 * Eliminar un gasto (solo Admin)
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

    // Solo Admin puede eliminar gastos
    if (session.user.role !== "Admin") {
      return NextResponse.json(
        { error: "Solo Admin puede eliminar gastos" },
        { status: 403 }
      )
    }

    await deleteGastoCaja(parseInt(params.id))

    return NextResponse.json({
      success: true,
      message: "Gasto eliminado exitosamente"
    })
  } catch (error: any) {
    console.error("Error eliminando gasto:", error)
    return NextResponse.json(
      { error: error.message || "Error al eliminar gasto" },
      { status: 500 }
    )
  }
}
