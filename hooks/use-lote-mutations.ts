import { useState } from 'react'

interface RetirarLoteParams {
  loteId: number
  action: 'retire' | 'delete' | 'reactivar'
  motivo?: string
}

interface RetirarLoteResponse {
  success: boolean
  message: string
  lote?: any
}

export function useLoteMutations() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Retirar o eliminar un lote
   * @param loteId - ID del lote
   * @param action - 'retire' para cambiar estado a retirado, 'delete' para eliminar físicamente
   * @param motivo - Razón del retiro (opcional)
   */
  const retirarLote = async ({ loteId, action, motivo }: RetirarLoteParams): Promise<RetirarLoteResponse> => {
    setIsDeleting(true)
    setError(null)

    try {
      // Construir URL con query params
      const url = new URL(`/api/lotes/${loteId}`, window.location.origin)
      url.searchParams.set('action', action)
      if (motivo) {
        url.searchParams.set('motivo', motivo)
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el lote')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Eliminar un lote (alias para retirarLote con action='delete')
   */
  const deleteLote = async (loteId: number, motivo?: string) => {
    return retirarLote({ loteId, action: 'delete', motivo })
  }

  /**
   * Cambiar estado a retirado (alias para retirarLote con action='retire')
   */
  const cambiarEstadoRetirado = async (loteId: number, motivo?: string) => {
    return retirarLote({ loteId, action: 'retire', motivo })
  }

  /**
   * Reactivar un lote retirado (cambiar de 'retirado' a 'disponible')
   */
  const reactivarLote = async (loteId: number, motivo?: string) => {
    return retirarLote({ loteId, action: 'reactivar', motivo })
  }

  return {
    retirarLote: retirarLote,
    deleteLote,
    cambiarEstadoRetirado,
    reactivarLote,
    isDeleting,
    error,
  }
}
