'use client'

import { useState, useEffect } from 'react'

/**
 * Proveedor para Select (lista simplificada)
 */
export interface ProveedorSelect {
  id: number
  codigo: string
  nombre: string
  nit?: string | null
  contacto_nombre?: string | null
  contacto_telefono?: string | null
}

/**
 * Hook para obtener proveedores activos para dropdowns/selects
 * Solo carga una vez al montar el componente
 */
export function useProveedoresSelect() {
  const [proveedores, setProveedores] = useState<ProveedorSelect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProveedores = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/proveedores')

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al obtener proveedores')
        }

        const data: ProveedorSelect[] = await response.json()
        setProveedores(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        console.error('Error fetching proveedores:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProveedores()
  }, [])

  return {
    proveedores,
    isLoading,
    error,
  }
}
