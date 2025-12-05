import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getLoteById, updateLote, deleteLote, retirarLote, reactivarLote } from '@/lib/db/lotes'
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
 * Elimina, retira o reactiva un lote
 * 
 * Query params:
 * - action: "delete" (eliminación física), "retire" (cambiar estado a retirado), o "reactivar" (retirado → disponible)
 * - motivo: razón de la acción (opcional)
 * 
 * Roles permitidos: Admin, Inventarista
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

    // Verificar rol
    const userRole = session.user.role
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden eliminar/retirar lotes.',
        },
        { status: 403 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'retire' // Default: retirar
    const motivo = searchParams.get('motivo') || undefined

    const usuario_id = Number(session.user.id)

    // Ejecutar acción según el parámetro
    if (action === 'delete') {
      // Eliminación física (solo si no hay ventas)
      const result = await deleteLote(id, usuario_id)
      return NextResponse.json(result, { status: 200 })
    } else if (action === 'reactivar') {
      // Reactivar lote (cambiar de 'retirado' a 'disponible')
      const result = await reactivarLote(id, usuario_id, motivo)
      return NextResponse.json(result, { status: 200 })
    } else {
      // Retirar lote (cambiar estado a 'retirado')
      const result = await retirarLote(id, usuario_id, motivo)
      return NextResponse.json(result, { status: 200 })
    }
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
