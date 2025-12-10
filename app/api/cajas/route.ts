import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { ZodError } from 'zod'
import { getCajas, createCaja } from '@/lib/db/cajas'
import { cajaSchema } from '@/lib/validations/caja.schema'

/**
 * GET /api/cajas - Obtener lista de cajas disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activa = searchParams.get('activa')
    const tipo = searchParams.get('tipo')
    const search = searchParams.get('search')

    const cajas = await getCajas({
      activa: activa ? activa === 'true' : undefined,
      tipo: tipo || undefined,
      search: search || undefined,
    })

    return NextResponse.json({ cajas })
  } catch (error) {
    console.error('Error al obtener cajas:', error)
    return NextResponse.json(
      { error: 'Error al obtener cajas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cajas - Crear nueva caja
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo Admin puede crear cajas
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'No tienes permisos para crear cajas' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = cajaSchema.parse(body)

    const caja = await createCaja(validatedData)

    return NextResponse.json(caja, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/cajas:', error)

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

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
