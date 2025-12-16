"use client"

import { useState, useEffect } from "react"

interface PublicConfig {
  iva_porcentaje: number
  nombre_tienda: string
  stock_minimo_default: number
  dias_alerta_vencimiento: number
}

const defaultConfig: PublicConfig = {
  iva_porcentaje: 19,
  nombre_tienda: "AgroShop SENA",
  stock_minimo_default: 10,
  dias_alerta_vencimiento: 7,
}

let cachedConfig: PublicConfig | null = null
let cacheTime: number = 0
const CACHE_DURATION = 60000 // 1 minuto

// Listeners para notificar cambios
const configListeners = new Set<() => void>()

export function useConfig() {
  const [config, setConfig] = useState<PublicConfig>(cachedConfig || defaultConfig)
  const [loading, setLoading] = useState(!cachedConfig)

  const loadConfig = async (force = false) => {
    const now = Date.now()
    
    // Usar caché si está disponible y no ha expirado (a menos que sea forzado)
    if (!force && cachedConfig && (now - cacheTime) < CACHE_DURATION) {
      setConfig(cachedConfig)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // ✅ CRÍTICO: Agregar timestamp para bypass completo de caché del navegador
      const timestamp = Date.now()
      const response = await fetch(`/api/config/public?t=${timestamp}`, {
        cache: 'no-store', // No usar caché del navegador
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        cachedConfig = data
        cacheTime = now
        setConfig(data)
        console.log('✅ Configuración cargada:', data)
      }
    } catch (error) {
      console.error("Error cargando configuración:", error)
      setConfig(defaultConfig)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()

    // Registrar listener para recargas forzadas
    const listener = () => {
      console.log('🔄 Recargando configuración por evento...')
      loadConfig(true)
    }
    configListeners.add(listener)

    // ✅ Recargar cuando la página vuelve a estar visible (cambio de tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        if ((now - cacheTime) > CACHE_DURATION) {
          console.log('🔄 Recargando configuración (página visible después de caché expirado)...')
          loadConfig(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      configListeners.delete(listener)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { config, loading, reload: () => loadConfig(true) }
}

/**
 * Invalida el caché del cliente y notifica a todos los componentes
 */
export function invalidateClientConfigCache() {
  console.log('🔄 Invalidando caché de configuración...')
  cachedConfig = null
  cacheTime = 0
  
  // Notificar a todos los listeners
  configListeners.forEach(listener => listener())
}
