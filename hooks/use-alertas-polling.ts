/**
 * Hook: useAlertasPolling
 * 
 * Ejecuta verificación automática de alertas cada cierto tiempo
 * - Polling configurable (default: 5 minutos)
 * - Solo ejecuta si el usuario está autenticado
 * - Se puede pausar/reanudar según necesidad
 */

import { useEffect, useCallback, useState, useRef } from 'react'

interface UseAlertasPollingOptions {
  enabled?: boolean // Si está habilitado el polling (default: true)
  interval?: number // Intervalo en ms (default: 5 minutos = 300000ms)
  onVerificationComplete?: (resultado: any) => void // Callback al completar
}

interface VerificationResult {
  agotado: number
  bajo: number
  exceso: number
  lotesVencimiento: number
  alertasLimpiadas: {
    stock: number
    lotes: number
  }
}

export function useAlertasPolling({
  enabled = true,
  interval = 300000, // 5 minutos por defecto
  onVerificationComplete
}: UseAlertasPollingOptions = {}) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [lastVerification, setLastVerification] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isVerifyingRef = useRef(false)
  const callbackRef = useRef(onVerificationComplete)

  // Mantener callback actualizado
  useEffect(() => {
    callbackRef.current = onVerificationComplete
  }, [onVerificationComplete])

  /**
   * Ejecutar verificación de alertas
   */
  const verificarAlertas = useCallback(async () => {
    if (isVerifyingRef.current) return // Evitar ejecuciones simultáneas

    try {
      isVerifyingRef.current = true
      setIsVerifying(true)
      setError(null)

      const response = await fetch('/api/alertas/verificar', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Error al verificar alertas')
      }

      const data = await response.json()
      
      setLastVerification(new Date())
      
      // Callback opcional
      if (callbackRef.current && data.resultado) {
        callbackRef.current(data.resultado)
      }

      return data.resultado as VerificationResult
    } catch (err) {
      console.error('Error en polling de alertas:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    } finally {
      isVerifyingRef.current = false
      setIsVerifying(false)
    }
  }, []) // Sin dependencias - función estable

  /**
   * Efecto: Configurar polling automático
   */
  useEffect(() => {
    if (!enabled) {
      // Limpiar intervalo si está deshabilitado
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Ejecutar verificación inmediata al montar
    verificarAlertas()

    // Configurar polling periódico
    intervalRef.current = setInterval(() => {
      verificarAlertas()
    }, interval)

    // Cleanup al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, interval]) // verificarAlertas es estable (sin deps), no causa re-creación

  return {
    verificarAlertas, // Función para verificar manualmente
    isVerifying,
    lastVerification,
    error
  }
}
