import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
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
 * Obtener arqueos de caja (sesiones cerradas)
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

    // ✅ NUEVO: Obtener historial de arqueos (sesiones cerradas)
    if (!sesionId && !pendientes && !estadisticas && !totalEsperado && !conDiferencia) {
      // Solo Admin y Supervisor pueden ver historial completo
      if (!["Admin", "Supervisor"].includes(session.user.role)) {
        return NextResponse.json(
          { error: "No tienes permisos para ver el historial de arqueos" },
          { status: 403 }
        )
      }

      const arqueos = await prisma.sesiones_caja.findMany({
        where: {
          estado: "cerrada",
          efectivo_contado: {
            not: null
          }
        },
        include: {
          caja: {
            select: {
              id: true,
              nombre: true,
              codigo: true
            }
          },
          cajero: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true
            }
          }
        },
        orderBy: {
          fecha_cierre: 'desc'
        },
        take: 100
      })

      // Serializar Decimals
      const arqueosSerializados = arqueos.map(arqueo => ({
        id: arqueo.id,
        codigo_sesion: arqueo.codigo_sesion,
        fondo_inicial: arqueo.fondo_inicial.toString(),
        efectivo_esperado: arqueo.efectivo_esperado?.toString() || "0",
        efectivo_contado: arqueo.efectivo_contado?.toString() || "0",
        diferencia: arqueo.diferencia?.toString() || "0",
        cuadrada: arqueo.cuadrada || false,
        observaciones_cierre: arqueo.observaciones_cierre,
        fecha_apertura: arqueo.fecha_apertura.toISOString(),
        fecha_cierre: arqueo.fecha_cierre?.toISOString() || null,
        total_ventas_efectivo: arqueo.total_ventas_efectivo?.toString() || "0",
        total_ventas_nequi: arqueo.total_ventas_nequi?.toString() || "0",
        total_ventas_tarjeta: arqueo.total_ventas_tarjeta?.toString() || "0",
        total_ventas_transferencia: arqueo.total_ventas_transferencia?.toString() || "0",
        total_ingresos_adicionales: arqueo.total_ingresos_adicionales?.toString() || "0",
        total_retiros: arqueo.total_retiros?.toString() || "0",
        total_gastos: arqueo.total_gastos?.toString() || "0",
        caja: arqueo.caja,
        cajero: arqueo.cajero
      }))

      return NextResponse.json({
        arqueos: arqueosSerializados,
        total: arqueosSerializados.length
      })
    }

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
