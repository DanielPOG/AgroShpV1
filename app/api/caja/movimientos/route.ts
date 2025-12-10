import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { 
  getMovimientosCajaExtra, 
  createMovimientoCaja,
  getMovimientosPendientesAutorizacion
} from "@/lib/db/movimientos-caja-extra"
import { movimientoCajaSchema } from "@/lib/validations/movimiento-caja.schema"
import { ZodError } from "zod"

/**
 * GET /api/caja/movimientos
 * Obtener movimientos de caja extra de una sesión
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sesionId = searchParams.get("sesion_id")
    const tipo = searchParams.get("tipo")
    const metodo = searchParams.get("metodo")
    const pendientes = searchParams.get("pendientes") === "true"

    // Si pide pendientes de autorización (solo Admin/Supervisor)
    if (pendientes) {
      const userRole = session.user.role
      if (userRole !== "Admin" && userRole !== "Supervisor") {
        return NextResponse.json(
          { error: "No tienes permisos para ver movimientos pendientes" },
          { status: 403 }
        )
      }

      const movimientosPendientes = await getMovimientosPendientesAutorizacion()
      return NextResponse.json({
        movimientos: movimientosPendientes,
        total: movimientosPendientes.length
      })
    }

    // Obtener movimientos de una sesión específica
    if (!sesionId) {
      return NextResponse.json(
        { error: "sesion_id es requerido" },
        { status: 400 }
      )
    }

    const movimientos = await getMovimientosCajaExtra(
      parseInt(sesionId),
      {
        tipo: tipo || undefined,
        metodo: metodo || undefined,
        limit: 100,
      }
    )

    return NextResponse.json({
      movimientos,
      total: movimientos.length
    })

  } catch (error) {
    console.error("Error en GET /api/caja/movimientos:", error)
    return NextResponse.json(
      { error: "Error al obtener movimientos" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caja/movimientos
 * Crear un nuevo movimiento de caja extra
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()

    // Agregar usuario_id del usuario autenticado
    const dataToValidate = {
      ...body,
      usuario_id: userId,
    }

    // Validar con Zod
    const validatedData = movimientoCajaSchema.parse(dataToValidate)

    // Crear movimiento
    const movimiento = await createMovimientoCaja(validatedData)

    return NextResponse.json({
      success: true,
      movimiento,
      message: movimiento.requiere_autorizacion
        ? "Movimiento creado. Requiere autorización de un supervisor."
        : "Movimiento registrado exitosamente"
    }, { status: 201 })

  } catch (error) {
    console.error("Error en POST /api/caja/movimientos:", error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: "Datos inválidos",
          details: error.errors 
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al crear movimiento" },
      { status: 500 }
    )
  }
}
