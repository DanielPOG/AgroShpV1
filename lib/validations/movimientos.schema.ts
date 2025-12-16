/**
 * @fileoverview Esquemas de validación Zod para movimientos entre unidades
 * @description Validaciones completas para transferencias de productos
 */

import { z } from 'zod'

/**
 * Schema para un detalle de movimiento
 */
export const detalleMovimientoSchema = z.object({
  producto_id: z.number({
    required_error: 'El ID del producto es requerido',
    invalid_type_error: 'El ID del producto debe ser un número'
  }).int().positive(),
  
  lote_id: z.number({
    required_error: 'El ID del lote es requerido',
    invalid_type_error: 'El ID del lote debe ser un número'
  }).int().positive(),
  
  cantidad: z.number({
    required_error: 'La cantidad es requerida',
    invalid_type_error: 'La cantidad debe ser un número'
  }).positive('La cantidad debe ser mayor a 0')
    .refine((val) => val > 0, {
      message: 'La cantidad debe ser mayor a 0'
    }),
  
  unidad: z.string({
    required_error: 'La unidad de medida es requerida'
  }).min(1, 'La unidad de medida no puede estar vacía')
    .max(20, 'La unidad de medida es muy larga')
})

/**
 * Schema para crear un movimiento
 */
export const crearMovimientoSchema = z.object({
  unidad_origen_id: z.number({
    required_error: 'La unidad de origen es requerida',
    invalid_type_error: 'El ID de la unidad de origen debe ser un número'
  }).int().positive(),
  
  unidad_destino_id: z.number({
    required_error: 'La unidad de destino es requerida',
    invalid_type_error: 'El ID de la unidad de destino debe ser un número'
  }).int().positive(),
  
  usuario_id: z.number({
    required_error: 'El ID del usuario es requerido',
    invalid_type_error: 'El ID del usuario debe ser un número'
  }).int().positive().optional(), // Opcional porque se puede tomar de la sesión
  
  motivo: z.string()
    .max(500, 'El motivo es muy largo')
    .optional(),
  
  observaciones: z.string()
    .max(1000, 'Las observaciones son muy largas')
    .optional(),
  
  detalles: z.array(detalleMovimientoSchema)
    .min(1, 'Debe incluir al menos un producto en el movimiento')
    .max(100, 'No se pueden transferir más de 100 productos diferentes a la vez')
}).refine(
  (data) => data.unidad_origen_id !== data.unidad_destino_id,
  {
    message: 'La unidad de origen y destino no pueden ser la misma',
    path: ['unidad_destino_id']
  }
)

/**
 * Schema para filtros de búsqueda de movimientos
 */
export const filtrosMovimientosSchema = z.object({
  page: z.coerce.number()
    .int()
    .positive()
    .default(1)
    .optional(),
  
  limit: z.coerce.number()
    .int()
    .positive()
    .max(100, 'El límite máximo es 100')
    .default(50)
    .optional(),
  
  unidad_origen_id: z.coerce.number()
    .int()
    .positive()
    .optional(),
  
  unidad_destino_id: z.coerce.number()
    .int()
    .positive()
    .optional(),
  
  estado: z.enum(['completado', 'pendiente', 'cancelado'])
    .optional(),
  
  fecha_desde: z.coerce.date().optional(),
  
  fecha_hasta: z.coerce.date().optional()
}).refine(
  (data) => {
    if (data.fecha_desde && data.fecha_hasta) {
      return data.fecha_desde <= data.fecha_hasta
    }
    return true
  },
  {
    message: 'La fecha desde no puede ser posterior a la fecha hasta',
    path: ['fecha_hasta']
  }
)

/**
 * Schema para validar ID de movimiento
 */
export const movimientoIdSchema = z.object({
  id: z.coerce.number({
    required_error: 'El ID del movimiento es requerido',
    invalid_type_error: 'El ID debe ser un número'
  }).int().positive()
})

/**
 * Schema para validar ID de unidad productiva
 */
export const unidadProductivaIdSchema = z.object({
  id: z.coerce.number({
    required_error: 'El ID de la unidad productiva es requerido',
    invalid_type_error: 'El ID debe ser un número'
  }).int().positive()
})

/**
 * Schema para verificar disponibilidad de lote
 */
export const verificarDisponibilidadSchema = z.object({
  lote_id: z.number({
    required_error: 'El ID del lote es requerido'
  }).int().positive(),
  
  cantidad: z.number({
    required_error: 'La cantidad es requerida'
  }).positive('La cantidad debe ser mayor a 0')
})

/**
 * Tipos TypeScript inferidos de los schemas
 */
export type DetalleMovimientoInput = z.infer<typeof detalleMovimientoSchema>
export type CrearMovimientoInput = z.infer<typeof crearMovimientoSchema>
export type FiltrosMovimientosInput = z.infer<typeof filtrosMovimientosSchema>
export type MovimientoIdInput = z.infer<typeof movimientoIdSchema>
export type UnidadProductivaIdInput = z.infer<typeof unidadProductivaIdSchema>
export type VerificarDisponibilidadInput = z.infer<typeof verificarDisponibilidadSchema>
