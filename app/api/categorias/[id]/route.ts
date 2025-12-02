import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '@/lib/db/categories'
import { updateCategorySchema } from '@/lib/validations/category.schema'
import { idParamSchema } from '@/lib/validations/common.schema'
import { ZodError } from 'zod'

/**
 * GET /api/categorias/[id]
 * Obtiene una categoría por ID
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Validar ID
    const { id } = idParamSchema.parse({ id: params.id })

    // Obtener categoría
    const category = await getCategoryById(id)

    return NextResponse.json(category, { status: 200 })
  } catch (error) {
    console.error(`Error en GET /api/categorias/${params.id}:`, error)

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
 * PUT /api/categorias/[id]
 * Actualiza una categoría existente
 * 
 * Body: UpdateCategoryData (ver category.schema.ts)
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const userRole = session.user.rol
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden actualizar categorías.',
        },
        { status: 403 }
      )
    }

    // Validar ID
    const { id } = idParamSchema.parse({ id: params.id })

    // Parsear body
    const body = await request.json()

    // Validar datos
    const validatedData = updateCategorySchema.parse(body)

    // Actualizar categoría
    const category = await updateCategory(id, validatedData)

    return NextResponse.json(category, { status: 200 })
  } catch (error) {
    console.error(`Error en PUT /api/categorias/${params.id}:`, error)

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
 * DELETE /api/categorias/[id]
 * Elimina una categoría
 * Protección: No permite eliminar si tiene productos activos
 * 
 * Roles permitidos: Admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const userRole = session.user.rol
    if (userRole !== 'Admin') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin puede eliminar categorías.',
        },
        { status: 403 }
      )
    }

    // Validar ID
    const { id } = idParamSchema.parse({ id: params.id })

    // Eliminar categoría
    const result = await deleteCategory(id)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error(`Error en DELETE /api/categorias/${params.id}:`, error)

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
