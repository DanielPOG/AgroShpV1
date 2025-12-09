import { z } from 'zod'

/**
 * Schema para crear un lote de producto
 */
export const createLoteSchema = z
  .object({
    producto_id: z.number().int().positive({
      message: 'El producto es requerido',
    }),
    codigo_lote: z
      .string()
      .min(5, 'El código debe tener al menos 5 caracteres')
      .max(50, 'El código no puede exceder 50 caracteres')
      .regex(/^[A-Z0-9-]+$/, 'Solo se permiten letras mayúsculas, números y guiones')
      .trim(),
    cantidad: z
      .number()
      .positive('La cantidad debe ser mayor a 0')
      .refine((val) => val > 0, {
        message: 'La cantidad debe ser positiva',
      }),
    fecha_produccion: z.coerce.date({
      required_error: 'La fecha de producción es requerida',
      invalid_type_error: 'Fecha de producción inválida',
    }),
    fecha_vencimiento: z.coerce
      .date({
        invalid_type_error: 'Fecha de vencimiento inválida',
      })
      .optional()
      .nullable(),
    unidad_productiva_id: z.number().int().positive({
      message: 'La unidad productiva es requerida',
    }),
    estado: z
      .enum(['disponible', 'vencido', 'retirado'], {
        required_error: 'El estado es requerido',
        invalid_type_error: 'Estado inválido',
      })
      .default('disponible'),
    usuario_id: z.number().int().positive().optional(), // Se agrega automáticamente en el backend
  })
  .refine(
    (data) => {
      // Si hay fecha de vencimiento, debe ser posterior a la fecha de producción
      if (data.fecha_vencimiento) {
        return data.fecha_vencimiento > data.fecha_produccion
      }
      return true
    },
    {
      message: 'La fecha de vencimiento debe ser posterior a la fecha de producción',
      path: ['fecha_vencimiento'],
    }
  )

/**
 * Schema para actualizar un lote
 * Solo se permite actualizar estado y cantidad
 */
export const updateLoteSchema = z.object({
  estado: z
    .enum(['disponible', 'vencido', 'retirado'], {
      invalid_type_error: 'Estado inválido',
    })
    .optional(),
  cantidad: z
    .number()
    .min(0, 'La cantidad no puede ser negativa')
    .optional(),
  usuario_id: z.number().int().positive().optional(), // Para registrar quién hizo el cambio
})

/**
 * Schema para filtros de búsqueda de lotes
 */
export const loteFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  producto_id: z.number().int().positive().optional(),
  unidad_productiva_id: z.number().int().positive().optional(),
  estado: z.enum(['disponible', 'vencido', 'retirado']).nullable().optional(),
  dias_vencimiento: z.number().int().positive().optional(), // Próximos a vencer en X días
  search: z.string().trim().optional(), // Búsqueda por código de lote
})

/**
 * Tipos TypeScript inferidos de los schemas
 */
export type CreateLoteData = z.infer<typeof createLoteSchema>
export type UpdateLoteData = z.infer<typeof updateLoteSchema>
export type LoteFilters = z.infer<typeof loteFiltersSchema>
