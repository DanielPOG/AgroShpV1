// Forzar runtime de Node.js (no Edge) para soportar serialport
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { createSale, getSales } from '@/lib/db/sales'
import { createSaleSchema, salesFiltersSchema } from '@/lib/validations/sale.schema'
import { validateCashSessionForSale, registerSaleInCashMovements } from '@/lib/db/cash-integration'
import { checkRateLimit, getClientIpAddress, getEnvNumber } from '@/lib/security/rate-limit'
import { getIdempotencyKey, checkIdempotency, saveIdempotencyResponse } from '@/lib/security/idempotency'
import { logAudit, summarizeSale } from '@/lib/security/audit'
import { ZodError } from 'zod'
import { getPrinter, type VentaData } from '@/lib/printer/escpos-printer'

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
 *   factura_generada?: boolean,  // ✨ NUEVO: registro atómico
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

    const ventasLimit = getEnvNumber('RATE_LIMIT_VENTAS_POST_MAX', 15)
    const ventasWindowMs = getEnvNumber('RATE_LIMIT_VENTAS_POST_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(request.headers)
    const rateLimitKey = `ventas:post:${session.user.id}:${clientIp}`
    const limitResult = await checkRateLimit({
      key: rateLimitKey,
      limit: ventasLimit,
      windowMs: ventasWindowMs,
    })

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Intente nuevamente en unos segundos.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(limitResult.retryAfterSeconds),
          },
        }
      )
    }

    // Idempotencia: verificar si ya se procesó esta operación
    const idempotencyKey = getIdempotencyKey(request.headers)
    if (idempotencyKey) {
      const cached = await checkIdempotency({
        key: idempotencyKey,
        endpoint: 'POST /api/ventas',
        userId: Number(session.user.id),
      })
      if (cached.hit) return cached.response
    }

    // ⭐ NUEVO: Validar sesión de caja abierta Y turno activo (CRÍTICO)
    let cashSession
    let turnoActivo
    try {
      const validation = await validateCashSessionForSale(Number(session.user.id))
      cashSession = validation.session
      turnoActivo = validation.turno
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json(
          {
            error: 'Sesión de caja y turno requeridos',
            message: error.message,
            code: 'NO_CASH_SESSION_OR_TURNO',
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

    // Crear venta (pasar sessionId y turnoId para vincular)
    const venta = await createSale({
      ...validatedData,
      usuario_id: Number(session.user.id),
      turno_caja_id: turnoActivo.id,
    }, cashSession.id)

    // Verificar que la venta se creó correctamente
    if (!venta) {
      throw new Error('Error al crear la venta')
    }

    // Registrar venta en movimientos de caja
    try {
      for (const pago of venta.pagos_venta) {
        const metodoPagoNombre = pago.metodo_pago?.nombre || 'Desconocido'

        await registerSaleInCashMovements({
          sessionId: cashSession.id,
          turnoId: turnoActivo.id,
          ventaId: venta.id,
          codigoVenta: venta.codigo_venta,
          total: Number(pago.monto),
          metodoPagoId: pago.metodo_pago_id || 1,
          metodoPagoNombre,
        })
      }
    } catch (movementError) {
      console.error('Error al registrar movimiento de caja:', movementError instanceof Error ? movementError.message : 'Error desconocido')
    }

    // Imprimir ticket y/o abrir cajón de dinero según configuración
    try {
      const printer = getPrinter()

      if (venta.factura_generada) {
        
        // Agrupar detalles de venta por producto (un producto puede tener varios lotes)
        const itemsAgrupados = venta.detalle_ventas?.reduce((acc, item) => {
          // Para productos ficticios, el nombre está en observaciones
          const productoNombre = item.producto?.nombre || item.observaciones || 'Producto'
          const existing = acc.find(i => i.nombre === productoNombre)
          
          if (existing) {
            // Sumar cantidad si ya existe el producto
            existing.cantidad += Number(item.cantidad)
          } else {
            // Agregar nuevo producto
            acc.push({
              nombre: productoNombre,
              cantidad: Number(item.cantidad),
              precio: Number(item.precio_unitario),
            })
          }
          
          return acc
        }, [] as Array<{ nombre: string; cantidad: number; precio: number }>) || []
        
        // Preparar datos para impresión
        const ventaData: VentaData = {
          codigo_venta: venta.codigo_venta,
          items: itemsAgrupados,
          subtotal: Number(venta.subtotal),
          descuento: venta.descuento ? Number(venta.descuento) : undefined,
          total: Number(venta.total),
          cliente_nombre: venta.cliente?.nombre || validatedData.cliente_nombre,
          cliente_telefono: venta.cliente_telefono ?? undefined,  // Cédula/NIT
          fecha: venta.fecha_venta || new Date(),
          requiere_factura: venta.requiere_factura || false,
          factura_generada: venta.factura_generada || false,
        }

        // Calcular efectivo recibido y cambio si fue proporcionado desde el frontend
        if (validatedData.efectivo_recibido !== undefined && validatedData.efectivo_recibido > 0) {
          ventaData.efectivo_recibido = validatedData.efectivo_recibido
          ventaData.cambio = validatedData.efectivo_recibido - Number(venta.total)
        }

        await printer.printVentaAndOpenDrawer(ventaData)
      } 
      else if (!venta.requiere_factura) {
        await printer.openDrawerOnly()
      }
      else {
        // Factura se enviará por correo
      }
      
    } catch (printerError) {
      console.error('Error al procesar impresión:', printerError instanceof Error ? printerError.message : 'Error desconocido')
    }

    // Auditoría financiera
    await logAudit({
      tabla: 'ventas',
      registro_id: venta.id,
      accion: 'CREATE',
      usuario_id: Number(session.user.id),
      datos_nuevos: summarizeSale(venta),
    })

    // Guardar idempotencia si se proporcionó key
    if (idempotencyKey) {
      await saveIdempotencyResponse({
        key: idempotencyKey,
        endpoint: 'POST /api/ventas',
        userId: Number(session.user.id),
        statusCode: 201,
        responseBody: venta,
      })
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
