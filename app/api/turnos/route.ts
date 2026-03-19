import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import {
  getTurnoActivo,
  iniciarTurno,
  getTurnosPorSesion,
} from '@/lib/db/turnos-caja'
import { getActiveCashSession } from '@/lib/db/cash-sessions'
import { iniciarTurnoSchema } from '@/lib/validations/turno-caja.schema'
import { ZodError } from 'zod'
import { checkRateLimit, getClientIpAddress, getEnvNumber } from '@/lib/security/rate-limit'
import { logAudit, summarizeTurno } from '@/lib/security/audit'

/**
 * GET /api/turnos - Obtener turno activo o historial de turnos
 * Query params:
 *   - sesion_id: ID de la sesión para obtener todos sus turnos
 *   - activo: true para obtener solo el turno activo
 *   - ultimo_cerrado: true para obtener el último turno cerrado (finalizado)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sesionId = searchParams.get('sesion_id')
    const soloActivo = searchParams.get('activo') === 'true'
    const ultimoCerrado = searchParams.get('ultimo_cerrado') === 'true'

    // Si no se especifica sesión, buscar en la sesión activa del cajero
    let sesionCajaId: number

    if (sesionId) {
      sesionCajaId = parseInt(sesionId)
    } else {
      const activeSession = await getActiveCashSession(Number(session.user.id))
      if (!activeSession) {
        return NextResponse.json(
          { error: 'No hay sesión de caja activa' },
          { status: 404 }
        )
      }
      sesionCajaId = activeSession.id
    }

    // Obtener último turno cerrado
    if (ultimoCerrado) {
      const { prisma } = await import('@/lib/prisma')
      const ultimoTurno = await prisma.turnos_caja.findFirst({
        where: {
          sesion_caja_id: sesionCajaId,
          estado: 'finalizado',
          efectivo_final: { not: null }
        },
        orderBy: {
          fecha_fin: 'desc'
        },
        select: {
          id: true,
          efectivo_final: true,
          cajero: {
            select: {
              nombre: true,
              apellido: true
            }
          }
        }
      })
      return NextResponse.json(ultimoTurno)
    }

    // Obtener turno activo o historial
    if (soloActivo) {
      const turnoActivo = await getTurnoActivo(sesionCajaId, Number(session.user.id))
      return NextResponse.json({ turno: turnoActivo })
    } else {
      const turnos = await getTurnosPorSesion(sesionCajaId)
      return NextResponse.json({ turnos })
    }
  } catch (error) {
    console.error('Error al obtener turnos:', error)
    return NextResponse.json(
      { error: 'Error al obtener turnos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/turnos - Iniciar nuevo turno
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que tenga permiso de cajero
    const userRole = session.user.role
    if (userRole !== 'Cajero' && userRole !== 'Admin' && userRole !== 'Supervisor') {
      return NextResponse.json(
        { error: 'Solo cajeros pueden iniciar turnos' },
        { status: 403 }
      )
    }

    const turnoLimit = getEnvNumber('RATE_LIMIT_TURNOS_POST_MAX', 5)
    const turnoWindowMs = getEnvNumber('RATE_LIMIT_TURNOS_POST_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(new Headers(request.headers))
    const rateLimitKey = `turnos:post:${session.user.id}:${clientIp}`
    const limitResult = await checkRateLimit({
      key: rateLimitKey,
      limit: turnoLimit,
      windowMs: turnoWindowMs,
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

    const body = await request.json()

    const validatedData = iniciarTurnoSchema.parse({
      ...body,
      cajero_id: Number(session.user.id),
    })

    // Validar que la sesión pertenezca al usuario o sea Admin/Supervisor
    if (userRole !== 'Admin' && userRole !== 'Supervisor') {
      const activeSession = await getActiveCashSession(Number(session.user.id))
      if (!activeSession || activeSession.id !== validatedData.sesion_caja_id) {
        return NextResponse.json(
          { error: 'No puede iniciar turno en una sesión que no le pertenece' },
          { status: 403 }
        )
      }
    }

    // Crear el turno
    const nuevoTurno = await iniciarTurno(validatedData)

    // Auditoría financiera
    await logAudit({
      tabla: 'turnos_caja',
      registro_id: nuevoTurno.id,
      accion: 'CREATE',
      usuario_id: Number(session.user.id),
      datos_nuevos: summarizeTurno(nuevoTurno),
    })

    return NextResponse.json(
      { 
        turno: nuevoTurno,
        message: 'Turno iniciado exitosamente' 
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Error al iniciar turno:', error)
    return NextResponse.json(
      { error: 'Error al iniciar turno' },
      { status: 500 }
    )
  }
}
