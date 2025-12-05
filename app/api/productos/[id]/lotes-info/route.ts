import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/productos/[id]/lotes-info
 * Obtiene información sobre los lotes de un producto
 * Usado para verificar antes de desactivar
 * 
 * Retorna:
 * - total_lotes: Total de lotes del producto
 * - lotes_disponibles: Lotes con estado 'disponible'
 * - cantidad_total: Suma de cantidades en lotes disponibles
 * - lotes: Lista de lotes disponibles
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const productoId = parseInt(id)

    if (isNaN(productoId)) {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      )
    }

    // Verificar que el producto existe
    const producto = await prisma.productos.findUnique({
      where: { id: productoId },
      select: {
        id: true,
        nombre: true,
        unidad: true,
      },
    })

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener estadísticas de lotes
    const [totalLotes, lotesDisponibles, cantidadTotal, lotes] = await Promise.all([
      // Total de lotes
      prisma.lotes_productos.count({
        where: { producto_id: productoId },
      }),
      
      // Lotes disponibles
      prisma.lotes_productos.count({
        where: { 
          producto_id: productoId,
          estado: 'disponible',
        },
      }),
      
      // Cantidad total en lotes disponibles
      prisma.lotes_productos.aggregate({
        where: { 
          producto_id: productoId,
          estado: 'disponible',
        },
        _sum: {
          cantidad: true,
        },
      }),
      
      // Lista de lotes disponibles
      prisma.lotes_productos.findMany({
        where: { 
          producto_id: productoId,
          estado: 'disponible',
        },
        select: {
          id: true,
          codigo_lote: true,
          cantidad: true,
          fecha_produccion: true,
          fecha_vencimiento: true,
          unidad_productiva: {
            select: {
              nombre: true,
            },
          },
        },
        orderBy: {
          fecha_vencimiento: 'asc',
        },
      }),
    ])

    return NextResponse.json({
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        unidad: producto.unidad,
      },
      total_lotes: totalLotes,
      lotes_disponibles: lotesDisponibles,
      cantidad_total: Number(cantidadTotal._sum.cantidad || 0),
      lotes: lotes,
    }, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/productos/[id]/lotes-info:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
