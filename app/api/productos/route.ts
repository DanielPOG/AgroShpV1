import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getProducts, createProduct } from '@/lib/db/products'
import {
  productFiltersSchema,
  createProductSchema,
} from '@/lib/validations/product.schema'
import { ZodError } from 'zod'

/**
 * GET /api/productos
 * Obtiene lista de productos con paginación y filtros
 * 
 * Query Params:
 * - page: número de página (default: 1)
 * - limit: productos por página (default: 20)
 * - search: búsqueda por nombre/código/descripción
 * - categoria_id: filtro por categoría
 * - unidad_productiva_id: filtro por unidad productiva
 * - activo: true/false
 * - tipo_medida: unidad/peso/volumen/lote
 * - es_perecedero: true/false
 * - proveedor_id: filtro por proveedor
 * - precio_min, precio_max: rango de precios
 * - stock_status: bajo/agotado/disponible
 * - stock_min, stock_max: rango de stock
 * - sortBy: precio_asc/precio_desc/stock_asc/stock_desc/nombre_asc/nombre_desc/fecha_creacion
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
      categoria_id: searchParams.get('categoria_id')
        ? parseInt(searchParams.get('categoria_id')!)
        : undefined,
      unidad_productiva_id: searchParams.get('unidad_productiva_id')
        ? parseInt(searchParams.get('unidad_productiva_id')!)
        : undefined,
      activo:
        searchParams.get('activo') === 'true'
          ? true
          : searchParams.get('activo') === 'false'
          ? false
          : undefined,
      tipo_medida: searchParams.get('tipo_medida') as
        | 'unidad'
        | 'peso'
        | 'volumen'
        | 'lote'
        | undefined,
      es_perecedero:
        searchParams.get('es_perecedero') === 'true'
          ? true
          : searchParams.get('es_perecedero') === 'false'
          ? false
          : undefined,
      proveedor_id: searchParams.get('proveedor_id')
        ? parseInt(searchParams.get('proveedor_id')!)
        : undefined,
      precio_min: searchParams.get('precio_min')
        ? parseFloat(searchParams.get('precio_min')!)
        : undefined,
      precio_max: searchParams.get('precio_max')
        ? parseFloat(searchParams.get('precio_max')!)
        : undefined,
      stock_status: searchParams.get('stock_status') as
        | 'bajo'
        | 'agotado'
        | 'disponible'
        | undefined,
      stock_min: searchParams.get('stock_min')
        ? parseFloat(searchParams.get('stock_min')!)
        : undefined,
      stock_max: searchParams.get('stock_max')
        ? parseFloat(searchParams.get('stock_max')!)
        : undefined,
      sortBy: searchParams.get('sortBy') as
        | 'precio_asc'
        | 'precio_desc'
        | 'stock_asc'
        | 'stock_desc'
        | 'nombre_asc'
        | 'nombre_desc'
        | 'fecha_creacion'
        | undefined,
    }

    // Validar filtros
    const validatedFilters = productFiltersSchema.parse(filters)

    // Obtener productos
    const result = await getProducts(validatedFilters)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/productos:', error)

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
 * POST /api/productos
 * Crea un nuevo producto
 * 
 * Body: CreateProductData (ver product.schema.ts)
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
          error: 'Acceso denegado. Solo Admin e Inventarista pueden crear productos.',
        },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()

    // Agregar usuario_id del usuario autenticado (convertir a número)
    const dataWithUser = {
      ...body,
      usuario_id: Number(session.user.id),
    }

    // Validar datos
    const validatedData = createProductSchema.parse(dataWithUser)

    // Crear producto
    const product = await createProduct(validatedData)

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/productos:', error)

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
