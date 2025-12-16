/**
 * @fileoverview Funciones de base de datos para movimientos entre unidades productivas
 * @description Gestión completa de transferencias de productos con control de stock y auditoría
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Generar código único para movimiento
 */
function generarCodigoMovimiento(): string {
  const fecha = new Date()
  const año = fecha.getFullYear().toString().slice(-2)
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const dia = fecha.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `MOV-${año}${mes}${dia}-${random}`
}

interface DetalleMovimiento {
  producto_id: number
  lote_id: number
  cantidad: number
  unidad: string
}

interface CrearMovimientoData {
  unidad_origen_id: number
  unidad_destino_id: number
  usuario_id: number
  motivo?: string
  observaciones?: string
  detalles: DetalleMovimiento[]
}

/**
 * Crear un nuevo movimiento entre unidades productivas
 * Ejecuta toda la operación en una transacción
 */
export async function crearMovimiento(data: CrearMovimientoData) {
  const codigoMovimiento = generarCodigoMovimiento()

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Validar que las unidades existen y están activas
      const [unidadOrigen, unidadDestino] = await Promise.all([
        tx.unidades_productivas.findUnique({
          where: { id: data.unidad_origen_id },
          select: { id: true, nombre: true, activa: true }
        }),
        tx.unidades_productivas.findUnique({
          where: { id: data.unidad_destino_id },
          select: { id: true, nombre: true, activa: true }
        })
      ])

      if (!unidadOrigen || !unidadOrigen.activa) {
        throw new Error('La unidad de origen no existe o está inactiva')
      }

      if (!unidadDestino || !unidadDestino.activa) {
        throw new Error('La unidad de destino no existe o está inactiva')
      }

      if (unidadOrigen.id === unidadDestino.id) {
        throw new Error('La unidad de origen y destino no pueden ser la misma')
      }

      // 2. Validar disponibilidad de todos los lotes ANTES de hacer cambios
      for (const detalle of data.detalles) {
        const lote = await tx.lotes_productos.findUnique({
          where: { id: detalle.lote_id },
          select: {
            id: true,
            codigo_lote: true,
            cantidad: true,
            estado: true,
            unidad_productiva_id: true,
            producto: {
              select: {
                nombre: true,
                codigo: true
              }
            }
          }
        })

        if (!lote) {
          throw new Error(`Lote ${detalle.lote_id} no encontrado`)
        }

        if (lote.estado !== 'disponible') {
          throw new Error(
            `Lote ${lote.codigo_lote} no está disponible (estado: ${lote.estado})`
          )
        }

        if (lote.unidad_productiva_id !== data.unidad_origen_id) {
          throw new Error(
            `Lote ${lote.codigo_lote} no pertenece a la unidad de origen`
          )
        }

        if (Number(lote.cantidad) < detalle.cantidad) {
          throw new Error(
            `Stock insuficiente en lote ${lote.codigo_lote}. ` +
            `Disponible: ${lote.cantidad}, Solicitado: ${detalle.cantidad}`
          )
        }
      }

      // 3. Crear el movimiento principal
      const movimiento = await tx.movimientos_unidades.create({
        data: {
          codigo_movimiento: codigoMovimiento,
          unidad_origen_id: data.unidad_origen_id,
          unidad_destino_id: data.unidad_destino_id,
          usuario_id: data.usuario_id,
          motivo: data.motivo || 'Transferencia entre unidades',
          observaciones: data.observaciones,
          estado: 'completado',
          fecha_movimiento: new Date()
        }
      })

      // 4. Procesar cada detalle del movimiento
      const detallesCreados = []
      
      for (const detalle of data.detalles) {
        const lote = await tx.lotes_productos.findUnique({
          where: { id: detalle.lote_id },
          select: {
            id: true,
            codigo_lote: true,
            cantidad: true,
            fecha_produccion: true,
            fecha_vencimiento: true,
            producto_id: true,
            producto: {
              select: {
                codigo: true,
                nombre: true,
                tipo_medida: true
              }
            }
          }
        })

        // 5. Crear detalle del movimiento
        const detalleCreado = await tx.detalle_movimientos.create({
          data: {
            movimiento_id: movimiento.id,
            producto_id: detalle.producto_id,
            lote_id: detalle.lote_id,
            cantidad: detalle.cantidad,
            unidad: detalle.unidad
          }
        })

        detallesCreados.push(detalleCreado)

        // 6. Restar cantidad del lote origen
        const loteOrigenActualizado = await tx.lotes_productos.update({
          where: { id: detalle.lote_id },
          data: {
            cantidad: {
              decrement: detalle.cantidad
            },
            usuario_id: data.usuario_id
          }
        })

        // 7. Crear o actualizar lote en unidad destino
        // Buscar si ya existe un lote con el mismo código en la unidad destino
        const loteExistenteDestino = await tx.lotes_productos.findFirst({
          where: {
            codigo_lote: lote!.codigo_lote,
            unidad_productiva_id: data.unidad_destino_id,
            estado: 'disponible'
          }
        })

        if (loteExistenteDestino) {
          // Si existe, incrementar cantidad
          await tx.lotes_productos.update({
            where: { id: loteExistenteDestino.id },
            data: {
              cantidad: {
                increment: detalle.cantidad
              },
              usuario_id: data.usuario_id
            }
          })
        } else {
          // Si no existe, crear nuevo lote en destino
          await tx.lotes_productos.create({
            data: {
              codigo_lote: `${lote!.codigo_lote}-${data.unidad_destino_id}`,
              producto_id: detalle.producto_id,
              cantidad: detalle.cantidad,
              fecha_produccion: lote!.fecha_produccion,
              fecha_vencimiento: lote!.fecha_vencimiento,
              unidad_productiva_id: data.unidad_destino_id,
              estado: 'disponible',
              usuario_id: data.usuario_id
            }
          })
        }

        // 8. Registrar en historial de inventario - SALIDA
        await tx.historial_inventario.create({
          data: {
            producto_id: detalle.producto_id,
            tipo_movimiento: 'salida',
            cantidad_movimiento: detalle.cantidad,
            usuario_id: data.usuario_id,
            referencia_id: movimiento.id,
            referencia_tipo: 'movimiento_unidad',
            observaciones: `Transferencia de ${unidadOrigen.nombre} a ${unidadDestino.nombre} - ${codigoMovimiento}`
          }
        })

        // 9. Registrar en historial de inventario - ENTRADA
        await tx.historial_inventario.create({
          data: {
            producto_id: detalle.producto_id,
            tipo_movimiento: 'entrada',
            cantidad_movimiento: detalle.cantidad,
            usuario_id: data.usuario_id,
            referencia_id: movimiento.id,
            referencia_tipo: 'movimiento_unidad',
            observaciones: `Recepción de ${unidadOrigen.nombre} a ${unidadDestino.nombre} - ${codigoMovimiento}`
          }
        })

        // 10. Registrar en auditoría
        await tx.auditoria.create({
          data: {
            tabla: 'movimientos_unidades',
            registro_id: movimiento.id,
            accion: 'INSERT',
            usuario_id: data.usuario_id,
            datos_nuevos: {
              movimiento_id: movimiento.id,
              codigo: codigoMovimiento,
              producto: lote?.producto?.nombre || 'Desconocido',
              lote: lote?.codigo_lote || '',
              cantidad: detalle.cantidad,
              origen: unidadOrigen.nombre,
              destino: unidadDestino.nombre
            } as any
          }
        })
      }

      // 11. Obtener movimiento completo con detalles
      const movimientoCompleto = await tx.movimientos_unidades.findUnique({
        where: { id: movimiento.id },
        include: {
          unidad_origen: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          unidad_destino: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          detalle_movimientos: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  unidad: true
                }
              },
              lote: {
                select: {
                  id: true,
                  codigo_lote: true,
                  fecha_vencimiento: true
                }
              }
            }
          }
        }
      })

      return movimientoCompleto
    })

    console.log('✅ Movimiento creado exitosamente:', codigoMovimiento)
    return resultado
  } catch (error) {
    console.error('❌ Error al crear movimiento:', error)
    throw error
  }
}

