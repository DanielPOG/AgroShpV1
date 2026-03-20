import { prisma } from '@/lib/prisma'
import type { CreateLoteData, UpdateLoteData, LoteFilters } from '@/lib/validations/lote.schema'
import { getColombiaDate } from '@/lib/date-utils'
import { getConfigValue } from '@/lib/constants'

/**
 * Obtener lista de lotes con filtros y paginación
 */
export async function getLotes(filters: Partial<LoteFilters> = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      producto_id,
      unidad_productiva_id,
      estado,
      dias_vencimiento,
      search,
    } = filters

    const skip = (page - 1) * limit

    // Construir condiciones WHERE
    const where: any = {}

    if (producto_id) {
      where.producto_id = producto_id
    }

    if (unidad_productiva_id) {
      where.unidad_productiva_id = unidad_productiva_id
    }

    if (estado) {
      where.estado = estado
    } else {
      // Por defecto, excluir lotes con estado null
      where.estado = { not: null }
    }

    if (search) {
      where.codigo_lote = {
        contains: search,
        mode: 'insensitive',
      }
    }

    // Filtro de próximos a vencer
    if (dias_vencimiento) {
      const fechaLimite = getColombiaDate()
      fechaLimite.setDate(fechaLimite.getDate() + dias_vencimiento)

      where.fecha_vencimiento = {
        lte: fechaLimite,
        gte: getColombiaDate(), // No incluir ya vencidos
      }
      where.estado = 'disponible' // Solo lotes disponibles
    }

    // Contar total
    const total = await prisma.lotes_productos.count({ where })

    // Obtener lotes
    const lotes = await prisma.lotes_productos.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { fecha_vencimiento: 'asc' }, // Primero los que vencen antes
        { created_at: 'desc' },
      ],
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
            es_perecedero: true,
            imagen_url: true,
            categoria: {
              select: {
                id: true,
                nombre: true,
                icono: true,
                color: true,
              },
            },
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
          },
        },
      },
    })

    return {
      data: lotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Error fetching lotes:', error)
    throw new Error('Error al obtener lotes')
  }
}

/**
 * Obtener un lote por ID con información completa
 */
export async function getLoteById(id: number) {
  try {
    const lote = await prisma.lotes_productos.findUnique({
      where: { id },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            descripcion: true,
            unidad: true,
            precio_unitario: true,
            precio_mayorista: true,
            stock_actual: true,
            stock_minimo: true,
            stock_maximo: true,
            es_perecedero: true,
            dias_vencimiento: true,
            tipo_medida: true,
            activo: true,
            imagen_url: true,
            categoria: {
              select: {
                id: true,
                nombre: true,
                icono: true,
                color: true,
              },
            },
            unidad_productiva: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                tipo: true,
              },
            },
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
            ubicacion: true,
          },
        },
        costos_produccion: {
          select: {
            id: true,
            costo_materia_prima: true,
            costo_mano_obra: true,
            costo_insumos: true,
            costo_energia: true,
            otros_costos: true,
            costo_total: true,
            cantidad_producida: true,
            costo_unitario: true,
            fecha_registro: true,
            observaciones: true,
          },
        },
      },
    })

    if (!lote) {
      throw new Error('Lote no encontrado')
    }

    return lote
  } catch (error) {
    console.error('Error fetching lote by id:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al obtener lote')
  }
}

/**
 * Crear un nuevo lote
 */
