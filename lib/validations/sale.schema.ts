import { z } from 'zod'

/**
 * Schema para un item de venta
 * Representa un producto en el carrito
 * ✨ NUEVO: Permite IDs negativos para productos ficticios
 */
export const saleItemSchema = z.object({
  producto_id: z.number().int({
    message: 'El ID del producto debe ser un número entero'
  }).refine(val => val !== 0, {
    message: 'El ID del producto no puede ser 0'
  }), // Permite positivos (inventario) y negativos (ficticios)
  lote_id: z.number().int().positive({
    message: 'El ID del lote debe ser un número positivo'
  }).optional(), // Opcional porque se asigna automáticamente con FIFO
  cantidad: z.number().positive({
    message: 'La cantidad debe ser mayor a 0'
  }),
  precio_unitario: z.number().positive({
    message: 'El precio unitario debe ser mayor a 0'
  }),
  descuento_porcentaje: z.number().min(0).max(100).optional(),
  observaciones: z.string().optional(),
})

/**
 * Schema para un método de pago
 * Una venta puede tener múltiples pagos (pago mixto)
 */
export const paymentMethodSchema = z.object({
  metodo_pago_id: z.number().int().positive({
    message: 'Debe seleccionar un método de pago válido'
  }),
  monto: z.number().positive({
    message: 'El monto debe ser mayor a 0'
  }),
  referencia: z.string().max(100).optional(),
})

/**
 * Schema para crear una venta completa
 * Incluye validaciones de negocio críticas
 */
export const createSaleSchema = z.object({
  // Items de la venta (obligatorio mínimo 1)
  items: z.array(saleItemSchema).min(1, {
    message: 'Debe agregar al menos un producto a la venta'
  }),
  
  // Métodos de pago (obligatorio mínimo 1)
  pagos: z.array(paymentMethodSchema).min(1, {
    message: 'Debe registrar al menos un método de pago'
  }),
  
  // Usuario y turno
  usuario_id: z.number().int().positive().optional(),
  turno_caja_id: z.number().int().positive().optional(),
  
  // Información del cliente (opcional)
  cliente_id: z.number().int().positive().optional(),
  cliente_nombre: z.string().max(150).optional(),
  cliente_email: z.string().email().max(150).optional(),
  cliente_telefono: z.string().max(20).optional(),
  
  // Descuento global (opcional)
  descuento_global: z.number().min(0).max(100).optional(),
  
  // Facturación (✨ NUEVO: se registra atómicamente)
  requiere_factura: z.boolean().default(false),
  factura_generada: z.boolean().default(false),
  
  // Observaciones
  observaciones: z.string().max(500).optional(),
}).refine(
  (data) => {
    // Validar que la suma de pagos sea suficiente
    const totalPagos = data.pagos.reduce((sum, pago) => sum + pago.monto, 0)
    const subtotalItems = data.items.reduce((sum, item) => {
      const descuento = item.descuento_porcentaje || 0
      const subtotal = item.cantidad * item.precio_unitario * (1 - descuento / 100)
      return sum + subtotal
    }, 0)
    
    // Aplicar descuento global si existe
    const descuentoGlobal = data.descuento_global || 0
    const subtotalConDescuento = subtotalItems * (1 - descuentoGlobal / 100)
    
    // Agregar IVA (19%)
    const impuesto = subtotalConDescuento * 0.19
    const total = subtotalConDescuento + impuesto
    
    // Permitir que el total de pagos sea mayor o igual al total de la venta
    // (permite cambio en pago mixto cuando el cliente da más efectivo del necesario)
    // Tolerancia de 1 peso por redondeos en caso de que sea menor
    return totalPagos >= total || Math.abs(totalPagos - total) <= 1
  },
  {
    message: 'La suma de los pagos debe ser mayor o igual al total de la venta',
    path: ['pagos']
  }
)

/**
 * Schema para filtros de consulta de ventas
 */
export const salesFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  fecha_desde: z.string().datetime().optional(),
  fecha_hasta: z.string().datetime().optional(),
  usuario_id: z.number().int().positive().optional(),
  cliente_id: z.number().int().positive().optional(),
  estado: z.enum(['completada', 'cancelada', 'pendiente']).optional(),
  metodo_pago: z.number().int().positive().optional(),
  search: z.string().optional(), // Buscar por código de venta o cliente
})

/**
 * Schema para anular/cancelar una venta
 */
export const cancelSaleSchema = z.object({
  motivo: z.string().min(10, {
    message: 'Debe especificar el motivo de la cancelación (mínimo 10 caracteres)'
  }).max(500),
  requiere_reintegro_stock: z.boolean().default(true),
})

/**
 * Tipos TypeScript derivados de los schemas
 */
export type SaleItemData = z.infer<typeof saleItemSchema>
export type PaymentMethodData = z.infer<typeof paymentMethodSchema>
export type CreateSaleData = z.infer<typeof createSaleSchema>
export type SalesFilters = z.infer<typeof salesFiltersSchema>
export type CancelSaleData = z.infer<typeof cancelSaleSchema>
