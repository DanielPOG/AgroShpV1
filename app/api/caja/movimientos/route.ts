import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { 
  getMovimientosCajaExtra, 
  createMovimientoCaja,
  getMovimientosPendientesAutorizacion
} from "@/lib/db/movimientos-caja-extra"
import { movimientoCajaSchema } from "@/lib/validations/movimiento-caja.schema"
import { validateCashSessionForSale } from "@/lib/db/cash-integration"
import { ZodError } from "zod"
import { checkRateLimit, getClientIpAddress, getEnvNumber } from '@/lib/security/rate-limit'
import { getIdempotencyKey, checkIdempotency, saveIdempotencyResponse } from '@/lib/security/idempotency'
import { logAudit, summarizeMovimiento } from '@/lib/security/audit'

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
    const turnoId = searchParams.get("turno_id")
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

    // Obtener movimientos por turno (prioridad) o por sesión
    if (!turnoId && !sesionId) {
      return NextResponse.json(
        { error: "turno_id o sesion_id es requerido" },
        { status: 400 }
      )
    }

    const movimientos = await getMovimientosCajaExtra(
      sesionId ? parseInt(sesionId) : undefined,
      {
        tipo: tipo || undefined,
        metodo: metodo || undefined,
        turnoId: turnoId ? parseInt(turnoId) : undefined,
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

    const movLimit = getEnvNumber('RATE_LIMIT_MOVIMIENTOS_POST_MAX', 10)
    const movWindowMs = getEnvNumber('RATE_LIMIT_MOVIMIENTOS_POST_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(request.headers)
    const rateLimitKey = `movimientos:post:${session.user.id}:${clientIp}`
    const limitResult = await checkRateLimit({
      key: rateLimitKey,
      limit: movLimit,
      windowMs: movWindowMs,
    })

    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente nuevamente en unos segundos.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limitResult.retryAfterSeconds) },
        }
      )
    }

    // Idempotencia: verificar si ya se procesó esta operación
    const idempotencyKey = getIdempotencyKey(request.headers)
    if (idempotencyKey) {
      const cached = await checkIdempotency({
        key: idempotencyKey,
        endpoint: 'POST /api/caja/movimientos',
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
      usuario_id: userId,
      turno_caja_id: turnoActivo.id,
    }

    // Validar con Zod
    const validatedData = movimientoCajaSchema.parse(dataToValidate)

    // Crear movimiento
    const movimiento = await createMovimientoCaja(validatedData)

    // Auditoría financiera
    await logAudit({
      tabla: 'movimientos_caja_extra',
      registro_id: movimiento.id,
      accion: 'CREATE',
      usuario_id: userId,
      datos_nuevos: summarizeMovimiento(movimiento),
    })

    const responseBody = {
      success: true,
      movimiento,
      message: movimiento.requiere_autorizacion
        ? "Movimiento creado. Requiere autorización de un supervisor."
        : "Movimiento registrado exitosamente"
    }

    // Guardar idempotencia si se proporcionó key
    if (idempotencyKey) {
      await saveIdempotencyResponse({
        key: idempotencyKey,
        endpoint: 'POST /api/caja/movimientos',
        userId: userId,
        statusCode: 201,
        responseBody,
      })
    }

    return NextResponse.json(responseBody, { status: 201 })

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