export async function createLote(data: CreateLoteData) {
  try {
    // Verificar que el producto existe y está activo
    const producto = await prisma.productos.findUnique({
      where: { id: data.producto_id },
      select: { 
        es_perecedero: true,
        dias_vencimiento: true,
        activo: true,
        nombre: true
      },
    })

    if (!producto) {
      throw new Error('Producto no encontrado')
    }

    if (!producto.activo) {
      throw new Error(`No se pueden crear lotes para el producto "${producto.nombre}" porque está desactivado`)
    }

    // Calcular fecha de vencimiento automáticamente si es perecedero
    let fechaVencimiento: Date | null = null
    
    if (producto.es_perecedero) {
      if (producto.dias_vencimiento) {
        // Calcular automáticamente: fecha_produccion + dias_vencimiento
        fechaVencimiento = new Date(data.fecha_produccion)
        fechaVencimiento.setDate(fechaVencimiento.getDate() + producto.dias_vencimiento)
      } else if (data.fecha_vencimiento) {
        // Si no hay dias_vencimiento pero se proporcionó fecha manual
        fechaVencimiento = data.fecha_vencimiento
      } else {
        throw new Error('Los productos perecederos requieren dias_vencimiento en el producto o fecha_vencimiento manual')
      }
    } else {
      // Productos no perecederos: usar fecha manual si se proporcionó
      fechaVencimiento = data.fecha_vencimiento || null
    }

    // Verificar que el código de lote no exista
    const existing = await prisma.lotes_productos.findUnique({
      where: { codigo_lote: data.codigo_lote },
    })

    if (existing) {
      throw new Error(`El código de lote "${data.codigo_lote}" ya existe`)
    }

    // Verificar que la unidad productiva existe
    const unidad = await prisma.unidades_productivas.findUnique({
      where: { id: data.unidad_productiva_id },
    })

    if (!unidad) {
      throw new Error('Unidad productiva no encontrada')
    }

    // Crear lote con fecha de vencimiento calculada
    const lote = await prisma.lotes_productos.create({
      data: {
        producto_id: data.producto_id,
        codigo_lote: data.codigo_lote,
        cantidad: data.cantidad,
        fecha_produccion: data.fecha_produccion,
        fecha_vencimiento: fechaVencimiento,
        unidad_productiva_id: data.unidad_productiva_id,
        estado: data.estado || 'disponible',
        usuario_id: data.usuario_id,
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    // 🔔 Verificar alertas de stock después de crear el lote
    try {
      const { checkStockBajo, limpiarAlertasResueltas } = await import('./alertas')
      await checkStockBajo()
      await limpiarAlertasResueltas() // Limpiar alertas resueltas si el stock mejoró
    } catch (alertError) {
      console.error('Error al verificar alertas de stock:', alertError)
      // No fallar la creación del lote por un error en las alertas
    }

    return lote
  } catch (error) {
    console.error('Error creating lote:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al crear lote')
  }
}

/**
 * Actualizar un lote (solo estado y cantidad)
 */
export async function updateLote(id: number, data: UpdateLoteData) {
  try {
    // Verificar que el lote existe y obtener información del producto
    const existing = await prisma.lotes_productos.findUnique({
      where: { id },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            activo: true,
          }
        }
      }
    })

    if (!existing) {
      throw new Error('Lote no encontrado')
    }

    // 🔒 VALIDACIÓN 1: Detectar y aplicar vencimiento automático
    const hoy = getColombiaDate()
    hoy.setHours(0, 0, 0, 0)
    
    const isVencido = existing.fecha_vencimiento && new Date(existing.fecha_vencimiento) < hoy
    
    // Si el lote está vencido por fecha pero aún no tiene el estado, actualizarlo automáticamente
    // PERO solo si no están intentando cambiar el estado manualmente
    if (isVencido && existing.estado !== 'vencido' && !data.estado) {
      data.estado = 'vencido'
      console.log(`🗓️ Lote ${existing.codigo_lote} detectado como vencido, cambiando estado automáticamente`)
    }

    // 🔒 VALIDACIÓN 2: Control de reactivación de lotes
    if (data.estado === 'disponible') {
      // Bloquear lotes vencidos (nunca se pueden reactivar)
      if (existing.estado === 'vencido') {
        throw new Error('No se puede reactivar un lote vencido. Los lotes vencidos no pueden volver a usarse.')
      }
      
      // Permitir reactivar lotes retirados SOLO si no están vencidos por fecha
      if (existing.estado === 'retirado') {
        if (isVencido) {
          throw new Error('No se puede reactivar este lote porque su fecha de vencimiento ya pasó.')
        }
        // Si llega aquí, es retirado pero no vencido → permitir reactivación
        console.log(`✅ Reactivando lote ${existing.codigo_lote} de estado retirado a disponible`)
      }
      
      // Si está vencido por fecha (aunque estado sea disponible), no permitir
      if (isVencido) {
        throw new Error('No se puede mantener disponible un lote cuya fecha de vencimiento ya pasó.')
      }
    }

    // 🔒 VALIDACIÓN 3: Si producto está desactivado, aplicar restricciones
    if (existing.producto && !existing.producto.activo) {
      // Permitir solo cambios a estados no-disponibles o ajustes de cantidad
      if (data.estado === 'disponible' && existing.estado !== 'disponible') {
        throw new Error(`El producto "${existing.producto.nombre}" está desactivado. No se pueden activar lotes.`)
      }
      
      // Bloquear incrementos de stock (solo permitir reducción o mantener)
      if (data.cantidad && data.cantidad > Number(existing.cantidad)) {
        throw new Error(`El producto "${existing.producto.nombre}" está desactivado. No se puede incrementar el stock de sus lotes.`)
      }
      
      console.log(`⚠️ Editando lote de producto desactivado "${existing.producto.nombre}" - Cambios restringidos`)
    }

    // 🔍 Log especial si el lote queda en 0
    if (data.cantidad !== undefined && data.cantidad === 0) {
      console.log(`📦 Lote ${existing.codigo_lote} será agotado (cantidad → 0)`)
      
      // 🔒 VALIDACIÓN AUTOMÁTICA: Si cantidad es 0, cambiar estado a 'retirado'
      if (!data.estado && existing.estado === 'disponible') {
        data.estado = 'retirado'
        console.log(`🔄 Estado del lote cambiado automáticamente a 'retirado' por cantidad 0`)
      }
    }

    // Actualizar lote
    const lote = await prisma.lotes_productos.update({
      where: { id },
      data: {
        ...(data.estado && { estado: data.estado }),
        ...(data.cantidad !== undefined && { cantidad: data.cantidad }),
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    // Los triggers de auditoría e historial ya manejan el registro automáticamente
    // con el usuario_id que viene en el lote

    // 🔔 Verificar alertas de stock después de actualizar el lote
    try {
      const { checkStockBajo, limpiarAlertasResueltas } = await import('./alertas')
      await checkStockBajo()
      await limpiarAlertasResueltas() // Limpiar alertas resueltas si el stock mejoró
    } catch (alertError) {
      console.error('Error al verificar alertas de stock:', alertError)
    }

    return lote
  } catch (error) {
    console.error('Error updating lote:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al actualizar lote')
  }
}

/**
 * Reactivar un lote retirado (cambiar estado de 'retirado' a 'disponible')
 */
export async function reactivarLote(id: number, usuario_id: number, motivo?: string) {
  try {
    // Verificar que el lote existe
    const lote = await prisma.lotes_productos.findUnique({
      where: { id },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            activo: true,
          }
        }
      }
    })

    if (!lote) {
      throw new Error('Lote no encontrado')
    }

    // Validar que el lote está retirado
    if (lote.estado !== 'retirado') {
      throw new Error(`El lote no está en estado retirado (estado actual: ${lote.estado})`)
    }

    // Validar que no está vencido por fecha
    const hoy = getColombiaDate()
    hoy.setHours(0, 0, 0, 0)
    const isVencido = lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < hoy

    if (isVencido) {
      throw new Error('No se puede reactivar este lote porque su fecha de vencimiento ya pasó')
    }

    // Validar que el producto está activo
    if (lote.producto && !lote.producto.activo) {
      throw new Error(`No se puede reactivar el lote porque el producto "${lote.producto.nombre}" está desactivado`)
    }

    // Actualizar estado a disponible
    const loteActualizado = await prisma.lotes_productos.update({
      where: { id },
      data: {
        estado: 'disponible',
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    // Los triggers de auditoría e historial ya manejan el registro automáticamente
    // Actualizar solo la observación en historial si hay motivo
    if (motivo) {
      await prisma.historial_inventario.updateMany({
        where: {
          producto_id: loteActualizado.producto_id,
          referencia_id: id,
          referencia_tipo: 'lote',
          fecha_movimiento: {
            gte: new Date(Date.now() - 2000),
          },
        },
        data: {
          observaciones: motivo,
        },
      })
    }

    console.log(`✅ Lote ${lote.codigo_lote} reactivado de retirado a disponible`)

    // 🔔 Verificar alertas de stock después de reactivar el lote
    try {
      const { checkStockBajo, limpiarAlertasResueltas } = await import('./alertas')
      await checkStockBajo()
      await limpiarAlertasResueltas() // Limpiar alertas resueltas si el stock mejoró
    } catch (alertError) {
      console.error('Error al verificar alertas de stock:', alertError)
    }

    return {
      success: true,
      message: `Lote ${lote.codigo_lote} reactivado exitosamente`,
      lote: loteActualizado,
    }
  } catch (error) {
    console.error('Error reactivating lote:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al reactivar lote')
  }
}

/**
 * Retirar un lote (cambiar estado a 'retirado')
 * Usado cuando el lote está dañado, vencido, o se retira del inventario
 */
export async function retirarLote(id: number, usuario_id: number, motivo?: string) {
  try {
    // Verificar que el lote existe
    const existing = await prisma.lotes_productos.findUnique({
      where: { id },
      include: {
        producto: {
          select: {
            nombre: true,
            stock_actual: true,
          },
        },
      },
    })

    if (!existing) {
      throw new Error('Lote no encontrado')
    }

    if (existing.estado === 'retirado') {
      throw new Error('El lote ya está retirado')
    }

    // 📊 Log del estado ANTES de retirar
    console.log('\n📦 RETIRO DE LOTE:')
    console.log(`  Lote: ${existing.codigo_lote}`)
    console.log(`  Producto: ${existing.producto?.nombre}`)
    console.log(`  Cantidad en lote: ${existing.cantidad}`)
    console.log(`  Stock actual del producto: ${existing.producto?.stock_actual}`)
    console.log(`  Motivo: ${motivo || 'Sin especificar'}`)
    console.log('\n⚠️ IMPORTANTE: NO se descuenta stock manualmente aquí')
    console.log('✅ El trigger SQL sync_stock_on_lote_update() lo hará automáticamente')
    console.log('   cuando detecte el cambio de estado (disponible → retirado)\n')

    // Actualizar estado a 'retirado'
    // ⚠️ CRÍTICO: NO descontar stock manualmente
    // El trigger SQL se encarga de todo automáticamente
    const lote = await prisma.lotes_productos.update({
      where: { id },
      data: {
        estado: 'retirado',
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    // Los triggers de auditoría e historial ya manejan el registro automáticamente
    // Actualizar solo la observación en historial si hay motivo
    if (motivo) {
      await prisma.historial_inventario.updateMany({
        where: {
          producto_id: lote.producto_id,
          referencia_id: id,
          referencia_tipo: 'lote',
          fecha_movimiento: {
            gte: new Date(Date.now() - 2000),
          },
        },
        data: {
          observaciones: motivo,
        },
      })
    }

    // 🔔 Verificar alertas de stock después de retirar el lote
    try {
      const { checkStockBajo, limpiarAlertasResueltas } = await import('./alertas')
      await checkStockBajo()
      await limpiarAlertasResueltas() // Limpiar alertas resueltas si el problema se resolvió
    } catch (alertError) {
      console.error('Error al verificar alertas de stock:', alertError)
    }

    return { 
      success: true, 
      message: `Lote ${existing.codigo_lote} retirado exitosamente`,
      lote 
    }
  } catch (error) {
    console.error('Error retirando lote:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al retirar lote')
  }
}

/**
 * Eliminar un lote físicamente (solo si no tiene ventas asociadas)
 */
export async function deleteLote(id: number, usuario_id: number) {
  try {
    // Verificar que el lote existe
    const existing = await prisma.lotes_productos.findUnique({
      where: { id },
      include: {
        producto: {
          select: {
            nombre: true,
          },
        },
      },
    })

    if (!existing) {
      throw new Error('Lote no encontrado')
    }

    // Verificar si el lote tiene ventas asociadas
    const ventasCount = await prisma.detalle_ventas.count({
      where: { lote_id: id },
    })

    if (ventasCount > 0) {
      throw new Error(
        'No se puede eliminar el lote porque tiene ventas asociadas. Use "Retirar" en su lugar.'
      )
    }

    // Verificar si el lote tiene movimientos asociados
    const movimientosCount = await prisma.detalle_movimientos.count({
      where: { lote_id: id },
    })

    if (movimientosCount > 0) {
      throw new Error(
        'No se puede eliminar el lote porque tiene movimientos asociados. Use "Retirar" en su lugar.'
      )
    }

    // Verificar si el lote tiene costos de producción
    const costosCount = await prisma.costos_produccion.count({
      where: { lote_id: id },
    })

    if (costosCount > 0) {
      throw new Error(
        'No se puede eliminar el lote porque tiene costos de producción asociados. Use "Retirar" en su lugar.'
      )
    }

    // Actualizar usuario_id del lote antes de eliminar para que los triggers lo capturen
    await prisma.lotes_productos.update({
      where: { id },
      data: { usuario_id: usuario_id },
    })

    // Eliminar lote (los triggers de DELETE manejarán auditoría e historial automáticamente)
    await prisma.lotes_productos.delete({
      where: { id },
    })

    // Actualizar observación en historial si es necesario
    await prisma.historial_inventario.updateMany({
      where: {
        producto_id: existing.producto_id,
        referencia_id: id,
        referencia_tipo: 'lote',
        fecha_movimiento: {
          gte: new Date(Date.now() - 2000),
        },
      },
      data: {
        observaciones: 'Lote eliminado - creado por error',
      },
    })

    // 🔔 Verificar alertas de stock después de eliminar el lote
    try {
      const { checkStockBajo, limpiarAlertasResueltas } = await import('./alertas')
      await checkStockBajo()
      await limpiarAlertasResueltas() // Limpiar alertas resueltas si el problema se resolvió
    } catch (alertError) {
      console.error('Error al verificar alertas de stock:', alertError)
    }

    return { 
      success: true, 
      message: `Lote ${existing.codigo_lote} eliminado permanentemente` 
    }
  } catch (error) {
    console.error('Error eliminando lote:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al eliminar lote')
  }
}

/**
 * Obtener lotes de un producto específico
 */
export async function getLotesByProducto(producto_id: number) {
  try {
    const lotes = await prisma.lotes_productos.findMany({
      where: { producto_id },
      orderBy: [
        { fecha_vencimiento: 'asc' },
        { created_at: 'desc' },
      ],
      include: {
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    return lotes
  } catch (error) {
    console.error('Error fetching lotes by producto:', error)
    throw new Error('Error al obtener lotes del producto')
  }
}

/**
 * Obtener lotes próximos a vencer
 */
export async function getLotesProximosVencer(dias?: number) {
  try {
    // Usar configuración global si no se especifica
    const diasAlerta = dias ?? await getConfigValue('dias_alerta_vencimiento', 7) as number
    
    const fechaLimite = getColombiaDate()
    fechaLimite.setDate(fechaLimite.getDate() + diasAlerta)

    const lotes = await prisma.lotes_productos.findMany({
      where: {
        fecha_vencimiento: {
          lte: fechaLimite,
          gte: getColombiaDate(), // No incluir ya vencidos
        },
        estado: 'disponible',
      },
      orderBy: {
        fecha_vencimiento: 'asc',
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
            imagen_url: true,
            categoria: {
              select: {
                nombre: true,
                color: true,
              },
            },
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    return lotes
  } catch (error) {
    console.error('Error fetching lotes próximos a vencer:', error)
    throw new Error('Error al obtener lotes próximos a vencer')
  }
}

/**
 * Obtener lotes vencidos
 */
export async function getLotesVencidos() {
  try {
    const lotes = await prisma.lotes_productos.findMany({
      where: {
        fecha_vencimiento: {
          lt: getColombiaDate(),
        },
        estado: 'disponible', // Lotes que deberían estar marcados como vencidos
      },
      orderBy: {
        fecha_vencimiento: 'desc',
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
            imagen_url: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    return lotes
  } catch (error) {
    console.error('Error fetching lotes vencidos:', error)
    throw new Error('Error al obtener lotes vencidos')
  }
}
