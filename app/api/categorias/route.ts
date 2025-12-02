import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getCategories, createCategory } from '@/lib/db/categories'
import {
  categoryFiltersSchema,
  createCategorySchema,
} from '@/lib/validations/category.schema'
import { ZodError } from 'zod'

/**
 * GET /api/categorias
 * Obtiene lista de categorías con paginación y filtros
 * 
 * Query Params:
 * - page: número de página (default: 1)
 * - limit: categorías por página (default: 20)
 * - search: búsqueda por nombre
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Extraer parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const filters = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      search: searchParams.get('search') || undefined,
    }

    // Validar filtros
    const validatedFilters = categoryFiltersSchema.parse(filters)

    // Obtener categorías
    const result = await getCategories(validatedFilters)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/categorias:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categorias
 * Crea una nueva categoría
 * 
 * Body: CreateCategoryData (ver category.schema.ts)
 * {
 *   nombre: string
 *   descripcion?: string
 *   icono?: string
 *   color?: string
 * }
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function POST(request: NextRequest) {
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
          error: 'Acceso denegado. Solo Admin e Inventarista pueden crear categorías.',
        },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()

    // Validar datos
    const validatedData = createCategorySchema.parse(body)

    // Crear categoría
    const category = await createCategory(validatedData)

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/categorias:', error)

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

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
