import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import {
  openCashSession,
  closeCashSession,
  getActiveCashSession,
  getCashSessionSummary,
} from '@/lib/db/cash-sessions'
import { openCashSessionSchema, closeCashSessionSchema } from '@/lib/validations/cash-session.schema'
import { ZodError } from 'zod'

/**
 * GET /api/caja/session - Obtener sesión activa del cajero
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const activeSession = await getActiveCashSession(Number(session.user.id))

    if (!activeSession) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    // Obtener resumen completo
    const summary = await getCashSessionSummary(activeSession.id)

    return NextResponse.json({
      session: activeSession,
      summary,
    })
  } catch (error) {
    console.error('Error al obtener sesión activa:', error)
    return NextResponse.json(
      { error: 'Error al obtener sesión activa' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caja/session - Abrir nueva sesión de caja
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que tenga permiso de cajero
    const userRole = session.user.role
    if (userRole !== 'Cajero' && userRole !== 'Admin') {
      return NextResponse.json(
        { error: 'Solo cajeros pueden abrir caja' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = openCashSessionSchema.parse(body)

    const newSession = await openCashSession(Number(session.user.id), validatedData)

    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Error al abrir sesión:', error)
    return NextResponse.json(
      { error: 'Error al abrir sesión de caja' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/caja/session - Cerrar sesión de caja
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, ...closeData } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Se requiere sessionId' },
        { status: 400 }
      )
    }

    const validatedData = closeCashSessionSchema.parse(closeData)

    const result = await closeCashSession(
      Number(sessionId),
      Number(session.user.id),
      validatedData
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Error al cerrar sesión:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesión de caja' },
      { status: 500 }
    )
  }
}
