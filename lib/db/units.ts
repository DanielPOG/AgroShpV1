import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { createPaginationMeta } from '@/lib/validations/common.schema'
import type { UnitFilters, CreateUnitData, UpdateUnitData } from '@/lib/validations/unit.schema'

/**
 * Funciones de base de datos para Unidades Productivas
 * 
 * CRUD optimizado con Prisma ORM
 * Incluye: paginación, búsqueda, filtros, soft delete, relaciones
 */

// =====================================================
// LISTAR UNIDADES PRODUCTIVAS
// =====================================================

/**
 * Obtiene todas las unidades productivas con paginación y filtros
 */
export async function getUnits(filters?: UnitFilters) {
  const where: Prisma.unidades_productivasWhereInput = {}

  // Búsqueda por nombre o código
  if (filters?.search) {
    where.OR = [
      {
        nombre: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        codigo: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ]
  }

  // Filtro por tipo
  if (filters?.tipo) {
    where.tipo = {
      contains: filters.tipo,
      mode: 'insensitive',
    }
  }

  // Filtro por estado activo
  if (filters?.activa !== undefined) {
    where.activa = filters.activa
  }

  // Filtro por responsable
  if (filters?.responsable_id) {
    where.responsable_id = filters.responsable_id
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  try {
    const [units, total] = await Promise.all([
      prisma.unidades_productivas.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          descripcion: true,
          tipo: true,
          responsable_id: true,
          ubicacion: true,
          activa: true,
          created_at: true,
          updated_at: true,
          responsable: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
          _count: {
            select: {
              productos: {
                where: { activo: true },
              },
              lotes_productos: true,
            },
          },
        },
      }),
      prisma.unidades_productivas.count({ where }),
    ])

    return {
      data: units,
      pagination: createPaginationMeta(page, limit, total),
    }
  } catch (error) {
    console.error('Error fetching units:', error)
    throw new Error('Error al obtener unidades productivas')
  }
}

// =====================================================
// OBTENER UNA UNIDAD PRODUCTIVA
// =====================================================

/**
 * Obtiene una unidad productiva por ID con información completa
 */
export async function getUnitById(id: number) {
  try {
    const unit = await prisma.unidades_productivas.findUnique({
      where: { id },
      include: {
        responsable: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            rol_id: true,
          },
        },
        productos: {
          where: { activo: true },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            precio_unitario: true,
            stock_actual: true,
            stock_minimo: true,
            unidad: true,
            imagen_url: true,
          },
          take: 20,
          orderBy: { nombre: 'asc' },
        },
        _count: {
          select: {
            productos: {
              where: { activo: true },
            },
            lotes_productos: true,
            movimientos_unidades_movimientos_unidades_unidad_origen_idTounidades_productivas: true,
            movimientos_unidades_movimientos_unidades_unidad_destino_idTounidades_productivas: true,
          },
        },
      },
    })

    if (!unit) {
      throw new Error('Unidad productiva no encontrada')
    }

    return unit
  } catch (error) {
    console.error('Error fetching unit:', error)
    throw new Error('Error al obtener unidad productiva')
  }
}

// =====================================================
// CREAR UNIDAD PRODUCTIVA
// =====================================================

/**
 * Crea una nueva unidad productiva
 */
export async function createUnit(data: CreateUnitData) {
  try {
    // Verificar que no exista una unidad con el mismo código
    const existingCode = await prisma.unidades_productivas.findUnique({
      where: { codigo: data.codigo },
    })

    if (existingCode) {
      throw new Error('Ya existe una unidad productiva con ese código')
    }

    // Verificar que no exista una unidad con el mismo nombre
    const existingName = await prisma.unidades_productivas.findFirst({
      where: {
        nombre: {
          equals: data.nombre,
          mode: 'insensitive',
        },
      },
    })

    if (existingName) {
      throw new Error('Ya existe una unidad productiva con ese nombre')
    }

    const unit = await prisma.unidades_productivas.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        responsable: data.responsable_id ? {
          connect: { id: data.responsable_id }
        } : undefined,
        ubicacion: data.ubicacion,
        activa: data.activa,
      },
      include: {
        responsable: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        _count: {
          select: {
            productos: true,
          },
        },
      },
    })

    return unit
  } catch (error) {
    console.error('Error creating unit:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al crear unidad productiva')
  }
}

// =====================================================
// ACTUALIZAR UNIDAD PRODUCTIVA
// =====================================================

/**
 * Actualiza una unidad productiva existente
 */
