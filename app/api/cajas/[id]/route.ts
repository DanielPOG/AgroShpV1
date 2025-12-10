import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { ZodError } from 'zod'
import { getCajaById, updateCaja, deleteCaja } from '@/lib/db/cajas'
import { updateCajaSchema } from '@/lib/validations/caja.schema'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const id = Number.parseInt(params.id)

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const caja = await getCajaById(id)

    if (!caja) {
      return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 })
    }

    return NextResponse.json(caja)
  } catch (error) {
    console.error('Error al obtener caja:', error)
    return NextResponse.json({ error: 'Error al obtener caja' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo Admin puede actualizar cajas
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'No tienes permisos para actualizar cajas' }, { status: 403 })
    }

    const id = Number.parseInt(params.id)

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateCajaSchema.parse(body)

    const caja = await updateCaja(id, validatedData)

    return NextResponse.json(caja)
  } catch (error) {
    console.error('Error en PUT /api/cajas/[id]:', error)

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo Admin puede eliminar cajas
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'No tienes permisos para eliminar cajas' }, { status: 403 })
    }

    const id = Number.parseInt(params.id)

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const caja = await deleteCaja(id)

    return NextResponse.json({ message: 'Caja desactivada exitosamente', caja })
  } catch (error) {
    console.error('Error en DELETE /api/cajas/[id]:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
