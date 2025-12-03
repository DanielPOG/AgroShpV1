import { prisma } from '@/lib/prisma'
import type { CreateLoteData, UpdateLoteData, LoteFilters } from '@/lib/validations/lote.schema'
import { getColombiaDate } from '@/lib/date-utils'

/**
 * Obtener lista de lotes con filtros y paginación
 */
export async function getLotes(filters: LoteFilters = {}) {
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
            ubicacion: true,
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
    // Verificar que el producto existe
    const producto = await prisma.productos.findUnique({
      where: { id: data.producto_id },
      select: { 
        es_perecedero: true,
        dias_vencimiento: true 
      },
    })

    if (!producto) {
      throw new Error('Producto no encontrado')
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
    // Verificar que el lote existe
    const existing = await prisma.lotes_productos.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Lote no encontrado')
    }

    // Actualizar lote
    const lote = await prisma.lotes_productos.update({
      where: { id },
      data: {
        ...(data.estado && { estado: data.estado }),
        ...(data.cantidad && { cantidad: data.cantidad }),
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

    // Actualizar el usuario_id en el registro de auditoría que acaba de crear el trigger
    if (data.usuario_id) {
      // El trigger crea el registro sin usuario_id, así que lo actualizamos
      await prisma.$executeRaw`
        UPDATE auditoria 
        SET usuario_id = ${data.usuario_id}
        WHERE id = (
          SELECT id 
          FROM auditoria 
          WHERE tabla = 'lotes_productos' 
            AND registro_id = ${id}
            AND usuario_id IS NULL
            AND fecha >= NOW() - INTERVAL '5 seconds'
          ORDER BY id DESC
          LIMIT 1
        )
      `

      // También actualizar historial_inventario si hay cambios de cantidad
      if (data.cantidad && data.cantidad !== Number(existing.cantidad)) {
        await prisma.historial_inventario.updateMany({
          where: {
            producto_id: lote.producto_id,
            referencia_id: id,
            referencia_tipo: 'lote',
            usuario_id: null,
            fecha_movimiento: {
              gte: new Date(Date.now() - 5000), // últimos 5 segundos
            },
          },
          data: {
            usuario_id: data.usuario_id,
          },
        })
      }
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
 * Eliminar un lote
 */
export async function deleteLote(id: number) {
  try {
    // Verificar que el lote existe
    const existing = await prisma.lotes_productos.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Lote no encontrado')
    }

    // Eliminar lote
    await prisma.lotes_productos.delete({
      where: { id },
    })

    return { success: true, message: 'Lote eliminado exitosamente' }
  } catch (error) {
    console.error('Error deleting lote:', error)
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
export async function getLotesProximosVencer(dias: number = 7) {
  try {
    const fechaLimite = getColombiaDate()
    fechaLimite.setDate(fechaLimite.getDate() + dias)

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
