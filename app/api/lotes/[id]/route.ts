import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getLoteById, updateLote, deleteLote } from '@/lib/db/lotes'
import { updateLoteSchema } from '@/lib/validations/lote.schema'
import { z } from 'zod'
import { ZodError } from 'zod'

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
})

/**
 * GET /api/lotes/[id]
 * Obtiene un lote por ID
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Obtener lote
    const lote = await getLoteById(id)

    return NextResponse.json(lote, { status: 200 })
  } catch (error) {
    console.error(`Error en GET /api/lotes/[id]:`, error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'ID inválido',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('no encontrado')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/lotes/[id]
 * Actualiza un lote (solo estado y cantidad)
 * 
 * Body: UpdateLoteData (ver lote.schema.ts)
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Verificar rol
    const userRole = session.user.role
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden actualizar lotes.',
        },
        { status: 403 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Parsear body
    const body = await request.json()

    // Agregar usuario_id para auditoría
    const dataWithUser = {
      ...body,
      usuario_id: Number(session.user.id),
    }

    // Validar datos
    const validatedData = updateLoteSchema.parse(dataWithUser)

    // Actualizar lote
    const lote = await updateLote(id, validatedData)

    return NextResponse.json(lote, { status: 200 })
  } catch (error) {
    console.error(`Error en PUT /api/lotes/[id]:`, error)

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
      if (error.message.includes('no encontrado')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/lotes/[id]
 * Elimina un lote
 * 
 * Roles permitidos: Admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Verificar rol (solo Admin puede eliminar)
    const userRole = session.user.role
    if (userRole !== 'Admin') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin puede eliminar lotes.',
        },
        { status: 403 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Eliminar lote
    const result = await deleteLote(id)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error(`Error en DELETE /api/lotes/[id]:`, error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'ID inválido',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('no encontrado')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
