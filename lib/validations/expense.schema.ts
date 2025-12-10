import { z } from 'zod'

/**
 * Schema para registrar un gasto menor de caja chica
 */
export const expenseSchema = z.object({
  concepto: z.string().min(5, 'El concepto debe tener al menos 5 caracteres').max(200),
  monto: z.number().positive('El monto debe ser mayor a cero'),
  categoria: z.enum([
    'papeleria',
    'limpieza',
    'transporte',
    'alimentacion',
    'servicios',
    'mantenimiento',
    'otros'
  ]),
  comprobante_numero: z.string().max(50).optional(),
  observaciones: z.string().max(500).optional(),
})

/**
 * Tipos derivados
 */
export type ExpenseData = z.infer<typeof expenseSchema>
