import { z } from 'zod'

/**
 * Schema para abrir una sesión de caja
 */
export const openCashSessionSchema = z.object({
  caja_id: z.number().int().positive(),
  fondo_inicial: z.number().min(0, 'El fondo inicial no puede ser negativo'),
  observaciones_apertura: z.string().max(500).optional(),
})

/**
 * Schema para cerrar una sesión de caja
 */
export const closeCashSessionSchema = z.object({
  efectivo_contado: z.number().min(0),
  observaciones_cierre: z.string().max(500).optional(),
  
  // Detalle del conteo físico
  billetes_100000: z.number().int().min(0).default(0),
  billetes_50000: z.number().int().min(0).default(0),
  billetes_20000: z.number().int().min(0).default(0),
  billetes_10000: z.number().int().min(0).default(0),
  billetes_5000: z.number().int().min(0).default(0),
  billetes_2000: z.number().int().min(0).default(0),
  billetes_1000: z.number().int().min(0).default(0),
  
  monedas_1000: z.number().int().min(0).default(0),
  monedas_500: z.number().int().min(0).default(0),
  monedas_200: z.number().int().min(0).default(0),
  monedas_100: z.number().int().min(0).default(0),
  monedas_50: z.number().int().min(0).default(0),
})

/**
 * Tipos derivados
 */
export type OpenCashSessionData = z.infer<typeof openCashSessionSchema>
export type CloseCashSessionData = z.infer<typeof closeCashSessionSchema>
