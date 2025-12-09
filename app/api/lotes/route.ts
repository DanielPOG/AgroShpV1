import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getLotes, createLote } from '@/lib/db/lotes'
import { loteFiltersSchema, createLoteSchema } from '@/lib/validations/lote.schema'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkLotesProximosVencer } from '@/lib/db/alertas'

/**
 * GET /api/lotes
 * Obtiene lista de lotes con filtros y paginación
 * 
 * Query Params:
 * - page: número de página (default: 1)
 * - limit: lotes por página (default: 20)
 * - producto_id: filtro por producto
 * - unidad_productiva_id: filtro por unidad productiva
 * - estado: disponible/vencido/retirado
 * - dias_vencimiento: próximos a vencer en X días
 * - search: búsqueda por código de lote
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
      producto_id: searchParams.get('producto_id')
        ? parseInt(searchParams.get('producto_id')!)
        : undefined,
      unidad_productiva_id: searchParams.get('unidad_productiva_id')
        ? parseInt(searchParams.get('unidad_productiva_id')!)
        : undefined,
      estado: searchParams.get('estado') as 'disponible' | 'vencido' | 'retirado' | undefined,
      dias_vencimiento: searchParams.get('dias_vencimiento')
        ? parseInt(searchParams.get('dias_vencimiento')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    }

    // Validar filtros
    const validatedFilters = loteFiltersSchema.parse(filters)

    // Obtener lotes
    const result = await getLotes(validatedFilters)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/lotes:', error)

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
 * POST /api/lotes
 * Crea un nuevo lote
 * 
 * Body: CreateLoteData (ver lote.schema.ts)
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
          error: 'Acceso denegado. Solo Admin e Inventarista pueden crear lotes.',
        },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()
    const { costos, ...loteData } = body

    // Agregar usuario_id del usuario autenticado
    const dataWithUser = {
      ...loteData,
      usuario_id: Number(session.user.id),
    }

    // Validar datos del lote
    const validatedData = createLoteSchema.parse(dataWithUser)

    // Crear lote
    const lote = await createLote(validatedData)

    // Si se proporcionaron costos, crear el registro de costos
    if (costos) {
      const costoTotal = 
        (costos.costo_materia_prima || 0) +
        (costos.costo_mano_obra || 0) +
        (costos.costo_insumos || 0) +
        (costos.costo_energia || 0) +
        (costos.otros_costos || 0)

      // Convertir Decimal a number para cálculos
      const cantidadNum = typeof lote.cantidad === 'number' 
        ? lote.cantidad 
        : Number(lote.cantidad.toString())
      
      const costoUnitario = cantidadNum > 0 ? costoTotal / cantidadNum : 0

      await prisma.costos_produccion.create({
        data: {
          producto_id: lote.producto_id,
          lote_id: lote.id,
          cantidad_producida: lote.cantidad,
          costo_materia_prima: costos.costo_materia_prima || 0,
          costo_mano_obra: costos.costo_mano_obra || 0,
          costo_insumos: costos.costo_insumos || 0,
          costo_energia: costos.costo_energia || 0,
          otros_costos: costos.otros_costos || 0,
          costo_total: costoTotal,
          costo_unitario: costoUnitario,
          fecha_registro: new Date(),
        },
      })
    }

    // ✅ Verificar alertas de lotes próximos a vencer después de crear
    try {
      await checkLotesProximosVencer()
    } catch (alertError) {
      console.error('Error al verificar alertas de vencimiento:', alertError)
      // No falla la operación si falla la verificación de alertas
    }

    return NextResponse.json(lote, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/lotes:', error)

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
