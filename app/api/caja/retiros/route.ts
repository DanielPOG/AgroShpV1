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
import { validateCashSessionForSale } from "@/lib/db/cash-integration"
import { checkRateLimit, getClientIpAddress, getEnvNumber } from '@/lib/security/rate-limit'
import { getIdempotencyKey, checkIdempotency, saveIdempotencyResponse } from '@/lib/security/idempotency'
import { logAudit, summarizeRetiro } from '@/lib/security/audit'
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
    const turnoId = searchParams.get("turno_id")
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

    // Obtener retiros de una sesión o turno específico
    const retiros = await getRetirosCaja(
      sesionId ? parseInt(sesionId) : undefined,
      {
        estado: estado || undefined,
        turnoId: turnoId ? parseInt(turnoId) : undefined,
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

    const retirosLimit = getEnvNumber('RATE_LIMIT_RETIROS_POST_MAX', 10)
    const retirosWindowMs = getEnvNumber('RATE_LIMIT_RETIROS_POST_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(request.headers)
    const rateLimitKey = `retiros:post:${session.user.id}:${clientIp}`
    const limitResult = await checkRateLimit({
      key: rateLimitKey,
      limit: retirosLimit,
      windowMs: retirosWindowMs,
    })

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Intente nuevamente en unos segundos.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(limitResult.retryAfterSeconds),
          },
        }
      )
    }

    // Idempotencia: verificar si ya se procesó esta operación
    const idempotencyKey = getIdempotencyKey(request.headers)
    if (idempotencyKey) {
      const cached = await checkIdempotency({
        key: idempotencyKey,
        endpoint: 'POST /api/caja/retiros',
        userId: userId,
      })
      if (cached.hit) return cached.response
    }

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

    // Agregar usuario_id y turno_caja_id
    const dataToValidate = {
      ...body,
      solicitado_por: userId,
      turno_caja_id: turnoActivo.id,
    }

    // Validar con Zod
    const validatedData = retiroCajaSchema.parse(dataToValidate)

    // Crear retiro
    const retiro = await createRetiroCaja(validatedData)

    // Auditoría financiera
    await logAudit({
      tabla: 'retiros_caja',
      registro_id: retiro.id,
      accion: 'CREATE',
      usuario_id: userId,
      datos_nuevos: summarizeRetiro(retiro),
    })

    const responseBody = {
      success: true,
      retiro,
      message: "Solicitud de retiro creada. Pendiente de autorización."
    }

    // Guardar idempotencia si se proporcionó key
    if (idempotencyKey) {
      await saveIdempotencyResponse({
        key: idempotencyKey,
        endpoint: 'POST /api/caja/retiros',
        userId: userId,
        statusCode: 201,
        responseBody,
      })
    }

    return NextResponse.json(responseBody, { status: 201 })

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
