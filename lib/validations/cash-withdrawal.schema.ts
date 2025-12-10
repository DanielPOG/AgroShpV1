import { z } from 'zod'

/**
 * Schema para registrar un retiro de efectivo
 */
export const cashWithdrawalSchema = z.object({
  monto: z.number().positive('El monto debe ser mayor a cero'),
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
  requiere_autorizacion: z.boolean().default(true),
})

/**
 * Schema para autorizar un retiro
 */
export const authorizeCashWithdrawalSchema = z.object({
  autorizado: z.boolean(),
  observaciones_autorizacion: z.string().max(500).optional(),
})

/**
 * Tipos derivados
 */
export type CashWithdrawalData = z.infer<typeof cashWithdrawalSchema>
export type AuthorizeCashWithdrawalData = z.infer<typeof authorizeCashWithdrawalSchema>
