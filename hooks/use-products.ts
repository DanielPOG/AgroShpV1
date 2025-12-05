'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProductFilters, AdjustStockData } from '@/lib/validations/product.schema'

/**
 * Hook para gestionar productos con estado de loading, error y cache
 * 
 * Funcionalidades:
 * - Lista de productos con paginación y 12 filtros
 * - Obtener producto por ID con historial
 * - Crear, actualizar y desactivar productos
 * - Ajustar stock con historial
 * - Búsqueda rápida de productos
 * - Alertas (stock bajo, agotados, vencimientos)
 * - Refetch manual
 * - Cache automático
 */

// =====================================================
// TIPOS
// =====================================================

interface Product {
  id: number
  codigo: string
  nombre: string
  descripcion?: string | null
  precio_unitario: number
  precio_mayorista?: number | null
  stock_actual: number
  stock_minimo: number
  stock_maximo?: number | null
  unidad: string
  tipo_medida: string
  imagen_url?: string | null
  es_perecedero?: boolean | null
  dias_vencimiento?: number | null
  activo?: boolean | null
  created_at?: Date | null
  categoria?: {
    id: number
    nombre: string
    icono?: string | null
    color?: string | null
  } | null
  unidad_productiva?: {
    id: number
    codigo: string
    nombre: string
  } | null
  proveedor?: {
    id: number
    nombre: string
    telefono?: string | null
  } | null
}

interface ProductDetail extends Product {
  historial_inventario?: Array<{
    id: number
    tipo_movimiento: string
    cantidad_movimiento: number
    cantidad_anterior?: number | null
    cantidad_nueva?: number | null
    observaciones?: string | null
    fecha_movimiento?: Date | null
    usuarios?: {
      id: number
      nombre: string
      apellido: string
    } | null
  }>
  _count?: {
    detalles_ventas: number
    historial_inventario: number
    lotes_productos: number
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ProductsResponse {
  data: Product[]
  pagination: PaginationMeta
}

interface CreateProductData {
  codigo?: string
  nombre: string
  descripcion?: string
  categoria_id: number
  unidad_productiva_id: number
  tipo_medida: 'unidad' | 'peso' | 'volumen' | 'lote'
  unidad: string
  precio_unitario: number
  precio_mayorista?: number
  stock_inicial?: number
  stock_minimo: number
  stock_maximo?: number
  es_perecedero?: boolean
  dias_vencimiento?: number
  proveedor_id?: number
  imagen_url?: string
  usuario_id?: number
}

interface UpdateProductData extends Partial<Omit<CreateProductData, 'codigo' | 'stock_inicial' | 'usuario_id'>> {}

interface AlertsResponse {
  stock_bajo?: Product[]
  agotados?: Product[]
  proximos_vencer?: Array<Product & {
    lotes_productos: Array<{
      numero_lote: string
      fecha_vencimiento: Date
      cantidad_disponible: number
    }>
  }>
  contadores: {
    stock_bajo: number
    agotados: number
    proximos_vencer: number
    total: number
  }
}

// =====================================================
// HOOK: useProducts (Lista con paginación y filtros)
// =====================================================

export function useProducts(filters?: ProductFilters) {
  const [data, setData] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFirstLoad, setIsFirstLoad] = useState(true) // Track primera carga

  const fetchProducts = useCallback(async (silent = false) => {
    // Solo mostrar loading en primera carga o si se solicita explícitamente
    if (!silent && isFirstLoad) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams()
      
      // Paginación
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      // Búsqueda
      if (filters?.search) params.append('search', filters.search)
      
      // Filtros básicos
      if (filters?.categoria_id) params.append('categoria_id', filters.categoria_id.toString())
      if (filters?.unidad_productiva_id) params.append('unidad_productiva_id', filters.unidad_productiva_id.toString())
      if (filters?.activo !== undefined) params.append('activo', filters.activo.toString())
      if (filters?.tipo_medida) params.append('tipo_medida', filters.tipo_medida)
      if (filters?.es_perecedero !== undefined) params.append('es_perecedero', filters.es_perecedero.toString())
      if (filters?.proveedor_id) params.append('proveedor_id', filters.proveedor_id.toString())
      
      // Rangos
      if (filters?.precio_min !== undefined) params.append('precio_min', filters.precio_min.toString())
      if (filters?.precio_max !== undefined) params.append('precio_max', filters.precio_max.toString())
      if (filters?.stock_min !== undefined) params.append('stock_min', filters.stock_min.toString())
      if (filters?.stock_max !== undefined) params.append('stock_max', filters.stock_max.toString())
      if (filters?.stock_status) params.append('stock_status', filters.stock_status)
      
      // Ordenamiento
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)

      const response = await fetch(`/api/productos?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener productos')
      }

      const result: ProductsResponse = await response.json()
      setData(result.data)
      setPagination(result.pagination)
      
      // Marcar que ya no es la primera carga
      if (isFirstLoad) {
        setIsFirstLoad(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching products:', err)
    } finally {
      if (!silent && isFirstLoad) {
        setIsLoading(false)
      }
    }
  }, [
    isFirstLoad,
    filters?.page,
    filters?.limit,
    filters?.search,
    filters?.categoria_id,
    filters?.unidad_productiva_id,
    filters?.activo,
    filters?.tipo_medida,
    filters?.es_perecedero,
    filters?.proveedor_id,
    filters?.precio_min,
    filters?.precio_max,
    filters?.stock_min,
    filters?.stock_max,
    filters?.stock_status,
    filters?.sortBy,
  ])

  useEffect(() => {
    // Primera carga: mostrar loading
    // Cambios de filtros: actualización silenciosa
    fetchProducts(false)
  }, [fetchProducts])

  return {
    products: data,
    pagination,
    isLoading,
    error,
    refetch: fetchProducts,
    // Función para actualizar productos localmente sin refetch
    updateLocalProduct: (productId: number, updates: Partial<Product>) => {
      setData(prevData => 
        prevData.map(p => p.id === productId ? { ...p, ...updates } : p)
      )
    },
    // Función para agregar producto localmente
    addLocalProduct: (product: Product) => {
      setData(prevData => [product, ...prevData])
    },
    // Función para eliminar producto localmente
    removeLocalProduct: (productId: number) => {
      setData(prevData => prevData.filter(p => p.id !== productId))
    },
  }
}

// =====================================================
// HOOK: useProduct (Detalle de un producto)
// =====================================================

export function useProduct(id: number | null) {
  const [data, setData] = useState<ProductDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // No hacer nada si no hay ID
    if (!id) {
      console.log('useProduct: No ID provided, clearing data')
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    console.log('useProduct: Fetching product with ID:', id)
    let cancelled = false

    const fetchProduct = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/productos/${id}`)
        console.log('useProduct: Response status:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al obtener producto')
        }

        const result: ProductDetail = await response.json()
        console.log('useProduct: Product fetched successfully:', result)
        console.log('useProduct: Stock Debug:', {
          stock_actual: result.stock_actual,
          stock_minimo: result.stock_minimo,
          stock_actual_type: typeof result.stock_actual,
          stock_minimo_type: typeof result.stock_minimo
        })
        
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Error desconocido'
          setError(message)
          console.error('useProduct: Error fetching product:', err)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProduct()

    // Cleanup function
    return () => {
      cancelled = true
    }
  }, [id])

  const refetch = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/productos/${id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener producto')
      }

      const result: ProductDetail = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching product:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  return {
    product: data,
    isLoading,
    error,
    refetch,
  }
}

