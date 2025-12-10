import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Interfaz para un item del carrito
 */
export interface CartItem {
  id: number
  nombre: string
  codigo: string
  precio: number
  cantidad: number
  stock: number
  imagen?: string
  unidad: string
  es_perecedero: boolean
  categoria?: {
    nombre: string
    color: string
    icono?: string
  }
}

/**
 * Interfaz del store del carrito
 */
interface CartStore {
  // Estado
  items: CartItem[]
  
  // Acciones
  addItem: (product: Omit<CartItem, 'cantidad'>) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, cantidad: number) => void
  clearCart: () => void
  
  // Getters
  getTotal: () => number
  getSubtotal: () => number
  getImpuesto: () => number
  getItemCount: () => number
  getItem: (id: number) => CartItem | undefined
  hasItems: () => boolean
}

/**
 * Store de Zustand para el carrito del POS
 * - Persiste en localStorage
 * - Incluye validaciones de stock
 * - Calcula totales automáticamente
 */
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      items: [],

      /**
       * Agregar producto al carrito
       * Si ya existe, incrementa la cantidad
       */
      addItem: (product) => {
        const items = get().items
        const existing = items.find((item) => item.id === product.id)

        if (existing) {
          // Validar stock antes de incrementar
          if (existing.cantidad >= product.stock) {
            console.warn(`⚠️ Stock insuficiente para ${product.nombre}. Disponible: ${product.stock}`)
            return
          }

          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, cantidad: item.cantidad + 1 }
                : item
            ),
          })

          console.log(`➕ Incrementado: ${product.nombre} (${existing.cantidad + 1})`)
        } else {
          // Agregar nuevo producto con cantidad 1
          set({ 
            items: [...items, { ...product, cantidad: 1 }] 
          })

          console.log(`🆕 Agregado al carrito: ${product.nombre}`)
        }
      },

      /**
       * Remover producto del carrito
       */
      removeItem: (id) => {
        const item = get().items.find((i) => i.id === id)
        if (item) {
          console.log(`🗑️ Eliminado del carrito: ${item.nombre}`)
        }

        set({ 
          items: get().items.filter((item) => item.id !== id) 
        })
      },

      /**
       * Actualizar cantidad de un producto
       * Incluye validaciones de stock
       */
      updateQuantity: (id, cantidad) => {
        if (cantidad < 1) {
          console.warn('⚠️ La cantidad debe ser al menos 1. Usa removeItem para eliminar.')
          return
        }

        const items = get().items
        const item = items.find((i) => i.id === id)

        if (!item) {
          console.warn(`⚠️ Producto ID ${id} no encontrado en el carrito`)
          return
        }

        // Validar stock disponible
        if (cantidad > item.stock) {
          console.warn(
            `⚠️ Stock insuficiente para ${item.nombre}. ` +
            `Solicitado: ${cantidad}, Disponible: ${item.stock}`
          )
          return
        }

        set({
          items: items.map((item) =>
            item.id === id ? { ...item, cantidad } : item
          ),
        })

        console.log(`✏️ Cantidad actualizada: ${item.nombre} → ${cantidad}`)
      },

      /**
       * Limpiar todo el carrito
       */
      clearCart: () => {
        const count = get().items.length
        set({ items: [] })
        console.log(`🧹 Carrito limpiado (${count} items)`)
      },

      /**
       * Calcular subtotal (sin impuesto)
       */
      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.precio * item.cantidad,
          0
        )
      },

      /**
       * Calcular impuesto (IVA 19%)
       */
      getImpuesto: () => {
        const subtotal = get().getSubtotal()
        return subtotal * 0.19
      },

      /**
       * Calcular total (subtotal + impuesto)
       */
      getTotal: () => {
        const subtotal = get().getSubtotal()
        const impuesto = get().getImpuesto()
        return subtotal + impuesto
      },

      /**
       * Obtener cantidad total de items (suma de cantidades)
       */
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.cantidad, 0)
      },

      /**
       * Obtener un item específico por ID
       */
      getItem: (id) => {
        return get().items.find((item) => item.id === id)
      },

      /**
       * Verificar si el carrito tiene items
       */
      hasItems: () => {
        return get().items.length > 0
      },
    }),
    {
      name: 'agroshop-cart-storage', // Nombre en localStorage
      storage: createJSONStorage(() => localStorage), // Usar localStorage
      
      // Particionar el estado (solo persistir items)
      partialize: (state) => ({ 
        items: state.items 
      }),

      // Logging para debugging (solo en desarrollo)
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('💾 Carrito recuperado del localStorage:', state.items.length, 'items')
        }
      },
    }
  )
)
