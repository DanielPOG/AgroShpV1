import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const caja_id = searchParams.get('caja_id')
    const usuario_id = searchParams.get('usuario_id')

    const where: any = {}

    if (fecha_desde || fecha_hasta) {
      where.fecha_apertura = {}
      if (fecha_desde) {
        where.fecha_apertura.gte = new Date(fecha_desde)
      }
      if (fecha_hasta) {
        where.fecha_apertura.lte = new Date(fecha_hasta)
      }
    }

    if (caja_id) {
      where.caja_id = Number.parseInt(caja_id)
    }

    if (usuario_id) {
      where.usuario_id = Number.parseInt(usuario_id)
    }

    const sesiones = await prisma.sesiones_caja.findMany({
      where,
      orderBy: { fecha_apertura: 'desc' },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
          },
        },
        cajero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
        movimientos_caja: {
          select: {
            id: true,
            tipo_movimiento: true,
            monto: true,
            metodo_pago: true,
            descripcion: true,
          },
        },
        retiros_caja: {
          select: {
            id: true,
            monto: true,
            motivo: true,
          },
        },
        gastos_caja: {
          select: {
            id: true,
            monto: true,
            categoria_gasto: true,
          },
        },
        arqueos_caja: {
          select: {
            id: true,
            total_contado: true,
            diferencia: true,
          },
        },
      },
    })

    // Calcular totales generales
    const totales = {
      total_sesiones: sesiones.length,
      total_fondo_inicial: sesiones.reduce((sum, s) => sum + Number(s.fondo_inicial), 0),
      total_ventas_efectivo: sesiones.reduce((sum, s) => sum + Number(s.total_ventas_efectivo || 0), 0),
      total_ventas_nequi: sesiones.reduce((sum, s) => sum + Number(s.total_ventas_nequi || 0), 0),
      total_ventas_tarjeta: sesiones.reduce((sum, s) => sum + Number(s.total_ventas_tarjeta || 0), 0),
      total_ventas_transferencia: sesiones.reduce(
        (sum, s) => sum + Number(s.total_ventas_transferencia || 0),
        0
      ),
      total_retiros: sesiones.reduce((sum, s) => sum + Number(s.total_retiros || 0), 0),
      total_gastos: sesiones.reduce((sum, s) => sum + Number(s.total_gastos || 0), 0),
      total_diferencias: sesiones.reduce((sum, s) => sum + Number(s.diferencia || 0), 0),
      sesiones_cuadradas: sesiones.filter((s) => s.cuadrada).length,
      sesiones_descuadradas: sesiones.filter((s) => s.cuadrada === false).length,
    }

    return NextResponse.json({
      sesiones,
      totales,
    })
  } catch (error) {
    console.error('Error al obtener reporte de caja:', error)
    return NextResponse.json({ error: 'Error al generar reporte de caja' }, { status: 500 })
  }
}
