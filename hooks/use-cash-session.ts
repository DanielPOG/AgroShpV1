"use client"

import { useEffect, useState, useCallback } from "react"
import { cajaEvents } from "@/lib/events"

interface CashSession {
  id: number
  codigo_sesion: string
  estado: string
  fondo_inicial: number
  efectivo_esperado: number
  total_ventas_efectivo: number
  total_ventas_nequi: number
  total_ventas_tarjeta: number
  total_ventas_transferencia: number
  total_retiros: number
  total_gastos: number
  caja: {
    id: number
    nombre: string
  }
  usuario: {
    id: number
    nombre: string
    apellido: string
  }
}

export function useCashSession() {
  const [session, setSession] = useState<CashSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/caja/session")
      
      if (!response.ok) {
        if (response.status === 404) {
          // No hay sesión activa, esto es válido
          setSession(null)
          setError(null)
          return
        }
        throw new Error("Error al cargar sesión de caja")
      }
      
      const data = await response.json()
      console.log('📦 Sesión de caja cargada:', data.session)
      setSession(data.session)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      setSession(null)
      console.error("Error loading cash session:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()

    // Escuchar eventos de actualización de sesión
    const handleSessionUpdate = () => {
      console.log('🔄 Evento session-updated recibido, recargando sesión...')
      loadSession()
    }

    cajaEvents.on('session-updated', handleSessionUpdate)

    return () => {
      cajaEvents.off('session-updated', handleSessionUpdate)
    }
  }, [loadSession])

  return {
    session,
    loading,
    error,
    hasActiveSession: session !== null && session.estado === 'abierta',
    reload: loadSession,
  }
}
