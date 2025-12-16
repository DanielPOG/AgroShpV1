import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/reportes/unidades-productivas
 * Reporte de ventas por unidad productiva
 * 
 * Muestra:
 * - Total de ventas por unidad productiva
 * - Cantidad de productos vendidos
 * - Cantidad de lotes vendidos
 * - Ranking de unidades más vendidas
 * 
 * Query params:
 * - fecha_desde: fecha inicio (ISO string)
 * - fecha_hasta: fecha fin (ISO string)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Extraer parámetros
    const { searchParams } = new URL(request.url)
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')

    // Construir filtro de fechas
    const whereVentas: any = {
      estado: { not: 'cancelada' }
    }

    if (fechaDesde || fechaHasta) {
      whereVentas.fecha_venta = {}
      if (fechaDesde) {
        whereVentas.fecha_venta.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta)
        hasta.setHours(23, 59, 59, 999)
        whereVentas.fecha_venta.lte = hasta
      }
    }

    // Obtener ventas con detalles de productos y unidades productivas
    const ventas = await prisma.ventas.findMany({
      where: whereVentas,
      select: {
        id: true,
        codigo_venta: true,
        total: true,
        fecha_venta: true,
        detalle_ventas: {
          select: {
            cantidad: true,
            subtotal: true,
            precio_unitario: true,
            lote: {
              select: {
                id: true,
                codigo_lote: true
              }
            },
            producto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                unidad_productiva_id: true,
                unidad_productiva: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                    descripcion: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Agrupar datos por unidad productiva
    const unidadesMap = new Map<number, {
      id: number
      codigo: string
      nombre: string
      descripcion: string | null
      total_ventas: number
      cantidad_productos: number
      cantidad_lotes: Set<number>
      productos_vendidos: Set<number>
      ventas_count: number
    }>()

    // Procesar cada venta
    ventas.forEach(venta => {
      venta.detalle_ventas.forEach(detalle => {
        // Ignorar productos ficticios o sin unidad productiva
        if (!detalle.producto?.unidad_productiva) {
          return
        }

        const unidad = detalle.producto.unidad_productiva
        const unidadId = unidad.id

        // Inicializar o actualizar datos de la unidad
        if (!unidadesMap.has(unidadId)) {
          unidadesMap.set(unidadId, {
            id: unidad.id,
            codigo: unidad.codigo,
            nombre: unidad.nombre,
            descripcion: unidad.descripcion,
            total_ventas: 0,
            cantidad_productos: 0,
            cantidad_lotes: new Set(),
            productos_vendidos: new Set(),
            ventas_count: 0
          })
        }

        const unidadData = unidadesMap.get(unidadId)!

        // Acumular totales
        unidadData.total_ventas += Number(detalle.subtotal)
        unidadData.cantidad_productos += Number(detalle.cantidad)
        
        // Registrar producto vendido
        if (detalle.producto.id) {
          unidadData.productos_vendidos.add(detalle.producto.id)
        }

        // Registrar lote usado
        if (detalle.lote?.id) {
          unidadData.cantidad_lotes.add(detalle.lote.id)
        }
      })
    })

    // Convertir Map a array y formatear datos
    const unidadesReporte = Array.from(unidadesMap.values())
      .map(unidad => ({
        id: unidad.id,
        codigo: unidad.codigo,
        nombre: unidad.nombre,
        descripcion: unidad.descripcion,
        total_ventas: unidad.total_ventas,
        cantidad_productos_vendidos: unidad.cantidad_productos,
        cantidad_productos_distintos: unidad.productos_vendidos.size,
        cantidad_lotes_usados: unidad.cantidad_lotes.size,
      }))
      .sort((a, b) => b.total_ventas - a.total_ventas) // Ordenar por total ventas descendente

    // Calcular totales generales
    const totales = {
      total_general: unidadesReporte.reduce((sum, u) => sum + u.total_ventas, 0),
      total_productos: unidadesReporte.reduce((sum, u) => sum + u.cantidad_productos_vendidos, 0),
      total_lotes: unidadesReporte.reduce((sum, u) => sum + u.cantidad_lotes_usados, 0),
      cantidad_unidades: unidadesReporte.length
    }

    // Identificar la unidad más vendida
    const unidadMasVendida = unidadesReporte[0] || null

    return NextResponse.json({
      success: true,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      unidad_mas_vendida: unidadMasVendida,
      totales,
      unidades: unidadesReporte
    })

  } catch (error) {
    console.error('Error en GET /api/reportes/unidades-productivas:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error al generar reporte de unidades productivas' },
      { status: 500 }
    )
  }
}
