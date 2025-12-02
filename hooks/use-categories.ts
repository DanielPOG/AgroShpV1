'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CategoryFilters } from '@/lib/validations/category.schema'

/**
 * Hook para gestionar categorías con estado de loading, error y cache
 * 
 * Funcionalidades:
 * - Lista de categorías con paginación y búsqueda
 * - Obtener categoría por ID
 * - Crear, actualizar y eliminar categorías
 * - Lista simple para selectores (sin paginación)
 * - Refetch manual
 * - Cache automático
 */

// =====================================================
// TIPOS
// =====================================================

interface Category {
  id: number
  nombre: string
  descripcion?: string | null
  icono?: string | null
  color?: string | null
  created_at?: Date | null
  _count?: {
    productos: number
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface CategoriesResponse {
  data: Category[]
  pagination: PaginationMeta
}

interface CategoryDetailResponse extends Category {
  productos?: Array<{
    id: number
    codigo: string
    nombre: string
    precio_unitario: number
    stock_actual: number
    unidad: string
    imagen_url?: string | null
  }>
}

interface CreateCategoryData {
  nombre: string
  descripcion?: string
  icono?: string
  color?: string
}

interface UpdateCategoryData extends Partial<CreateCategoryData> {}

// =====================================================
// HOOK: useCategories (Lista con paginación)
// =====================================================

export function useCategories(filters?: CategoryFilters) {
  const [data, setData] = useState<Category[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.search) params.append('search', filters.search)

      const response = await fetch(`/api/categorias?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener categorías')
      }

      const result: CategoriesResponse = await response.json()
      setData(result.data)
      setPagination(result.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching categories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters?.page, filters?.limit, filters?.search])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories: data,
    pagination,
    isLoading,
    error,
    refetch: fetchCategories,
  }
}

// =====================================================
// HOOK: useCategory (Detalle de una categoría)
// =====================================================

export function useCategory(id: number | null) {
  const [data, setData] = useState<CategoryDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategory = useCallback(async () => {
    if (!id) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/categorias/${id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener categoría')
      }

      const result: CategoryDetailResponse = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching category:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCategory()
  }, [fetchCategory])

  return {
    category: data,
    isLoading,
    error,
    refetch: fetchCategory,
  }
}

// =====================================================
// HOOK: useCategoriesSelect (Lista simple para selectores)
// =====================================================

export function useCategoriesSelect() {
  const [data, setData] = useState<Array<{ id: number; nombre: string; icono?: string | null; color?: string | null }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/categorias/select')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener categorías')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching categories select:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories: data,
    isLoading,
    error,
    refetch: fetchCategories,
  }
}

// =====================================================
// HOOK: useCategoryMutations (Crear, actualizar, eliminar)
// =====================================================

export function useCategoryMutations() {
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCategory = async (data: CreateCategoryData): Promise<Category> => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear categoría')
      }

      const result: Category = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  const updateCategory = async (id: number, data: UpdateCategoryData): Promise<Category> => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar categoría')
      }

      const result: Category = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteCategory = async (id: number): Promise<{ success: boolean; message: string }> => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar categoría')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting,
    error,
  }
}
