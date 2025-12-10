import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Endpoint de DEBUG para verificar pago mixto
 * GET /api/debug/pago-mixto?codigo=VTA-XXX
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo') || ''

    if (!codigo) {
      return NextResponse.json({ error: 'Falta parámetro codigo' }, { status: 400 })
    }

    // 1. Buscar venta
    const venta = await prisma.ventas.findFirst({
      where: {
        codigo_venta: {
          contains: codigo
        }
      },
      include: {
        pagos_venta: {
          include: {
            metodo_pago: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        fecha_venta: 'desc'
      }
    })

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    }

    // 2. Buscar sesión de caja activa del usuario
    const sesion = await prisma.sesiones_caja.findFirst({
      where: {
        usuario_id: venta.usuario_id,
        estado: 'abierta'
      },
      orderBy: {
        fecha_apertura: 'desc'
      }
    })

    // 3. Buscar movimientos de caja relacionados
    const movimientos = await prisma.movimientos_caja.findMany({
      where: {
        venta_id: venta.id
      },
      orderBy: {
        fecha_hora: 'desc'
      }
    })

    // 4. Calcular totales por método
    const totalesPorMetodo = venta.pagos_venta.reduce((acc, pago) => {
      const metodo = pago.metodo_pago?.nombre || 'Desconocido'
      acc[metodo] = (acc[metodo] || 0) + Number(pago.monto)
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      venta: {
        id: venta.id,
        codigo: venta.codigo_venta,
        total: venta.total,
        fecha: venta.fecha_venta,
        cajero: `${venta.usuario.nombre} ${venta.usuario.apellido}`
      },
      pagos: venta.pagos_venta.map(p => ({
        id: p.id,
        monto: p.monto,
        metodo_id: p.metodo_pago_id,
        metodo_nombre: p.metodo_pago?.nombre || 'Desconocido',
        referencia: p.referencia
      })),
      totalesPorMetodo,
      sesion: sesion ? {
        id: sesion.id,
        fondo_inicial: sesion.fondo_inicial,
        total_ventas: sesion.total_ventas,
        total_ventas_efectivo: sesion.total_ventas_efectivo,
        total_ventas_nequi: sesion.total_ventas_nequi,
        total_ventas_tarjeta: sesion.total_ventas_tarjeta,
        total_ventas_transferencia: sesion.total_ventas_transferencia,
        fecha_apertura: sesion.fecha_apertura
      } : null,
      movimientos: movimientos.map(m => ({
        id: m.id,
        tipo: m.tipo_movimiento,
        descripcion: m.descripcion,
        monto: m.monto,
        metodo_pago: m.metodo_pago,
        fecha: m.fecha_hora
      })),
      diagnostico: {
        ventaEsPagoMixto: venta.pagos_venta.length > 1,
        cantidadPagos: venta.pagos_venta.length,
        cantidadMovimientos: movimientos.length,
        movimientosCorrectos: movimientos.length === venta.pagos_venta.length,
        efectivoPagado: totalesPorMetodo['Efectivo'] || 0,
        efectivoEnSesion: sesion?.total_ventas_efectivo || 0,
        alerta: movimientos.length !== venta.pagos_venta.length 
          ? '⚠️ La cantidad de movimientos NO coincide con la cantidad de pagos'
          : '✅ Cantidad de movimientos correcta'
      }
    })
  } catch (error) {
    console.error('Error en debug endpoint:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de debug', details: String(error) },
      { status: 500 }
    )
  }
}
