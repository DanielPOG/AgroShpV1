import { z } from 'zod'

/**
 * Schemas de validación para Productos
 * 
 * Mapea la tabla: productos
 * Campos: id, codigo, nombre, descripcion, categoria_id, unidad_productiva_id, 
 *         tipo_medida, unidad, precio_unitario, precio_mayorista, stock_actual, 
 *         stock_minimo, stock_maximo, es_perecedero, dias_vencimiento, imagen_url,
 *         activo, proveedor_id, es_produccion_propia, created_at, updated_at
 */

// =====================================================
// ENUMS
// =====================================================

export const TIPO_MEDIDA = {
  UNIDAD: 'unidad',
  PESO: 'peso',
  VOLUMEN: 'volumen',
  LOTE: 'lote',
} as const

export const tipoMedidaSchema = z.enum([
  TIPO_MEDIDA.UNIDAD,
  TIPO_MEDIDA.PESO,
  TIPO_MEDIDA.VOLUMEN,
  TIPO_MEDIDA.LOTE,
])

// =====================================================
// CREAR PRODUCTO
// =====================================================

// Base schema sin validaciones complejas
const baseProductSchema = z.object({
  // Información básica
  codigo: z
    .string({ required_error: 'El código es requerido' })
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(50, 'El código no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'El código solo puede contener letras mayúsculas, números y guiones')
    .trim(),
  
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .trim(),
  
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  // Categorización
  categoria_id: z
    .number({ required_error: 'La categoría es requerida' })
    .int()
    .positive('Debe seleccionar una categoría válida'),
  
  unidad_productiva_id: z
    .number({ required_error: 'La unidad productiva es requerida' })
    .int()
    .positive('Debe seleccionar una unidad productiva válida'),
  
  // Medida
  tipo_medida: tipoMedidaSchema,
  
  unidad: z
    .string({ required_error: 'La unidad de medida es requerida' })
    .min(1, 'La unidad de medida no puede estar vacía')
    .max(20, 'La unidad no puede exceder 20 caracteres')
    .trim(),
  
  // Precios
  precio_unitario: z
    .number({ required_error: 'El precio unitario es requerido' })
    .positive('El precio debe ser mayor a 0')
    .max(999999999.99, 'El precio es demasiado alto')
    .multipleOf(0.01, 'El precio solo puede tener 2 decimales'),
  
  precio_mayorista: z
    .number()
    .positive('El precio mayorista debe ser mayor a 0')
    .max(999999999.99, 'El precio es demasiado alto')
    .multipleOf(0.01, 'El precio solo puede tener 2 decimales')
    .optional()
    .nullable(),
  
  // Stock
  stock_inicial: z
    .number()
    .min(0, 'El stock inicial no puede ser negativo')
    .max(999999999.99, 'El stock es demasiado alto')
    .multipleOf(0.01, 'El stock solo puede tener 2 decimales')
    .optional()
    .nullable(),
  
  stock_minimo: z
    .number()
    .min(0, 'El stock mínimo no puede ser negativo')
    .max(999999999.99, 'El stock es demasiado alto')
    .multipleOf(0.01, 'El stock solo puede tener 2 decimales')
    .default(0),
  
  stock_maximo: z
    .number()
    .positive('El stock máximo debe ser mayor a 0')
    .max(999999999.99, 'El stock es demasiado alto')
    .multipleOf(0.01, 'El stock solo puede tener 2 decimales')
    .optional()
    .nullable(),
  
  // Perecedero
  es_perecedero: z
    .boolean()
    .default(false),
  
  dias_vencimiento: z
    .number()
    .int()
    .positive('Los días de vencimiento deben ser mayores a 0')
    .max(3650, 'Los días de vencimiento no pueden exceder 10 años')
    .optional()
    .nullable(),
  
  // Imagen
  imagen_url: z
    .string()
    .max(500, 'La URL es demasiado larga')
    .refine(
      (val) => {
        if (!val) return true // Opcional
        // Acepta URLs completas o rutas relativas
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/')
      },
      'La imagen debe ser una URL válida o una ruta relativa (ej: /productos/imagen.jpg)'
    )
    .optional()
    .nullable(),
  
  // Proveedor
  proveedor_id: z
    .number()
    .int()
    .positive('Debe seleccionar un proveedor válido')
    .optional()
    .nullable(),
  
  es_produccion_propia: z
    .boolean()
    .default(true),
  
  activo: z
    .boolean()
    .default(true),
  
  // Usuario que crea el producto (para historial)
  usuario_id: z
    .number()
    .int()
    .positive()
    .optional(),
})

// Schema completo para crear con validaciones
export const createProductSchema = baseProductSchema
  .refine(
    (data) => {
      // Si es perecedero, debe tener días de vencimiento
      if (data.es_perecedero && !data.dias_vencimiento) {
        return false
      }
      return true
    },
    {
      message: 'Los productos perecederos deben tener días de vencimiento',
      path: ['dias_vencimiento'],
    }
  )
  .refine(
    (data) => {
      // El precio mayorista debe ser menor al precio unitario (descuento por volumen)
      if (data.precio_mayorista && data.precio_mayorista >= data.precio_unitario) {
        return false
      }
      return true
    },
    {
      message: 'El precio mayorista debe ser menor al precio unitario (descuento por volumen)',
      path: ['precio_mayorista'],
    }
  )
  .refine(
    (data) => {
      // El stock máximo debe ser mayor que el stock mínimo (si existe)
      if (data.stock_maximo && data.stock_maximo <= data.stock_minimo) {
        return false
      }
      return true
    },
    {
      message: 'El stock máximo debe ser mayor que el stock mínimo',
      path: ['stock_maximo'],
    }
  )
  .refine(
    (data) => {
      // Si NO es producción propia, debe tener proveedor
      if (data.es_produccion_propia === false && !data.proveedor_id) {
        return false
      }
      return true
    },
    {
      message: 'Los productos de proveedor externo deben tener un proveedor asignado',
      path: ['proveedor_id'],
    }
  )

// =====================================================
// ACTUALIZAR PRODUCTO
// =====================================================

export const updateProductSchema = baseProductSchema
  .partial()
  .extend({
    // El código no se debe poder cambiar después de crear
    codigo: z.string().optional(),
  })
  .refine(
    (data) => {
      // Si se actualiza es_perecedero a true, debe tener días de vencimiento
      if (data.es_perecedero === true && !data.dias_vencimiento) {
        return false
      }
      return true
    },
    {
      message: 'Los productos perecederos deben tener días de vencimiento',
      path: ['dias_vencimiento'],
    }
  )
  .refine(
    (data) => {
      // Validar precios si ambos están presentes (mayorista debe ser menor)
      if (
        data.precio_mayorista !== undefined &&
        data.precio_unitario !== undefined &&
        data.precio_mayorista >= data.precio_unitario
      ) {
        return false
      }
      return true
    },
    {
      message: 'El precio mayorista debe ser menor al precio unitario (descuento por volumen)',
      path: ['precio_mayorista'],
    }
  )
  .refine(
    (data) => {
      // Si se actualiza a NO producción propia, debe tener proveedor
      if (data.es_produccion_propia === false && !data.proveedor_id) {
        return false
      }
      return true
    },
    {
      message: 'Los productos de proveedor externo deben tener un proveedor asignado',
      path: ['proveedor_id'],
    }
  )

// =====================================================
// AJUSTAR STOCK
// =====================================================

export const adjustStockSchema = z.object({
  producto_id: z
    .number({ required_error: 'El ID del producto es requerido' })
    .int()
    .positive(),
  
  tipo_movimiento: z.enum(['entrada', 'salida', 'ajuste'], {
    required_error: 'El tipo de movimiento es requerido',
    invalid_type_error: 'Tipo de movimiento inválido',
  }),
  
  cantidad: z
    .number({ required_error: 'La cantidad es requerida' })
    .positive('La cantidad debe ser mayor a 0')
    .multipleOf(0.01, 'La cantidad solo puede tener 2 decimales'),
  
  motivo: z
    .string({ required_error: 'El motivo es requerido' })
    .min(5, 'El motivo debe tener al menos 5 caracteres')
    .max(500, 'El motivo no puede exceder 500 caracteres')
    .trim(),
  
  usuario_id: z
    .number({ required_error: 'El ID del usuario es requerido' })
    .int()
    .positive(),
})

// =====================================================
// FILTROS DE PRODUCTOS
// =====================================================

export const productFiltersSchema = z.object({
  // Búsqueda
  search: z.string().trim().optional(),
  
  // Filtros por categoría y unidad
  categoria_id: z.coerce.number().int().positive().optional(),
  unidad_productiva_id: z.coerce.number().int().positive().optional(),
  proveedor_id: z.coerce.number().int().positive().optional(),
  
  // Filtros por tipo
  tipo_medida: tipoMedidaSchema.nullable().optional(),
  es_perecedero: z.coerce.boolean().optional(),
  es_produccion_propia: z.coerce.boolean().optional(),
  
  // Filtros por estado
  activo: z.coerce.boolean().optional(),
  
  // Filtros por stock
  stock_status: z.enum(['bajo', 'agotado', 'normal', 'alto']).nullable().optional(),
  stock_min: z.coerce.number().min(0).optional(),
  stock_max: z.coerce.number().min(0).optional(),
  
  // Filtros por precio
  precio_min: z.coerce.number().positive().optional(),
  precio_max: z.coerce.number().positive().optional(),
  
  // Paginación
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  
  // Ordenamiento
  sortBy: z
    .enum([
      'nombre_asc',
      'nombre_desc',
      'precio_asc',
      'precio_desc',
      'stock_asc',
      'stock_desc',
      'fecha_creacion',
    ])
    .nullable()
    .default('nombre_asc'),
})

// =====================================================
// TYPES
// =====================================================

export type TipoMedida = z.infer<typeof tipoMedidaSchema>
export type CreateProductData = z.infer<typeof createProductSchema>
export type UpdateProductData = z.infer<typeof updateProductSchema>
export type AdjustStockData = z.infer<typeof adjustStockSchema>
export type ProductFilters = z.infer<typeof productFiltersSchema>

// =====================================================
// HELPERS
// =====================================================

/**
 * Determina si un producto tiene stock bajo
 */
export function hasLowStock(stockActual: number, stockMinimo: number): boolean {
  return stockActual > 0 && stockActual <= stockMinimo
}

/**
 * Determina si un producto está agotado
 */
export function isOutOfStock(stockActual: number): boolean {
  return stockActual === 0
}

/**
 * Obtiene el estado del producto basado en su stock
 */
export function getProductStatus(
  stockActual: number,
  stockMinimo: number
): 'disponible' | 'bajo-stock' | 'agotado' {
  if (stockActual === 0) return 'agotado'
  if (stockActual <= stockMinimo) return 'bajo-stock'
  return 'disponible'
}

/**
 * Valida que haya stock suficiente para una operación
 */
export function validateStockAvailable(
  stockActual: number,
  cantidadRequerida: number
): { valid: boolean; message?: string } {
  if (cantidadRequerida <= 0) {
    return { valid: false, message: 'La cantidad debe ser mayor a 0' }
  }
  
  if (stockActual < cantidadRequerida) {
    return {
      valid: false,
      message: `Stock insuficiente. Disponible: ${stockActual}, Requerido: ${cantidadRequerida}`,
    }
  }
  
  return { valid: true }
}

/**
 * Unidades de medida comunes por tipo
 */
export const UNIDADES_POR_TIPO = {
  [TIPO_MEDIDA.UNIDAD]: ['und', 'docena', 'par', 'caja'],
  [TIPO_MEDIDA.PESO]: ['kg', 'g', 'lb', 'ton'],
  [TIPO_MEDIDA.VOLUMEN]: ['L', 'ml', 'gal'],
  [TIPO_MEDIDA.LOTE]: ['lote', 'paquete', 'bulto'],
} as const
