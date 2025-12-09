"use client"

/**
 * AlertasPollingProvider
 * 
 * Componente que ejecuta verificación automática de alertas
 * en segundo plano. Se monta en el layout del dashboard.
 * 
 * Configuración:
 * - Intervalo: 5 minutos (configurable)
 * - Solo ejecuta cuando el usuario está activo
 * - Notifica al usuario si hay nuevas alertas
 */

import { useAlertasPolling } from '@/hooks/use-alertas-polling'
import { useNotificaciones } from '@/hooks/use-notificaciones'
import { useEffect, useCallback } from 'react'

interface AlertasPollingProviderProps {
  children: React.ReactNode
  pollingInterval?: number // Intervalo en ms (default: 5 min)
}

export function AlertasPollingProvider({ 
  children, 
  pollingInterval = 300000 // 5 minutos
}: AlertasPollingProviderProps) {
  const { refetch } = useNotificaciones(false) // Deshabilitar polling del hook

  /**
   * Callback cuando se completa la verificación
   * Refresca las notificaciones para mostrar nuevas alertas
   */
  const handleVerificationComplete = useCallback((resultado: any) => {
    // Solo refrescar si se crearon nuevas alertas
    const totalNuevasAlertas = 
      (resultado?.agotado || 0) + 
      (resultado?.bajo || 0) + 
      (resultado?.exceso || 0) + 
      (resultado?.lotesVencimiento || 0)

    if (totalNuevasAlertas > 0) {
      console.log(`✅ Verificación de alertas completada: ${totalNuevasAlertas} nuevas alertas`)
      // Refrescar notificaciones para que aparezcan en el bell icon
      refetch()
    }
  }, [refetch])

  // Configurar polling de alertas
  const { lastVerification } = useAlertasPolling({
    enabled: true,
    interval: pollingInterval,
    onVerificationComplete: handleVerificationComplete
  })

  // Log para debug (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && lastVerification) {
      console.log('🔔 Última verificación de alertas:', lastVerification.toLocaleTimeString())
    }
  }, [lastVerification])

  return <>{children}</>
}