/**
 * Obtener lista de movimientos con filtros
 */
export async function getMovimientos(params?: {
  page?: number
  limit?: number
  unidad_origen_id?: number
  unidad_destino_id?: number
  estado?: string
  fecha_desde?: Date
  fecha_hasta?: Date
}) {
  const page = params?.page || 1
  const limit = params?.limit || 50
  const skip = (page - 1) * limit

  try {
    const where: Prisma.movimientos_unidadesWhereInput = {}

    if (params?.unidad_origen_id) {
      where.unidad_origen_id = params.unidad_origen_id
    }

    if (params?.unidad_destino_id) {
      where.unidad_destino_id = params.unidad_destino_id
    }

    if (params?.estado) {
      where.estado = params.estado
    }

    if (params?.fecha_desde || params?.fecha_hasta) {
      where.fecha_movimiento = {}
      if (params.fecha_desde) {
        where.fecha_movimiento.gte = params.fecha_desde
      }
      if (params.fecha_hasta) {
        where.fecha_movimiento.lte = params.fecha_hasta
      }
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimientos_unidades.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          fecha_movimiento: 'desc'
        },
        include: {
          unidad_origen: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          unidad_destino: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          detalle_movimientos: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  unidad: true
                }
              },
              lote: {
                select: {
                  id: true,
                  codigo_lote: true
                }
              }
            }
          }
        }
      }),
      prisma.movimientos_unidades.count({ where })
    ])

    return {
      movimientos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {
    console.error('❌ Error al obtener movimientos:', error)
    throw new Error('Error al obtener movimientos')
  }
}

