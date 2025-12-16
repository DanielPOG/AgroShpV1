// Forzar runtime de Node.js (no Edge) para soportar serialport
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { createSale, getSales } from '@/lib/db/sales'
import { createSaleSchema, salesFiltersSchema } from '@/lib/validations/sale.schema'
import { validateCashSessionForSale, registerSaleInCashMovements } from '@/lib/db/cash-integration'
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

    // Log para debugging
    console.log(`📝 Creando venta para usuario ${session.user.name} (ID: ${session.user.id})`)
    console.log(`   - Sesión de caja: ${cashSession.id}`)
    console.log(`   - Turno activo: ${turnoActivo.id}`)
    console.log(`   - Items: ${validatedData.items.length}`)
    console.log(`   - Métodos de pago: ${validatedData.pagos.length}`)

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

    // ⭐ NUEVO: Registrar venta en movimientos de caja
    try {
      console.log(`🔍 DEBUG: Procesando ${venta.pagos_venta.length} pagos para integración con caja`)
      
      // Para cada método de pago, registrar el movimiento
      for (const pago of venta.pagos_venta) {
        const metodoPagoNombre = pago.metodo_pago?.nombre || 'Desconocido'
        
        console.log(`📌 DEBUG Pago:`, {
          metodo_pago_id: pago.metodo_pago_id,
          metodo_pago_objeto: pago.metodo_pago,
          metodo_pago_nombre: metodoPagoNombre,
          monto: pago.monto
        })
        
        await registerSaleInCashMovements({
          sessionId: cashSession.id,
          turnoId: turnoActivo.id,
          ventaId: venta.id,
          codigoVenta: venta.codigo_venta,
          total: Number(pago.monto),
          metodoPagoId: pago.metodo_pago_id || 1, // Default a efectivo si es null
          metodoPagoNombre,
        })
      }
      console.log(`✅ Todos los pagos registrados en movimientos de caja`)
    } catch (movementError) {
      console.error('⚠️ Error al registrar movimiento de caja:', movementError)
      console.error('⚠️ Stack trace:', movementError instanceof Error ? movementError.stack : 'No stack')
      // No fallar la venta por error en movimiento
      // La venta ya está creada, solo loguear el error
    }

    // 🖨️ NUEVO: Imprimir ticket y/o abrir cajón de dinero según configuración
    try {
      console.log(`🖨️ Procesando impresión/cajón para venta ${venta.codigo_venta}`)
      console.log(`   - Requiere factura: ${venta.requiere_factura}`)
      console.log(`   - Factura generada: ${venta.factura_generada}`)
      
      // Obtener instancia de impresora
      const printer = getPrinter()

      // Caso 1: Usuario seleccionó "Generar Factura" → Imprimir ticket completo y abrir cajón
      if (venta.factura_generada) {
        console.log(`📄 Imprimiendo ticket con factura...`)
        
        // Preparar datos para impresión
        const ventaData: VentaData = {
          codigo_venta: venta.codigo_venta,
          items: venta.detalle_ventas?.map(item => ({
            nombre: item.producto?.nombre || 'Producto',
            cantidad: Number(item.cantidad),
            precio: Number(item.precio_unitario),
          })) || [],
          subtotal: Number(venta.subtotal),
          descuento: venta.descuento ? Number(venta.descuento) : undefined,
          total: Number(venta.total),
          cliente_nombre: venta.cliente?.nombre || validatedData.cliente_nombre,
          fecha: venta.fecha_venta || new Date(),
          requiere_factura: venta.requiere_factura || false,
          factura_generada: venta.factura_generada || false,
        }

        // Calcular efectivo recibido y cambio si hay pago en efectivo
        const pagoEfectivo = venta.pagos_venta.find(p => 
          p.metodo_pago?.nombre.toLowerCase().includes('efectivo')
        )
        
        if (pagoEfectivo) {
          // Si es pago mixto, sumar todos los montos para calcular total recibido
          const totalRecibido = venta.pagos_venta.reduce((sum, p) => sum + Number(p.monto), 0)
          ventaData.efectivo_recibido = totalRecibido
          ventaData.cambio = totalRecibido - Number(venta.total)
        }

        // Imprimir ticket completo y abrir cajón
        await printer.printVentaAndOpenDrawer(ventaData)
        console.log(`✅ Ticket impreso y cajón abierto exitosamente`)
      } 
      // Caso 2: Usuario seleccionó "Omitir" (requiere_factura = false) → Solo abrir cajón
      else if (!venta.requiere_factura) {
        console.log(`💰 Venta sin factura - Solo abriendo cajón...`)
        await printer.openDrawerOnly()
        console.log(`✅ Cajón abierto exitosamente (sin impresión de ticket)`)
      }
      // Caso 3: Usuario seleccionó "Enviar por Correo" (requiere_factura = true pero factura_generada = false)
      // → No imprimir ni abrir cajón (se enviará por email)
      else {
        console.log(`📧 Factura se enviará por correo - No se imprime ticket ni se abre cajón`)
      }
      
    } catch (printerError) {
      console.error('⚠️ Error al procesar impresión/cajón:', printerError)
      console.error('⚠️ Stack trace:', printerError instanceof Error ? printerError.stack : 'No stack')
      // No fallar la venta por error de impresión
      // La venta ya está guardada, solo loguear el error
      // El usuario puede reimprimir manualmente si es necesario
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