export async function updateUnit(id: number, data: UpdateUnitData) {
  try {
    // Verificar que la unidad existe
    const existing = await prisma.unidades_productivas.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Unidad productiva no encontrada')
    }

    // Si se actualiza el nombre, verificar que no exista otra con ese nombre
    if (data.nombre && data.nombre !== existing.nombre) {
      const duplicate = await prisma.unidades_productivas.findFirst({
        where: {
          nombre: {
            equals: data.nombre,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      })

      if (duplicate) {
        throw new Error('Ya existe otra unidad productiva con ese nombre')
      }
    }

    const unit = await prisma.unidades_productivas.update({
      where: { id },
      data: {
        // El código no se actualiza (se omite data.codigo)
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        responsable: data.responsable_id ? {
          connect: { id: data.responsable_id }
        } : undefined,
        ubicacion: data.ubicacion,
        activa: data.activa,
      },
      include: {
        responsable: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        _count: {
          select: {
            productos: {
              where: { activo: true },
            },
          },
        },
      },
    })

    return unit
  } catch (error) {
    console.error('Error updating unit:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al actualizar unidad productiva')
  }
}

// =====================================================
// ELIMINAR UNIDAD PRODUCTIVA (SOFT DELETE)
// =====================================================

/**
 * Desactiva una unidad productiva (soft delete)
 * No permite eliminar si tiene productos activos
 */
export async function deleteUnit(id: number) {
  try {
    // Verificar que la unidad existe
    const existing = await prisma.unidades_productivas.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productos: {
              where: { activo: true },
            },
          },
        },
      },
    })

    if (!existing) {
      throw new Error('Unidad productiva no encontrada')
    }

    // Verificar que no tenga productos activos
    if (existing._count.productos > 0) {
      throw new Error(
        `No se puede desactivar la unidad porque tiene ${existing._count.productos} producto(s) activo(s)`
      )
    }

    // Soft delete (desactivar)
    await prisma.unidades_productivas.update({
      where: { id },
      data: { activa: false },
    })

    return { success: true, message: 'Unidad productiva desactivada exitosamente' }
  } catch (error) {
    console.error('Error deleting unit:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al desactivar unidad productiva')
  }
}

// =====================================================
// OBTENER TODAS LAS UNIDADES (SIN PAGINACIÓN)
// =====================================================

/**
 * Obtiene todas las unidades productivas activas para selectores
 * Útil para formularios y filtros
 */
export async function getAllUnitsForSelect() {
  try {
    const units = await prisma.unidades_productivas.findMany({
      where: { activa: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return units
  } catch (error) {
    console.error('Error fetching units for select:', error)
    throw new Error('Error al obtener unidades productivas')
  }
}

// =====================================================
// OBTENER ESTADÍSTICAS DE UNIDAD
// =====================================================

/**
 * Obtiene estadísticas de una unidad productiva
 * Útil para dashboards y reportes
 */
export async function getUnitStatistics(id: number) {
  try {
    const unit = await prisma.unidades_productivas.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productos: {
              where: { activo: true },
            },
            lotes_productos: {
              where: { estado: 'disponible' },
            },
          },
        },
        productos: {
          where: { activo: true },
          select: {
            stock_actual: true,
            precio_unitario: true,
          },
        },
      },
    })

    if (!unit) {
      throw new Error('Unidad productiva no encontrada')
    }

    // Calcular valor total del inventario
    const valorTotal = unit.productos.reduce(
      (sum, p) => sum + Number(p.stock_actual) * Number(p.precio_unitario),
      0
    )

    return {
      id: unit.id,
      nombre: unit.nombre,
      totalProductos: unit._count.productos,
      totalLotes: unit._count.lotes_productos,
      valorInventario: valorTotal,
    }
  } catch (error) {
    console.error('Error fetching unit statistics:', error)
    throw new Error('Error al obtener estadísticas de unidad')
  }
}

// =====================================================
// CONTAR PRODUCTOS POR UNIDAD
// =====================================================

/**
 * Obtiene el conteo de productos por unidad
 * Útil para reportes y dashboards
 */
export async function getUnitsWithProductCount() {
  try {
    const units = await prisma.unidades_productivas.findMany({
      where: { activa: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        _count: {
          select: {
            productos: {
              where: { activo: true },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    return units.map((unit) => ({
      ...unit,
      productCount: unit._count.productos,
    }))
  } catch (error) {
    console.error('Error fetching units with count:', error)
    throw new Error('Error al obtener estadísticas de unidades')
  }
}