/**
 * Obtener un movimiento por ID
 */
export async function getMovimientoById(id: number) {
  try {
    const movimiento = await prisma.movimientos_unidades.findUnique({
      where: { id },
      include: {
        unidad_origen: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            ubicacion: true
          }
        },
        unidad_destino: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            ubicacion: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        },
        detalle_movimientos: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                descripcion: true,
                unidad: true,
                imagen_url: true
              }
            },
            lote: {
              select: {
                id: true,
                codigo_lote: true,
                fecha_produccion: true,
                fecha_vencimiento: true,
                cantidad: true
              }
            }
          }
        }
      }
    })

    return movimiento
  } catch (error) {
    console.error('❌ Error al obtener movimiento:', error)
    throw new Error('Error al obtener movimiento')
  }
}

/**
 * Obtener estadísticas generales de movimientos
 */
export async function getEstadisticasMovimientos(params?: {
  fecha_desde?: Date
  fecha_hasta?: Date
  unidad_id?: number
}) {
  try {
    const where: Prisma.movimientos_unidadesWhereInput = {}

    if (params?.fecha_desde || params?.fecha_hasta) {
      where.fecha_movimiento = {}
      if (params.fecha_desde) {
        where.fecha_movimiento.gte = params.fecha_desde
      }
      if (params.fecha_hasta) {
        where.fecha_movimiento.lte = params.fecha_hasta
      }
    }

    if (params?.unidad_id) {
      where.OR = [
        { unidad_origen_id: params.unidad_id },
        { unidad_destino_id: params.unidad_id }
      ]
    }

    const [totalMovimientos, movimientosHoy, productosTransferidos] = await Promise.all([
      prisma.movimientos_unidades.count({ where }),
      
      prisma.movimientos_unidades.count({
        where: {
          ...where,
          fecha_movimiento: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      prisma.detalle_movimientos.aggregate({
        _sum: {
          cantidad: true
        },
        where: {
          movimiento: where.fecha_movimiento ? {
            fecha_movimiento: where.fecha_movimiento
          } : undefined
        }
      })
    ])

    return {
      total_movimientos: totalMovimientos,
      movimientos_hoy: movimientosHoy,
      productos_transferidos: productosTransferidos._sum.cantidad || 0
    }
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error)
    throw new Error('Error al obtener estadísticas')
  }
}