// =====================================================
// HOOK: useProductSearch (Búsqueda rápida)
// =====================================================

export function useProductSearch(query: string, limit = 10) {
  const [data, setData] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchProducts = useCallback(async () => {
    if (!query || query.trim().length < 2) {
      setData([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('q', query)
      params.append('limit', limit.toString())

      const response = await fetch(`/api/productos/buscar?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al buscar productos')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error searching products:', err)
    } finally {
      setIsLoading(false)
    }
  }, [query, limit])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts()
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [searchProducts])

  return {
    results: data,
    isLoading,
    error,
  }
}

// =====================================================
// HOOK: useProductAlerts (Alertas de inventario)
// =====================================================

export function useProductAlerts(tipo: 'stock_bajo' | 'agotados' | 'vencimientos' | 'todos' = 'todos', dias = 7) {
  const [data, setData] = useState<AlertsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('tipo', tipo)
      params.append('dias', dias.toString())

      const response = await fetch(`/api/productos/alertas?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener alertas')
      }

      const result: AlertsResponse = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching alerts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tipo, dias])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  return {
    alerts: data,
    isLoading,
    error,
    refetch: fetchAlerts,
  }
}

// =====================================================
// HOOK: useProductMutations (Crear, actualizar, eliminar, ajustar stock)
// =====================================================

export function useProductMutations() {
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAdjustingStock, setIsAdjustingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProduct = async (data: CreateProductData): Promise<Product> => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Si hay detalles de validación de Zod, formatearlos
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details
            .map((err: any) => `${err.path.join('.')}: ${err.message}`)
            .join(', ')
          throw new Error(validationErrors)
        }
        
        throw new Error(errorData.error || 'Error al crear producto')
      }

      const result: Product = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  const updateProduct = async (id: number, data: UpdateProductData): Promise<Product> => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Si hay detalles de validación de Zod, formatearlos
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details
            .map((err: any) => `${err.path.join('.')}: ${err.message}`)
            .join(', ')
          throw new Error(validationErrors)
        }
        
        throw new Error(errorData.error || 'Error al actualizar producto')
      }

      const result: Product = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteProduct = async (id: number): Promise<{ success: boolean; message: string }> => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar producto')
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

  const reactivateProduct = async (id: number): Promise<Product> => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al reactivar producto')
      }

      const result: Product = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  const adjustStock = async (data: Omit<AdjustStockData, 'usuario_id'>): Promise<any> => {
    setIsAdjustingStock(true)
    setError(null)

    try {
      const response = await fetch('/api/productos/ajustar-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al ajustar stock')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsAdjustingStock(false)
    }
  }

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    reactivateProduct,
    adjustStock,
    isCreating,
    isUpdating,
    isDeleting,
    isAdjustingStock,
    error,
  }
}
