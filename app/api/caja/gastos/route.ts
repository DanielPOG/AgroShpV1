import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { 
  getGastosCaja,
  createGastoCaja,
  getTotalesGastosPorSesion,
  getGastosRecientes,
} from "@/lib/db/gastos-caja"
import { gastoCajaSchema, MONTO_REQUIERE_AUTORIZACION_GASTO } from "@/lib/validations/gasto-caja.schema"
import { validateCashSessionForSale } from "@/lib/db/cash-integration"

/**
 * GET /api/caja/gastos
 * Obtener gastos de caja
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
    const turnoId = searchParams.get("turno_id")
    const categoria = searchParams.get("categoria")
    const recientes = searchParams.get("recientes")
    const totales = searchParams.get("totales")

    // Obtener totales por sesión
    if (totales && sesionId) {
      const totalesData = await getTotalesGastosPorSesion(parseInt(sesionId))
      return NextResponse.json(totalesData)
    }

    // Obtener gastos recientes (todas las sesiones)
    if (recientes === "true") {
      const limit = searchParams.get("limit")
      const gastos = await getGastosRecientes(limit ? parseInt(limit) : 10)
      return NextResponse.json(gastos)
    }

    // Obtener gastos con filtros
    const filters: any = {}
    if (categoria) filters.categoria = categoria
    if (turnoId) filters.turnoId = parseInt(turnoId)

    const gastos = await getGastosCaja(
      sesionId ? parseInt(sesionId) : undefined,
      filters
    )

    return NextResponse.json(gastos)
  } catch (error) {
    console.error("Error obteniendo gastos:", error)
    return NextResponse.json(
      { error: "Error al obtener gastos" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caja/gastos
 * Crear un gasto de caja
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

    const userId = parseInt(session.user.id)

    // Validar sesión de caja y turno activo
    let cashSession, turnoActivo
    try {
      const validation = await validateCashSessionForSale(userId)
      cashSession = validation.session
      turnoActivo = validation.turno
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json(
          {
            error: 'Sesión de caja y turno requeridos',
            message: error.message,
            code: 'NO_CASH_SESSION_OR_TURNO',
          },
          { status: 400 }
        )
      }
      throw error
    }

    const body = await request.json()

    // Validar schema
    const validatedData = gastoCajaSchema.parse(body)

    // Verificar si requiere autorización
    const requiereAutorizacion = validatedData.monto >= MONTO_REQUIERE_AUTORIZACION_GASTO

    // Si requiere autorización, debe venir el campo autorizado_por
    if (requiereAutorizacion) {
      if (!body.autorizado_por) {
        return NextResponse.json(
          { 
            error: "Este gasto requiere autorización",
            requiere_autorizacion: true,
            monto_minimo: MONTO_REQUIERE_AUTORIZACION_GASTO
          },
          { status: 400 }
        )
      }

      // Verificar que quien autoriza sea Admin o Supervisor
      const userRole = session.user.role
      if (!["Admin", "Supervisor"].includes(userRole)) {
        return NextResponse.json(
          { error: "No tienes permisos para autorizar gastos" },
          { status: 403 }
        )
      }
    }

    // Crear el gasto
    const gasto = await createGastoCaja({
      ...validatedData,
      turno_caja_id: turnoActivo.id,
      autorizado_por: body.autorizado_por || null,
    })

    return NextResponse.json({
      success: true,
      gasto,
      message: requiereAutorizacion 
        ? "Gasto registrado con autorización" 
        : "Gasto registrado exitosamente"
    })
  } catch (error: any) {
    console.error("Error creando gasto:", error)
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Error al crear gasto" },
      { status: 500 }
    )
  }
}
