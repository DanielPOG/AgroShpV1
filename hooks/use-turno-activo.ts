import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface Cajero {
  id: number
  nombre: string
  apellido: string
  email: string
  rol?: string
}

interface SesionCaja {
  id: number
  codigo_sesion: string
  fecha_apertura: Date | string
  estado: string
}

interface TurnoAnterior {
  id: number
  cajero_id: number
  fecha_inicio: Date | string
  fecha_fin: Date | string | null
}

interface Autorizador {
  id: number
  nombre: string
  apellido: string
}

export interface TurnoActivo {
  id: number
  sesion_caja_id: number
  cajero_id: number
  efectivo_inicial: number
  tipo_relevo: string
  fecha_inicio: Date | string
  fecha_fin?: Date | string | null
  estado: string
  observaciones_inicio?: string | null
  observaciones_cierre?: string | null
  cajero: Cajero
  sesion_caja: SesionCaja
  autorizador?: Autorizador | null
  turno_anterior?: TurnoAnterior | null
  efectivo_final?: number | null
  desglose_efectivo?: any
  autorizado_por?: number | null
  turno_anterior_id?: number | null
}

interface UseTurnoActivoReturn {
  turno: TurnoActivo | null
  sesion: SesionCaja | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  iniciarTurno: (data: IniciarTurnoData) => Promise<TurnoActivo>
  cerrarTurno: (data: CerrarTurnoData) => Promise<void>
}

interface IniciarTurnoData {
  sesion_caja_id: number
  efectivo_inicial: number
  tipo_relevo: 'inicio_jornada' | 'cambio_turno' | 'fin_jornada' | 'emergencia'
  observaciones_inicio?: string
  turno_anterior_id?: number
  autorizado_por?: number
}

interface CerrarTurnoData {
  efectivo_final: number
  desglose_efectivo?: any
  observaciones_cierre?: string
  autorizado_por?: number
}

/**
 * Hook para gestionar el estado del turno activo del cajero actual
 */
export function useTurnoActivo(): UseTurnoActivoReturn {
  const [turno, setTurno] = useState<TurnoActivo | null>(null)
  const [sesion, setSesion] = useState<SesionCaja | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  /**
   * Obtener turno activo del servidor
   */
  const fetchTurnoActivo = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/turnos/activo')
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autorizado')
        }
        const data = await response.json()
        throw new Error(data.error || 'Error al obtener turno activo')
      }

      const data = await response.json()
      
      setTurno(data.turno)
      setSesion(data.sesion || null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error al obtener turno activo:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Iniciar nuevo turno
   */
  const iniciarTurno = useCallback(async (data: IniciarTurnoData): Promise<TurnoActivo> => {
    try {
      const response = await fetch('/api/turnos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al iniciar turno')
      }

      const result = await response.json()
      
      // Actualizar estado local
      setTurno(result.turno)
      
      toast({
        title: '✅ Turno iniciado',
        description: result.message || 'El turno se ha iniciado correctamente',
      })

      return result.turno
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      
      toast({
        title: '❌ Error al iniciar turno',
        description: message,
        variant: 'destructive',
      })

      throw err
    }
  }, [toast])

  /**
   * Cerrar turno activo
   */
  const cerrarTurno = useCallback(async (data: CerrarTurnoData): Promise<void> => {
    if (!turno) {
      throw new Error('No hay turno activo para cerrar')
    }

    try {
      const response = await fetch(`/api/turnos/${turno.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cerrar',
          ...data,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cerrar turno')
      }

      const result = await response.json()
      
      // Limpiar estado local
      setTurno(null)
      
      toast({
        title: '✅ Turno cerrado',
        description: result.message || 'El turno se ha cerrado correctamente',
      })

      // Refrescar para verificar si hay otro turno
      await fetchTurnoActivo()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      
      toast({
        title: '❌ Error al cerrar turno',
        description: message,
        variant: 'destructive',
      })

      throw err
    }
  }, [turno, toast, fetchTurnoActivo])

  /**
   * Cargar turno activo al montar el componente
   */
  useEffect(() => {
    fetchTurnoActivo()
  }, [fetchTurnoActivo])

  return {
    turno,
    sesion,
    isLoading,
    error,
    refetch: fetchTurnoActivo,
    iniciarTurno,
    cerrarTurno,
  }
}
