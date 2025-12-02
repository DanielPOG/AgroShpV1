import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { createPaginationMeta } from '@/lib/validations/common.schema'
import type { CategoryFilters, CreateCategoryData, UpdateCategoryData } from '@/lib/validations/category.schema'

/**
 * Funciones de base de datos para Categorías
 * 
 * CRUD optimizado con Prisma ORM
 * Incluye: paginación, búsqueda, soft delete, relaciones
 */

// =====================================================
// LISTAR CATEGORÍAS
// =====================================================

/**
 * Obtiene todas las categorías con paginación y búsqueda
 */
export async function getCategories(filters?: CategoryFilters) {
  const where: Prisma.categoriasWhereInput = {}

  // Búsqueda por nombre
  if (filters?.search) {
    where.nombre = {
      contains: filters.search,
      mode: 'insensitive',
    }
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  try {
    const [categories, total] = await Promise.all([
      prisma.categorias.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          icono: true,
          color: true,
          created_at: true,
          _count: {
            select: {
              productos: {
                where: { activo: true },
              },
            },
          },
        },
      }),
      prisma.categorias.count({ where }),
    ])

    return {
      data: categories,
      pagination: createPaginationMeta(page, limit, total),
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw new Error('Error al obtener categorías')
  }
}

// =====================================================
// OBTENER UNA CATEGORÍA
// =====================================================

/**
 * Obtiene una categoría por ID con información de productos
 */
export async function getCategoryById(id: number) {
  try {
    const category = await prisma.categorias.findUnique({
      where: { id },
      include: {
        productos: {
          where: { activo: true },
          select: {
            id: true,
            nombre: true,
            precio_unitario: true,
            stock_actual: true,
            imagen_url: true,
          },
          take: 10, // Solo los primeros 10 productos
          orderBy: { nombre: 'asc' },
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

    if (!category) {
      throw new Error('Categoría no encontrada')
    }

    return category
  } catch (error) {
    console.error('Error fetching category:', error)
    throw new Error('Error al obtener categoría')
  }
}

// =====================================================
// CREAR CATEGORÍA
// =====================================================

/**
 * Crea una nueva categoría
 */
export async function createCategory(data: CreateCategoryData) {
  try {
    // Verificar que no exista una categoría con el mismo nombre
    const existing = await prisma.categorias.findFirst({
      where: {
        nombre: {
          equals: data.nombre,
          mode: 'insensitive',
        },
      },
    })

    if (existing) {
      throw new Error('Ya existe una categoría con ese nombre')
    }

    const category = await prisma.categorias.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        icono: data.icono,
        color: data.color,
      },
      include: {
        _count: {
          select: {
            productos: true,
          },
        },
      },
    })

    return category
  } catch (error) {
    console.error('Error creating category:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al crear categoría')
  }
}

// =====================================================
// ACTUALIZAR CATEGORÍA
// =====================================================

/**
 * Actualiza una categoría existente
 */
export async function updateCategory(id: number, data: UpdateCategoryData) {
  try {
    // Verificar que la categoría existe
    const existing = await prisma.categorias.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Categoría no encontrada')
    }

    // Si se actualiza el nombre, verificar que no exista otra con ese nombre
    if (data.nombre && data.nombre !== existing.nombre) {
      const duplicate = await prisma.categorias.findFirst({
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
        throw new Error('Ya existe otra categoría con ese nombre')
      }
    }

    const category = await prisma.categorias.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        icono: data.icono,
        color: data.color,
      },
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

    return category
  } catch (error) {
    console.error('Error updating category:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al actualizar categoría')
  }
}

// =====================================================
// ELIMINAR CATEGORÍA
// =====================================================

/**
 * Elimina una categoría (verifica que no tenga productos)
 */
export async function deleteCategory(id: number) {
  try {
    // Verificar que la categoría existe
    const existing = await prisma.categorias.findUnique({
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
      throw new Error('Categoría no encontrada')
    }

    // Verificar que no tenga productos activos
    if (existing._count.productos > 0) {
      throw new Error(
        `No se puede eliminar la categoría porque tiene ${existing._count.productos} producto(s) activo(s)`
      )
    }

    await prisma.categorias.delete({
      where: { id },
    })

    return { success: true, message: 'Categoría eliminada exitosamente' }
  } catch (error) {
    console.error('Error deleting category:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al eliminar categoría')
  }
}

// =====================================================
// OBTENER TODAS LAS CATEGORÍAS (SIN PAGINACIÓN)
// =====================================================

/**
 * Obtiene todas las categorías activas para selectores
 * Útil para formularios y filtros
 */
export async function getAllCategoriesForSelect() {
  try {
    const categories = await prisma.categorias.findMany({
      select: {
        id: true,
        nombre: true,
        icono: true,
        color: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return categories
  } catch (error) {
    console.error('Error fetching categories for select:', error)
    throw new Error('Error al obtener categorías')
  }
}

// =====================================================
// CONTAR PRODUCTOS POR CATEGORÍA
// =====================================================

/**
 * Obtiene el conteo de productos por categoría
 * Útil para reportes y dashboards
 */
export async function getCategoriesWithProductCount() {
  try {
    const categories = await prisma.categorias.findMany({
      select: {
        id: true,
        nombre: true,
        icono: true,
        color: true,
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

    return categories.map((cat) => ({
      ...cat,
      productCount: cat._count.productos,
    }))
  } catch (error) {
    console.error('Error fetching categories with count:', error)
    throw new Error('Error al obtener estadísticas de categorías')
  }
}
