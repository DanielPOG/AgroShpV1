import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getUnits, createUnit } from '@/lib/db/units'
import {
  unitFiltersSchema,
  createUnitSchema,
} from '@/lib/validations/unit.schema'
import { ZodError } from 'zod'

/**
 * GET /api/unidades
 * Obtiene lista de unidades productivas con paginación y filtros
 * 
 * Query Params:
 * - page: número de página (default: 1)
 * - limit: unidades por página (default: 20)
 * - search: búsqueda por nombre o código
 * - tipo: filtro por tipo
 * - activa: true/false
 * - responsable_id: filtro por responsable
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
      tipo: searchParams.get('tipo') || undefined,
      activa:
        searchParams.get('activa') === 'true'
          ? true
          : searchParams.get('activa') === 'false'
          ? false
          : undefined,
      responsable_id: searchParams.get('responsable_id')
        ? parseInt(searchParams.get('responsable_id')!)
        : undefined,
    }

    // Validar filtros
    const validatedFilters = unitFiltersSchema.parse(filters)

    // Obtener unidades
    const result = await getUnits(validatedFilters)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/unidades:', error)

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
 * POST /api/unidades
 * Crea una nueva unidad productiva
 * 
 * Body: CreateUnitData (ver unit.schema.ts)
 * {
 *   codigo: string (formato: MAYUS-123)
 *   nombre: string
 *   descripcion?: string
 *   tipo?: string
 *   responsable_id?: number
 *   ubicacion?: string
 *   activa?: boolean
 * }
 * 
 * Roles permitidos: Admin
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

    // Verificar rol (solo Admin puede crear unidades)
    const userRole = session.user.role
    if (userRole !== 'Admin') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin puede crear unidades productivas.',
        },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()

    // Validar datos
    const validatedData = createUnitSchema.parse(body)

    // Crear unidad
    const unit = await createUnit(validatedData)

    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/unidades:', error)

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
