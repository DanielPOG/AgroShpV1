import { z } from "zod"

/**
 * Schema de validación para movimientos de caja adicionales
 * Tipos: ingreso_adicional, egreso_operativo, venta, retiro_caja, gasto_operativo
 */
export const movimientoCajaSchema = z.object({
  sesion_caja_id: z.number().int().positive({
    message: "Sesión de caja requerida"
  }),
  turno_caja_id: z.number().int().positive({
    message: "Turno de caja requerido"
  }).optional(),
  tipo_movimiento: z.enum([
    "ingreso_adicional", 
    "egreso_operativo", 
    "venta", 
    "retiro_caja", 
    "gasto_operativo"
  ], {
    required_error: "Tipo de movimiento requerido",
    invalid_type_error: "Tipo de movimiento inválido"
  }),
  metodo_pago: z.enum(["efectivo", "nequi", "tarjeta", "transferencia"], {
    required_error: "Método de pago requerido"
  }),
  monto: z.number().positive({
    message: "El monto debe ser mayor a 0"
  }).max(100000000, {
    message: "Monto máximo excedido"
  }),
  descripcion: z.string().min(5, {
    message: "Descripción debe tener al menos 5 caracteres"
  }).max(500, {
    message: "Descripción muy larga (máximo 500 caracteres)"
  }),
  usuario_id: z.number().int().positive({
    message: "Usuario requerido"
  }),
  requiere_autorizacion: z.boolean().optional().default(false),
  autorizado_por: z.number().int().positive().optional().nullable(),
})

export const autorizarMovimientoSchema = z.object({
  movimiento_id: z.number().int().positive(),
  autorizado_por: z.number().int().positive(),
  observaciones: z.string().optional(),
})

// Tipos TypeScript derivados
export type MovimientoCajaCreate = z.infer<typeof movimientoCajaSchema>
export type AutorizarMovimiento = z.infer<typeof autorizarMovimientoSchema>

// Constantes
export const TIPOS_MOVIMIENTO = {
  INGRESO_ADICIONAL: "ingreso_adicional",
  EGRESO_OPERATIVO: "egreso_operativo",
  VENTA: "venta",
  RETIRO_CAJA: "retiro_caja",
  GASTO_OPERATIVO: "gasto_operativo",
} as const

export const METODOS_PAGO = {
  EFECTIVO: "efectivo",
  NEQUI: "nequi",
  TARJETA: "tarjeta",
  TRANSFERENCIA: "transferencia",
} as const

// Montos que requieren autorización
export const MONTO_REQUIERE_AUTORIZACION = 100000 // $100.000 COP
