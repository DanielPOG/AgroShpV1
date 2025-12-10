import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import {
  getArqueos,
  createArqueo,
  calcularTotalEsperado,
  getArqueosPendientesAprobacion,
  getEstadisticasArqueos,
} from "@/lib/db/arqueos-caja"
import { arqueoSchema } from "@/lib/validations/arqueo-caja.schema"

/**
 * GET /api/caja/arqueos
 * Obtener arqueos de caja
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
    const pendientes = searchParams.get("pendientes")
    const estadisticas = searchParams.get("estadisticas")
    const totalEsperado = searchParams.get("total_esperado")
    const conDiferencia = searchParams.get("con_diferencia")

    // Calcular total esperado para una sesión
    if (totalEsperado && sesionId) {
      const total = await calcularTotalEsperado(parseInt(sesionId))
      return NextResponse.json({ total_esperado: total })
    }

    // Obtener estadísticas
    if (estadisticas === "true") {
      const stats = await getEstadisticasArqueos()
      return NextResponse.json(stats)
    }

    // Obtener arqueos pendientes de aprobación
    if (pendientes === "true") {
      // Solo Admin y Supervisor pueden ver pendientes
      if (!["Admin", "Supervisor"].includes(session.user.role)) {
        return NextResponse.json(
          { error: "No tienes permisos para ver arqueos pendientes" },
          { status: 403 }
        )
      }
      const arqueosPendientes = await getArqueosPendientesAprobacion()
      return NextResponse.json(arqueosPendientes)
    }

    // Obtener arqueos con filtros
    const filters: any = {}
    if (sesionId) filters.sesionId = parseInt(sesionId)
    if (conDiferencia === "true") filters.conDiferencia = true

    const arqueos = await getArqueos(filters)

    return NextResponse.json(arqueos)
  } catch (error) {
    console.error("Error obteniendo arqueos:", error)
    return NextResponse.json(
      { error: "Error al obtener arqueos" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caja/arqueos
 * Crear un arqueo de caja
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
    const validatedData = arqueoSchema.parse(body)

    // Verificar que el usuario que realiza el arqueo sea el del body
    if (validatedData.realizado_por !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Solo puedes realizar arqueos en tu nombre" },
        { status: 403 }
      )
    }

    // Crear el arqueo
    const arqueo = await createArqueo(validatedData)

    // Verificar si requiere aprobación
    const diferencia = validatedData.total_contado - validatedData.total_esperado
    const requiereAprobacion = Math.abs(diferencia) > 5000

    return NextResponse.json({
      success: true,
      arqueo,
      requiere_aprobacion: requiereAprobacion,
      message: requiereAprobacion
        ? "Arqueo creado. Requiere aprobación de Supervisor/Admin"
        : "Arqueo completado y sesión cerrada exitosamente"
    })
  } catch (error: any) {
    console.error("Error creando arqueo:", error)

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Error al crear arqueo" },
      { status: 500 }
    )
  }
}
