import { z } from "zod"

/**
 * Schema de validación para gastos de caja
 * Categorías: insumos, servicios, mantenimiento, transporte, otros
 * FASE 3: Ahora incluye metodo_pago para distinguir gastos en efectivo
 */
export const gastoCajaSchema = z.object({
  sesion_caja_id: z.number().int().positive({
    message: "Sesión de caja requerida"
  }),
  monto: z.number().positive({
    message: "El monto debe ser mayor a 0"
  }).max(20000000, {
    message: "Monto máximo excedido (20 millones)"
  }),
  categoria_gasto: z.enum([
    "insumos",
    "servicios",
    "mantenimiento",
    "transporte",
    "nomina",
    "impuestos",
    "otros"
  ], {
    required_error: "Categoría de gasto requerida"
  }),
  descripcion: z.string().min(10, {
    message: "La descripción debe tener al menos 10 caracteres"
  }).max(500, {
    message: "Descripción muy larga (máximo 500 caracteres)"
  }),
  metodo_pago: z.enum(["efectivo", "nequi", "tarjeta", "transferencia"], {
    required_error: "Método de pago requerido"
  }).default("efectivo"),
  beneficiario: z.string().min(3, {
    message: "El beneficiario debe tener al menos 3 caracteres"
  }).max(200, {
    message: "Beneficiario muy largo (máximo 200 caracteres)"
  }).optional(),
  numero_factura: z.string().max(100, {
    message: "Número de factura muy largo"
  }).optional(),
  comprobante_url: z.string().url({
    message: "URL de comprobante inválida"
  }).optional(),
  observaciones: z.string().max(500, {
    message: "Observaciones muy largas (máximo 500 caracteres)"
  }).optional(),
  autorizado_por: z.number().int().positive().optional().nullable(),
})

// Tipos TypeScript derivados
export type GastoCajaCreate = z.infer<typeof gastoCajaSchema>

// Constantes
export const CATEGORIAS_GASTO = {
  INSUMOS: "insumos",
  SERVICIOS: "servicios",
  MANTENIMIENTO: "mantenimiento",
  TRANSPORTE: "transporte",
  NOMINA: "nomina",
  IMPUESTOS: "impuestos",
  OTROS: "otros",
} as const

export const CATEGORIAS_LABELS = {
  insumos: "Insumos y Materiales",
  servicios: "Servicios Públicos",
  mantenimiento: "Mantenimiento y Reparaciones",
  transporte: "Transporte y Logística",
  nomina: "Nómina y Pagos",
  impuestos: "Impuestos y Tasas",
  otros: "Otros Gastos",
}

// Montos que requieren autorización
export const MONTO_REQUIERE_AUTORIZACION_GASTO = 500000 // $500.000 COP
