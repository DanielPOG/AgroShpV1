import { z } from "zod"

/**
 * Denominaciones de billetes y monedas en COP
 */
export const DENOMINACIONES = {
  // Billetes
  BILLETE_100000: 100000,
  BILLETE_50000: 50000,
  BILLETE_20000: 20000,
  BILLETE_10000: 10000,
  BILLETE_5000: 5000,
  BILLETE_2000: 2000,
  
  // Monedas
  MONEDA_1000: 1000,
  MONEDA_500: 500,
  MONEDA_200: 200,
  MONEDA_100: 100,
  MONEDA_50: 50,
} as const

export const DENOMINACIONES_LABELS = {
  100000: "$100.000",
  50000: "$50.000",
  20000: "$20.000",
  10000: "$10.000",
  5000: "$5.000",
  2000: "$2.000",
  1000: "$1.000",
  500: "$500",
  200: "$200",
  100: "$100",
  50: "$50",
}

/**
 * Schema para desglose de billetes y monedas
 */
export const desgloseDenominacionSchema = z.object({
  denominacion: z.number().int().positive(),
  cantidad: z.number().int().min(0, {
    message: "La cantidad no puede ser negativa"
  }),
  total: z.number().min(0),
})

export type DesgloseDenominacion = z.infer<typeof desgloseDenominacionSchema>

/**
 * Schema principal para crear un arqueo
 */
export const arqueoSchema = z.object({
  sesion_caja_id: z.number().int().positive({
    message: "Sesión de caja requerida"
  }),
  
  // Total contado físicamente
  total_contado: z.number().min(0, {
    message: "El total contado no puede ser negativo"
  }),
  
  // Total esperado (calculado del sistema)
  total_esperado: z.number().min(0, {
    message: "El total esperado no puede ser negativo"
  }),
  
  // Diferencia (puede ser positiva o negativa)
  diferencia: z.number(),
  
  // Desglose de billetes y monedas (JSON)
  desglose_billetes_monedas: z.array(desgloseDenominacionSchema).optional(),
  
  // Observaciones del arqueo
  observaciones: z.string().max(1000).optional().nullable(),
  
  // Usuario que realizó el arqueo
  realizado_por: z.number().int().positive(),
  
  // Usuario supervisor que aprobó (si hay diferencia)
  aprobado_por: z.number().int().positive().optional().nullable(),
})

export type ArqueoCreate = z.infer<typeof arqueoSchema>

/**
 * Schema para aprobar un arqueo con diferencia
 */
export const aprobarArqueoSchema = z.object({
  arqueo_id: z.number().int().positive(),
  aprobado_por: z.number().int().positive(),
  observaciones_aprobacion: z.string().min(10).max(500, {
    message: "Las observaciones deben tener entre 10 y 500 caracteres"
  }),
})

export type AprobarArqueo = z.infer<typeof aprobarArqueoSchema>

/**
 * Límite de diferencia que no requiere aprobación
 */
export const DIFERENCIA_PERMITIDA_SIN_APROBACION = 5000 // $5.000 COP

/**
 * Helper para calcular el total de un desglose
 */
export function calcularTotalDesglose(desglose: DesgloseDenominacion[]): number {
  return desglose.reduce((total, item) => {
    return total + (item.denominacion * item.cantidad)
  }, 0)
}

/**
 * Helper para validar que la diferencia está dentro del límite permitido
 */
export function requiereAprobacion(diferencia: number): boolean {
  return Math.abs(diferencia) > DIFERENCIA_PERMITIDA_SIN_APROBACION
}

/**
 * Helper para generar desglose inicial vacío
 */
export function generarDesgloseVacio(): DesgloseDenominacion[] {
  return Object.values(DENOMINACIONES).map(denom => ({
    denominacion: denom,
    cantidad: 0,
    total: 0,
  }))
}
