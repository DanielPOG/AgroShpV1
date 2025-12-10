import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

/**
 * Interfaz para el item de venta
 */
export interface SaleItem {
  producto_id: number
  cantidad: number
  precio_unitario: number
  descuento_porcentaje?: number
  observaciones?: string
}

/**
 * Interfaz para el método de pago
 */
export interface PaymentMethod {
  metodo_pago_id: number
  monto: number
  referencia?: string
}

/**
 * Interfaz para crear una venta
 */
export interface CreateSaleData {
  items: SaleItem[]
  pagos: PaymentMethod[]
  cliente_id?: number
  cliente_nombre?: string
  cliente_email?: string
  cliente_telefono?: string
  descuento_global?: number
  requiere_factura?: boolean
  observaciones?: string
}

/**
 * Hook para crear ventas
 */
export function useSalesMutations() {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Crear una nueva venta
   */
  const createSale = useCallback(
    async (data: CreateSaleData) => {
      setIsCreating(true)
      setError(null)

      try {
        console.log('🛒 Enviando venta al servidor...', {
          items: data.items.length,
          pagos: data.pagos.length,
        })

        const response = await fetch('/api/ventas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al crear venta')
        }

        const venta = await response.json()

        console.log('✅ Venta creada exitosamente:', venta.codigo_venta)

        toast({
          title: '🎉 Venta Completada',
          description: `Venta ${venta.codigo_venta} registrada exitosamente`,
        })

        return venta
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)

        console.error('❌ Error al crear venta:', message)

        toast({
          title: 'Error al Procesar Venta',
          description: message,
          variant: 'destructive',
        })

        throw err
      } finally {
        setIsCreating(false)
      }
    },
    [toast]
  )

  return {
    createSale,
    isCreating,
    error,
  }
}

/**
 * Hook para obtener métodos de pago disponibles
 */
export function usePaymentMethods() {
  const [metodos, setMetodos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetodos = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/metodos-pago')

      if (!response.ok) {
        throw new Error('Error al cargar métodos de pago')
      }

      const data = await response.json()
      setMetodos(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error fetching payment methods:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar métodos de pago al montar el componente
  useState(() => {
    fetchMetodos()
  })

  return {
    metodos,
    isLoading,
    error,
    refetch: fetchMetodos,
  }
}
