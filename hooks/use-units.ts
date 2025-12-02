'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UnitFilters } from '@/lib/validations/unit.schema'

/**
 * Hook para gestionar unidades productivas con estado de loading, error y cache
 * 
 * Funcionalidades:
 * - Lista de unidades con paginación y filtros
 * - Obtener unidad por ID
 * - Crear, actualizar y desactivar unidades
 * - Lista simple para selectores
 * - Refetch manual
 * - Cache automático
 */

// =====================================================
// TIPOS
// =====================================================

interface Unit {
  id: number
  codigo: string
  nombre: string
  descripcion?: string | null
  tipo?: string | null
  responsable_id?: number | null
  ubicacion?: string | null
  activa?: boolean | null
  created_at?: Date | null
  updated_at?: Date | null
  usuarios?: {
    id: number
    nombre: string
    apellido: string
    email: string
  } | null
  _count?: {
    productos: number
    lotes_productos: number
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UnitsResponse {
  data: Unit[]
  pagination: PaginationMeta
}

interface UnitDetailResponse extends Unit {
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

interface CreateUnitData {
  codigo: string
  nombre: string
  descripcion?: string
  tipo?: string
  responsable_id?: number
  ubicacion?: string
  activa?: boolean
}

interface UpdateUnitData extends Partial<Omit<CreateUnitData, 'codigo'>> {}

// =====================================================
// HOOK: useUnits (Lista con paginación)
// =====================================================

export function useUnits(filters?: UnitFilters) {
  const [data, setData] = useState<Unit[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnits = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.search) params.append('search', filters.search)
      if (filters?.tipo) params.append('tipo', filters.tipo)
      if (filters?.activa !== undefined) params.append('activa', filters.activa.toString())
      if (filters?.responsable_id) params.append('responsable_id', filters.responsable_id.toString())

      const response = await fetch(`/api/unidades?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener unidades productivas')
      }

      const result: UnitsResponse = await response.json()
      setData(result.data)
      setPagination(result.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching units:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters?.page, filters?.limit, filters?.search, filters?.tipo, filters?.activa, filters?.responsable_id])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  return {
    units: data,
    pagination,
    isLoading,
    error,
    refetch: fetchUnits,
  }
}

// =====================================================
// HOOK: useUnit (Detalle de una unidad)
// =====================================================

export function useUnit(id: number | null) {
  const [data, setData] = useState<UnitDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUnit = useCallback(async () => {
    if (!id) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/unidades/${id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener unidad productiva')
      }

      const result: UnitDetailResponse = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching unit:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchUnit()
  }, [fetchUnit])

  return {
    unit: data,
    isLoading,
    error,
    refetch: fetchUnit,
  }
}

// =====================================================
// HOOK: useUnitsSelect (Lista simple para selectores)
// =====================================================

export function useUnitsSelect() {
  const [data, setData] = useState<Array<{ id: number; codigo: string; nombre: string; tipo?: string | null }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnits = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/unidades/select')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al obtener unidades productivas')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching units select:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  return {
    units: data,
    isLoading,
    error,
    refetch: fetchUnits,
  }
}

// =====================================================
// HOOK: useUnitMutations (Crear, actualizar, desactivar)
// =====================================================

export function useUnitMutations() {
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createUnit = async (data: CreateUnitData): Promise<Unit> => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear unidad productiva')
      }

      const result: Unit = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  const updateUnit = async (id: number, data: UpdateUnitData): Promise<Unit> => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/unidades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar unidad productiva')
      }

      const result: Unit = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteUnit = async (id: number): Promise<{ success: boolean; message: string }> => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/unidades/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al desactivar unidad productiva')
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
    createUnit,
    updateUnit,
    deleteUnit,
    isCreating,
    isUpdating,
    isDeleting,
    error,
  }
}
