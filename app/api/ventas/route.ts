import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { createSale, getSales } from '@/lib/db/sales'
import { createSaleSchema, salesFiltersSchema } from '@/lib/validations/sale.schema'
import { validateCashSessionForSale, registerSaleInCashMovements } from '@/lib/db/cash-integration'
import { ZodError } from 'zod'

/**
 * GET /api/ventas
 * Obtiene lista de ventas con filtros y paginación
 * 
 * Query Params:
 * - page: número de página (default: 1)
 * - limit: ventas por página (default: 20, max: 100)
 * - fecha_desde: filtro por fecha inicio (ISO string)
 * - fecha_hasta: filtro por fecha fin (ISO string)
 * - usuario_id: filtro por cajero
 * - cliente_id: filtro por cliente
 * - estado: completada/cancelada/pendiente
 * - metodo_pago: ID del método de pago
 * - search: búsqueda por código de venta o cliente
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
      fecha_desde: searchParams.get('fecha_desde') || undefined,
      fecha_hasta: searchParams.get('fecha_hasta') || undefined,
      usuario_id: searchParams.get('usuario_id')
        ? parseInt(searchParams.get('usuario_id')!)
        : undefined,
      cliente_id: searchParams.get('cliente_id')
        ? parseInt(searchParams.get('cliente_id')!)
        : undefined,
      estado: searchParams.get('estado') as 'completada' | 'cancelada' | 'pendiente' | undefined,
      metodo_pago: searchParams.get('metodo_pago')
        ? parseInt(searchParams.get('metodo_pago')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    }

    // Validar filtros
    const validatedFilters = salesFiltersSchema.parse(filters)

    // Si el usuario no es Admin, solo puede ver sus propias ventas
    if (session.user.role !== 'Admin' && session.user.role !== 'Administrador') {
      validatedFilters.usuario_id = Number(session.user.id)
    }

    // Obtener ventas
    const result = await getSales(validatedFilters)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/ventas:', error)

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
 * POST /api/ventas
 * Crea una nueva venta completa
 * 
 * Body: CreateSaleData (ver sale.schema.ts)
 * {
 *   items: [{ producto_id, cantidad, precio_unitario, descuento_porcentaje?, observaciones? }],
 *   pagos: [{ metodo_pago_id, monto, referencia? }],
 *   cliente_id?: number,
 *   cliente_nombre?: string,
 *   cliente_email?: string,
 *   cliente_telefono?: string,
 *   descuento_global?: number,
 *   requiere_factura?: boolean,
 *   observaciones?: string
 * }
 * 
 * Roles permitidos: Admin, Cajero
 * IMPORTANTE: Requiere sesión de caja abierta
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
    if (userRole !== 'Admin' && userRole !== 'Administrador' && userRole !== 'Cajero') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin y Cajero pueden crear ventas.',
        },
        { status: 403 }
      )
    }

    // ⭐ NUEVO: Validar sesión de caja abierta (CRÍTICO)
    let cashSession
    try {
      cashSession = await validateCashSessionForSale(Number(session.user.id))
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json(
          {
            error: 'Sesión de caja requerida',
            message: error.message,
            code: 'NO_CASH_SESSION',
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Parsear body
    const body = await request.json()

    // Agregar usuario_id del usuario autenticado
    const dataWithUser = {
      ...body,
      usuario_id: Number(session.user.id),
    }

    // Validar datos
    const validatedData = createSaleSchema.parse(dataWithUser)

    // Log para debugging
    console.log(`📝 Creando venta para usuario ${session.user.name} (ID: ${session.user.id})`)
    console.log(`   - Sesión de caja: ${cashSession.id}`)
    console.log(`   - Items: ${validatedData.items.length}`)
    console.log(`   - Métodos de pago: ${validatedData.pagos.length}`)

    // Crear venta
    const venta = await createSale({
      ...validatedData,
      usuario_id: Number(session.user.id),
    })

    // ⭐ NUEVO: Registrar venta en movimientos de caja
    try {
      // Para cada método de pago, registrar el movimiento
      for (const pago of venta.pagos_venta) {
        await registerSaleInCashMovements({
          sessionId: cashSession.id,
          ventaId: venta.id,
          codigoVenta: venta.codigo_venta,
          total: Number(pago.monto),
          metodoPagoId: pago.metodo_pago_id,
          metodoPagoNombre: pago.metodo_pago?.nombre || 'Desconocido',
        })
      }
    } catch (movementError) {
      console.error('⚠️ Error al registrar movimiento de caja:', movementError)
      // No fallar la venta por error en movimiento
      // La venta ya está creada, solo loguear el error
    }

    return NextResponse.json(venta, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/ventas:', error)

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
      // Errores de negocio (stock insuficiente, lote vencido, etc.)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
