/**
 * @fileoverview Funciones de base de datos para unidades productivas
 * @description Gestión de unidades productivas y sus productos/lotes disponibles
 */

import { prisma } from '@/lib/prisma'

/**
 * Obtener todas las unidades productivas (activas e inactivas)
 */
export async function getUnidadesProductivas() {
  try {
    const unidades = await prisma.unidades_productivas.findMany({
      orderBy: {
        nombre: 'asc'
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        tipo: true,
        ubicacion: true,
        responsable: true,
        activa: true
      }
    })

    return unidades
  } catch (error) {
    console.error('❌ Error al obtener unidades productivas:', error)
    throw new Error('Error al obtener unidades productivas')
  }
}

/**
 * Obtener productos disponibles en una unidad productiva con sus lotes
 */
export async function getProductosDisponiblesEnUnidad(unidadId: number) {
  try {
    const lotes = await prisma.lotes_productos.findMany({
      where: {
        unidad_productiva_id: unidadId,
        estado: 'disponible',
        cantidad: {
          gt: 0
        }
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo_medida: true,
            unidad: true,
            stock_actual: true,
            es_perecedero: true,
            imagen_url: true
          }
        }
      },
      orderBy: [
        { fecha_vencimiento: 'asc' }, // FIFO - primero los que vencen antes
        { fecha_produccion: 'asc' }
      ]
    })

    // Agrupar por producto
    const productosMap = new Map<number, any>()

    lotes.forEach(lote => {
      const productoId = lote.producto_id
      
      if (!productosMap.has(productoId!)) {
        productosMap.set(productoId!, {
          ...lote.producto,
          lotes: []
        })
      }

      productosMap.get(productoId!)?.lotes.push({
        id: lote.id,
        codigo_lote: lote.codigo_lote,
        cantidad: lote.cantidad,
        fecha_produccion: lote.fecha_produccion,
        fecha_vencimiento: lote.fecha_vencimiento,
        estado: lote.estado
      })
    })

    return Array.from(productosMap.values())
  } catch (error) {
    console.error('❌ Error al obtener productos de unidad:', error)
    throw new Error('Error al obtener productos de la unidad')
  }
}

/**
 * Obtener detalles de una unidad productiva específica
 */
export async function getUnidadProductivaById(id: number) {
  try {
    const unidad = await prisma.unidades_productivas.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        tipo: true,
        ubicacion: true,
        responsable: true,
        activa: true,
        created_at: true
      }
    })

    return unidad
  } catch (error) {
    console.error('❌ Error al obtener unidad productiva:', error)
    throw new Error('Error al obtener unidad productiva')
  }
}

/**
 * Verificar disponibilidad de un lote específico
 */
export async function verificarDisponibilidadLote(loteId: number, cantidadRequerida: number) {
  try {
    const lote = await prisma.lotes_productos.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        cantidad: true,
        estado: true,
        codigo_lote: true,
        producto: {
          select: {
            nombre: true
          }
        }
      }
    })

    if (!lote) {
      return {
        disponible: false,
        mensaje: 'Lote no encontrado'
      }
    }

    if (lote.estado !== 'disponible') {
      return {
        disponible: false,
        mensaje: `Lote ${lote.codigo_lote} no está disponible (estado: ${lote.estado})`
      }
    }

    if (Number(lote.cantidad) < cantidadRequerida) {
      return {
        disponible: false,
        mensaje: `Stock insuficiente en lote ${lote.codigo_lote}. Disponible: ${lote.cantidad}, Solicitado: ${cantidadRequerida}`
      }
    }

    return {
      disponible: true,
      lote
    }
  } catch (error) {
    console.error('❌ Error al verificar disponibilidad de lote:', error)
    throw new Error('Error al verificar disponibilidad de lote')
  }
}

/**
 * Obtener estadísticas de una unidad productiva
 */
export async function getEstadisticasUnidad(unidadId: number) {
  try {
    const [totalLotes, totalProductos, movimientosOrigen, movimientosDestino] = await Promise.all([
      // Total de lotes disponibles
      prisma.lotes_productos.count({
        where: {
          unidad_productiva_id: unidadId,
          estado: 'disponible',
          cantidad: { gt: 0 }
        }
      }),
      
      // Total de productos diferentes
      prisma.lotes_productos.findMany({
        where: {
          unidad_productiva_id: unidadId,
          estado: 'disponible',
          cantidad: { gt: 0 }
        },
        select: { producto_id: true },
        distinct: ['producto_id']
      }),
      
      // Movimientos como origen (últimos 30 días)
      prisma.movimientos_unidades.count({
        where: {
          unidad_origen_id: unidadId,
          fecha_movimiento: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Movimientos como destino (últimos 30 días)
      prisma.movimientos_unidades.count({
        where: {
          unidad_destino_id: unidadId,
          fecha_movimiento: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    return {
      total_lotes: totalLotes,
      total_productos: totalProductos.length,
      movimientos_salida_30d: movimientosOrigen,
      movimientos_entrada_30d: movimientosDestino,
      total_movimientos_30d: movimientosOrigen + movimientosDestino
    }
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de unidad:', error)
    throw new Error('Error al obtener estadísticas')
  }
}
