import { useState, useCallback, useEffect } from 'react'
import type { LoteFilters } from '@/lib/validations/lote.schema'

interface Lote {
  id: number
  producto_id: number
  codigo_lote: string
  cantidad: number
  fecha_produccion: Date | string
  fecha_vencimiento: Date | string | null
  unidad_productiva_id: number
  estado: 'disponible' | 'vencido' | 'retirado'
  created_at: Date | string
  productos?: {
    id: number
    codigo: string
    nombre: string
    unidad: string
    es_perecedero: boolean
    imagen_url: string | null
    categorias: {
      id: number
      nombre: string
      icono: string | null
      color: string | null
    } | null
  }
  unidades_productivas?: {
    id: number
    codigo: string
    nombre: string
    tipo: string
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Hook para listar y gestionar lotes con filtros
 */
export function useLotes(filters?: LoteFilters) {
  const [data, setData] = useState<Lote[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  const fetchLotes = useCallback(
    async (silent = false) => {
      // Solo mostrar loading en primera carga
      if (!silent && isFirstLoad) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const params = new URLSearchParams()

        if (filters?.page) params.append('page', filters.page.toString())
        if (filters?.limit) params.append('limit', filters.limit.toString())
        if (filters?.producto_id)
          params.append('producto_id', filters.producto_id.toString())
        if (filters?.unidad_productiva_id)
          params.append('unidad_productiva_id', filters.unidad_productiva_id.toString())
        if (filters?.estado) params.append('estado', filters.estado)
        if (filters?.dias_vencimiento)
          params.append('dias_vencimiento', filters.dias_vencimiento.toString())
        if (filters?.search) params.append('search', filters.search)

        const response = await fetch(`/api/lotes?${params.toString()}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al cargar lotes')
        }

        const result = await response.json()
        setData(result.data)
        setPagination(result.pagination)

        // Marcar primera carga como completada
        if (isFirstLoad) {
          setIsFirstLoad(false)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      } finally {
        if (!silent && isFirstLoad) {
          setIsLoading(false)
        }
      }
    },
    [
      isFirstLoad,
      filters?.page,
      filters?.limit,
      filters?.producto_id,
      filters?.unidad_productiva_id,
      filters?.estado,
      filters?.dias_vencimiento,
      filters?.search,
    ]
  )

  useEffect(() => {
    // Primera carga: mostrar loading
    // Cambios de filtros: actualización silenciosa
    fetchLotes(false)
  }, [fetchLotes])

  // Funciones de utilidad para actualización optimista
  const updateLocalLote = useCallback((loteId: number, updates: Partial<Lote>) => {
    setData((prevData) =>
      prevData.map((lote) => (lote.id === loteId ? { ...lote, ...updates } : lote))
    )
  }, [])

  const addLocalLote = useCallback((lote: Lote) => {
    setData((prevData) => [lote, ...prevData])
  }, [])

  const removeLocalLote = useCallback((loteId: number) => {
    setData((prevData) => prevData.filter((lote) => lote.id !== loteId))
  }, [])

  return {
    lotes: data,
    pagination,
    isLoading,
    error,
    refetch: fetchLotes,
    updateLocalLote,
    addLocalLote,
    removeLocalLote,
  }
}

/**
 * Hook para obtener un lote específico
 */
export function useLote(id: number | null) {
  const [lote, setLote] = useState<Lote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLote = useCallback(async () => {
    if (!id) {
      setLote(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/lotes/${id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar lote')
      }

      const data = await response.json()
      setLote(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchLote()
  }, [fetchLote])

  return {
    lote,
    isLoading,
    error,
    refetch: fetchLote,
  }
}

/**
 * Hook para obtener lotes de un producto específico
 */
export function useLotesByProducto(producto_id: number | null) {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLotes = useCallback(async () => {
    if (!producto_id) {
      setLotes([])
      setIsLoading(false)
      return
    }

    console.log('🔍 useLotesByProducto: Fetching lotes for producto_id:', producto_id)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/productos/${producto_id}/lotes`)
      console.log('🔍 useLotesByProducto: Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ useLotesByProducto: Error response:', errorData)
        throw new Error(errorData.error || 'Error al cargar lotes del producto')
      }

      const data = await response.json()
      console.log('✅ useLotesByProducto: Lotes fetched:', data)
      setLotes(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      console.error('❌ useLotesByProducto: Error:', err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [producto_id])

  useEffect(() => {
    fetchLotes()
  }, [fetchLotes])

  return {
    lotes,
    isLoading,
    error,
    refetch: fetchLotes,
  }
}

/**
 * Hook para mutaciones de lotes (create, update, delete)
 */
export function useLotesMutations() {
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const createLote = async (data: any) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear lote')
      }

      return await response.json()
    } finally {
      setIsCreating(false)
    }
  }

  const updateLote = async (id: number, data: any) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/lotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar lote')
      }

      return await response.json()
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteLote = async (id: number) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/lotes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar lote')
      }

      return await response.json()
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    createLote,
    updateLote,
    deleteLote,
    isCreating,
    isUpdating,
    isDeleting,
  }
}
