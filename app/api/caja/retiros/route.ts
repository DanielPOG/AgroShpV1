import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { 
  getRetirosCaja, 
  createRetiroCaja,
  getRetirosPendientes,
  getRetirosAutorizadosPendientes
} from "@/lib/db/retiros-caja"
import { retiroCajaSchema } from "@/lib/validations/retiro-caja.schema"
import { ZodError } from "zod"

/**
 * GET /api/caja/retiros
 * Obtener retiros de caja
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
    const estado = searchParams.get("estado")
    const pendientes = searchParams.get("pendientes") === "true"
    const autorizados = searchParams.get("autorizados") === "true"

    const userRole = session.user.role

    // Obtener retiros pendientes de autorización (solo Admin/Supervisor)
    if (pendientes) {
      if (userRole !== "Admin" && userRole !== "Supervisor") {
        return NextResponse.json(
          { error: "No tienes permisos para ver retiros pendientes" },
          { status: 403 }
        )
      }

      const retirosPendientes = await getRetirosPendientes()
      return NextResponse.json({
        retiros: retirosPendientes,
        total: retirosPendientes.length
      })
    }

    // Obtener retiros autorizados pero no completados
    if (autorizados) {
      const retirosAutorizados = await getRetirosAutorizadosPendientes()
      return NextResponse.json({
        retiros: retirosAutorizados,
        total: retirosAutorizados.length
      })
    }

    // Obtener retiros de una sesión específica
    const retiros = await getRetirosCaja(
      sesionId ? parseInt(sesionId) : undefined,
      {
        estado: estado || undefined,
        limit: 100,
      }
    )

    return NextResponse.json({
      retiros,
      total: retiros.length
    })

  } catch (error) {
    console.error("Error en GET /api/caja/retiros:", error)
    return NextResponse.json(
      { error: "Error al obtener retiros" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caja/retiros
 * Crear una solicitud de retiro
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
      solicitado_por: userId,
    }

    // Validar con Zod
    const validatedData = retiroCajaSchema.parse(dataToValidate)

    // Crear retiro
    const retiro = await createRetiroCaja(validatedData)

    return NextResponse.json({
      success: true,
      retiro,
      message: "Solicitud de retiro creada. Pendiente de autorización."
    }, { status: 201 })

  } catch (error) {
    console.error("Error en POST /api/caja/retiros:", error)

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
      { error: "Error al crear retiro" },
      { status: 500 }
    )
  }
}
