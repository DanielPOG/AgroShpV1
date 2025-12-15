import { z } from "zod"

/**
 * Schema de validación para retiros de caja
 * Estados: pendiente, autorizado, rechazado, completado
 */
export const retiroCajaSchema = z.object({
  sesion_caja_id: z.number().int().positive({
    message: "Sesión de caja requerida"
  }),
  turno_caja_id: z.number().int().positive({
    message: "Turno de caja requerido"
  }).optional(),
  monto: z.number().positive({
    message: "El monto debe ser mayor a 0"
  }).max(50000000, {
    message: "Monto máximo excedido (50 millones)"
  }),
  motivo: z.string().min(10, {
    message: "El motivo debe tener al menos 10 caracteres"
  }).max(200, {
    message: "Motivo muy largo (máximo 200 caracteres)"
  }),
  destino_fondos: z.string().min(5, {
    message: "Especifica el destino de los fondos"
  }).max(200, {
    message: "Destino muy largo (máximo 200 caracteres)"
  }).optional(),
  observaciones: z.string().max(500, {
    message: "Observaciones muy largas (máximo 500 caracteres)"
  }).optional(),
  solicitado_por: z.number().int().positive({
    message: "Usuario requerido"
  }),
})

export const autorizarRetiroSchema = z.object({
  retiro_id: z.number().int().positive(),
  autorizado_por: z.number().int().positive(),
  estado: z.enum(["autorizado", "rechazado"], {
    required_error: "Estado requerido"
  }),
  observaciones: z.string().max(500).optional(),
})

export const completarRetiroSchema = z.object({
  retiro_id: z.number().int().positive(),
  recibo_url: z.string().url({
    message: "URL de recibo inválida"
  }).optional(),
})

// Tipos TypeScript derivados
export type RetiroCajaCreate = z.infer<typeof retiroCajaSchema>
export type AutorizarRetiro = z.infer<typeof autorizarRetiroSchema>
export type CompletarRetiro = z.infer<typeof completarRetiroSchema>

// Constantes
export const ESTADOS_RETIRO = {
  PENDIENTE: "pendiente",
  AUTORIZADO: "autorizado",
  RECHAZADO: "rechazado",
  COMPLETADO: "completado",
} as const

// Montos que requieren autorización adicional
export const MONTO_REQUIERE_DOBLE_AUTORIZACION = 5000000 // $5.000.000 COP
