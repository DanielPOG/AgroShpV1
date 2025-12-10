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
    const producto_id = searchParams.get('producto_id')
    const tipo_movimiento = searchParams.get('tipo_movimiento')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const page = Number.parseInt(searchParams.get('page') || '1')
    const limit = Number.parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (producto_id) {
      where.producto_id = Number.parseInt(producto_id)
    }

    if (tipo_movimiento) {
      where.tipo_movimiento = tipo_movimiento
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha_movimiento = {}
      if (fecha_desde) {
        where.fecha_movimiento.gte = new Date(fecha_desde)
      }
      if (fecha_hasta) {
        where.fecha_movimiento.lte = new Date(fecha_hasta)
      }
    }

    const skip = (page - 1) * limit

    const [historial, total] = await Promise.all([
      prisma.historial_inventario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_movimiento: 'desc' },
        include: {
          productos: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              unidad: true,
            },
          },
        },
      }),
      prisma.historial_inventario.count({ where }),
    ])

    return NextResponse.json({
      historial,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error al obtener historial:', error)
    return NextResponse.json({ error: 'Error al obtener historial de inventario' }, { status: 500 })
  }
}
