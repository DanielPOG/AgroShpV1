/**
 * Hook: useNotificaciones
 * 
 * Gestiona el estado de las notificaciones del usuario:
 * - Carga automática al montar
 * - Polling cada 30 segundos para actualizar
 * - Marcar individual como leída
 * - Marcar todas como leídas
 * - Contador de no leídas
 */

import { useState, useEffect, useCallback } from 'react'

export interface Notificacion {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  prioridad: string | null
  leida: boolean | null
  usuario_id: number | null
  referencia_id: number | null
  referencia_tipo: string | null
  created_at: Date | string | null
}

interface UseNotificacionesReturn {
  notificaciones: Notificacion[]
  notificacionesLeidas: Notificacion[]
  noLeidas: number
  isLoading: boolean
  isLoadingLeidas: boolean
  error: string | null
  marcarLeida: (id: number) => Promise<void>
  marcarTodasLeidas: () => Promise<void>
  eliminarNotificacion: (id: number) => Promise<void>
  eliminarSeleccionadas: (ids: number[]) => Promise<void>
  eliminarTodasLeidas: () => Promise<void>
  refetch: () => Promise<void>
  refetchLeidas: () => Promise<void>
  selectedIds: number[]
  toggleSelection: (id: number) => void
  selectAll: () => void
  deselectAll: () => void
  filterProductoActivo: string
  setFilterProductoActivo: (value: string) => void
}

/**
 * Hook para gestionar notificaciones
 * 
 * @param {boolean} enablePolling - Activar polling automático (default: true)
 * @param {number} pollingInterval - Intervalo de polling en ms (default: 30000)
 * @returns {UseNotificacionesReturn}
 */
export function useNotificaciones(
  enablePolling: boolean = true,
  pollingInterval: number = 30000
): UseNotificacionesReturn {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [notificacionesLeidas, setNotificacionesLeidas] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingLeidas, setIsLoadingLeidas] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [filterProductoActivo, setFilterProductoActivo] = useState<string>('all')

  /**
   * Obtener notificaciones no leídas
   */
  const fetchNotificaciones = useCallback(async () => {
    try {
      setError(null)
      
      // Solo obtener no leídas, últimas 20
      // La verificación automática se ejecuta en el servidor
      const url = `/api/notificaciones?leidas=false&limit=20&productoActivo=${filterProductoActivo}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Error al obtener notificaciones')
      }

      const data = await response.json()
      
      setNotificaciones(data.notificaciones || [])
      setNoLeidas(data.count?.noLeidas || 0)
    } catch (err) {
      console.error('Error fetching notificaciones:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [filterProductoActivo])

  /**
   * Obtener notificaciones leídas (últimas 50)
   */
  const fetchNotificacionesLeidas = useCallback(async () => {
    try {
      setIsLoadingLeidas(true)
      setError(null)
      
      const url = `/api/notificaciones?leidas=true&limit=50&productoActivo=${filterProductoActivo}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Error al obtener notificaciones leídas')
      }

      const data = await response.json()
      
      setNotificacionesLeidas(data.notificaciones || [])
    } catch (err) {
      console.error('Error fetching notificaciones leídas:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoadingLeidas(false)
    }
  }, [filterProductoActivo])

  /**
   * Marcar una notificación como leída
   */
  const marcarLeida = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/notificaciones/${id}/marcar-leida`, {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error('Error al marcar notificación como leída')
      }

      // Refrescar notificaciones
      await fetchNotificaciones()
      // Si ya se cargaron las leídas, refrescarlas también
      if (notificacionesLeidas.length > 0) {
        await fetchNotificacionesLeidas()
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }, [fetchNotificaciones, fetchNotificacionesLeidas, notificacionesLeidas.length])

  /**
   * Marcar todas las notificaciones como leídas
   */
  const marcarTodasLeidas = useCallback(async () => {
    try {
      const response = await fetch('/api/notificaciones/marcar-todas-leidas', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Error al marcar todas las notificaciones como leídas')
      }

      // Refrescar notificaciones
      await fetchNotificaciones()
      // Si ya se cargaron las leídas, refrescarlas también
      if (notificacionesLeidas.length > 0) {
        await fetchNotificacionesLeidas()
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }, [fetchNotificaciones, fetchNotificacionesLeidas, notificacionesLeidas.length])

  /**
   * Eliminar una notificación individual
   */
  const eliminarNotificacion = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/notificaciones/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar notificación')
      }

      // Refrescar las notificaciones leídas
      await fetchNotificacionesLeidas()
    } catch (err) {
      console.error('Error deleting notification:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    }
  }, [fetchNotificacionesLeidas])

  /**
   * Eliminar múltiples notificaciones seleccionadas
   */
  const eliminarSeleccionadas = useCallback(async (ids: number[]) => {
    try {
      const response = await fetch('/api/notificaciones/eliminar-seleccionadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      })

      if (!response.ok) {
        throw new Error('Error al eliminar notificaciones seleccionadas')
      }

      const data = await response.json()

      // Limpiar selección
      setSelectedIds([])
      
      // Refrescar las notificaciones leídas
      await fetchNotificacionesLeidas()

      return data.count
    } catch (err) {
      console.error('Error deleting selected notifications:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    }
  }, [fetchNotificacionesLeidas])

  /**
   * Eliminar todas las notificaciones leídas
   */
  const eliminarTodasLeidas = useCallback(async () => {
    try {
      const response = await fetch('/api/notificaciones/eliminar-todas-leidas', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar todas las notificaciones leídas')
      }

      const data = await response.json()

      // Limpiar selección
      setSelectedIds([])
      
      // Refrescar las notificaciones leídas
      await fetchNotificacionesLeidas()

      return data.count
    } catch (err) {
      console.error('Error deleting all read notifications:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    }
  }, [fetchNotificacionesLeidas])

  /**
   * Alternar selección de una notificación
   */
  const toggleSelection = useCallback((id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }, [])

  /**
   * Seleccionar todas las notificaciones leídas
   */
  const selectAll = useCallback(() => {
    setSelectedIds(notificacionesLeidas.map(n => n.id))
  }, [notificacionesLeidas])

  /**
   * Deseleccionar todas las notificaciones
   */
  const deselectAll = useCallback(() => {
    setSelectedIds([])
  }, [])

  /**
   * Efecto: Cargar notificaciones al montar y configurar polling
   */
  useEffect(() => {
    fetchNotificaciones()

    // Configurar polling si está activado
    if (enablePolling) {
      const interval = setInterval(fetchNotificaciones, pollingInterval)
      return () => clearInterval(interval)
    }
  }, [fetchNotificaciones, enablePolling, pollingInterval])

  return {
    notificaciones,
    notificacionesLeidas,
    noLeidas,
    isLoading,
    isLoadingLeidas,
    error,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    eliminarSeleccionadas,
    eliminarTodasLeidas,
    refetch: fetchNotificaciones,
    refetchLeidas: fetchNotificacionesLeidas,
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll,
    filterProductoActivo,
    setFilterProductoActivo
  }
}
