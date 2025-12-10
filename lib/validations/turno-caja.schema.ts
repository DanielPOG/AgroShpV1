import { z } from "zod"

/**
 * Tipos de relevo de turno
 */
export const TIPOS_RELEVO = {
  INICIO_JORNADA: "inicio_jornada",      // Apertura de caja al inicio del día
  CAMBIO_TURNO: "cambio_turno",          // Relevo entre cajeros
  FIN_JORNADA: "fin_jornada",            // Cierre al final del día
  EMERGENCIA: "emergencia",               // Relevo de emergencia
} as const

export const TIPOS_RELEVO_LABELS = {
  inicio_jornada: "Inicio de Jornada",
  cambio_turno: "Cambio de Turno",
  fin_jornada: "Fin de Jornada",
  emergencia: "Relevo de Emergencia",
}

/**
 * Estados de un turno
 */
export const ESTADOS_TURNO = {
  ACTIVO: "activo",
  FINALIZADO: "finalizado",
  SUSPENDIDO: "suspendido",
} as const

/**
 * Schema para crear un turno
 */
export const turnoSchema = z.object({
  sesion_caja_id: z.number().int().positive({
    message: "Sesión de caja requerida"
  }),
  
  cajero_id: z.number().int().positive({
    message: "Cajero requerido"
  }),
  
  // Monto con el que inicia el turno
  monto_inicial_turno: z.number().min(0, {
    message: "El monto inicial no puede ser negativo"
  }),
  
  // Tipo de relevo
  tipo_relevo: z.enum([
    "inicio_jornada",
    "cambio_turno",
    "fin_jornada",
    "emergencia"
  ], {
    required_error: "Tipo de relevo requerido"
  }),
  
  // Observaciones del inicio del turno
  observaciones_inicio: z.string().max(500).optional().nullable(),
  
  // Supervisor que autoriza (si es necesario)
  autorizado_por: z.number().int().positive().optional().nullable(),
})

export type TurnoCreate = z.infer<typeof turnoSchema>

/**
 * Schema para finalizar un turno
 */
export const finalizarTurnoSchema = z.object({
  turno_id: z.number().int().positive(),
  
  // Monto al finalizar el turno
  monto_final_turno: z.number().min(0, {
    message: "El monto final no puede ser negativo"
  }),
  
  // Totales del turno
  total_ventas_turno: z.number().min(0),
  total_retiros_turno: z.number().min(0),
  total_gastos_turno: z.number().min(0),
  
  // Diferencia del turno
  diferencia_turno: z.number(),
  
  // Observaciones del cierre
  observaciones_cierre: z.string().max(500).optional().nullable(),
  
  // Próximo cajero (si hay relevo)
  proximo_cajero_id: z.number().int().positive().optional().nullable(),
})

export type FinalizarTurno = z.infer<typeof finalizarTurnoSchema>

/**
 * Schema para suspender un turno (pausa)
 */
export const suspenderTurnoSchema = z.object({
  turno_id: z.number().int().positive(),
  motivo: z.string().min(10).max(500, {
    message: "El motivo debe tener entre 10 y 500 caracteres"
  }),
  autorizado_por: z.number().int().positive({
    message: "Se requiere autorización de un supervisor"
  }),
})

export type SuspenderTurno = z.infer<typeof suspenderTurnoSchema>

/**
 * Schema para reanudar un turno suspendido
 */
export const reanudarTurnoSchema = z.object({
  turno_id: z.number().int().positive(),
  observaciones: z.string().max(500).optional().nullable(),
})

export type ReanudarTurno = z.infer<typeof reanudarTurnoSchema>

/**
 * Límite de horas para turno sin aprobación (8 horas)
 */
export const HORAS_MAXIMAS_TURNO_NORMAL = 8

/**
 * Helper para calcular el monto esperado al final del turno
 */
export function calcularMontoEsperadoTurno(
  montoInicial: number,
  ventas: number,
  retiros: number,
  gastos: number
): number {
  return montoInicial + ventas - retiros - gastos
}

/**
 * Helper para determinar si un turno requiere autorización
 */
export function requiereAutorizacionTurno(tipoRelevo: string): boolean {
  return tipoRelevo === TIPOS_RELEVO.EMERGENCIA
}

/**
 * Helper para calcular duración de turno en horas
 */
export function calcularDuracionTurno(
  fechaInicio: Date,
  fechaFin: Date
): number {
  const diff = fechaFin.getTime() - fechaInicio.getTime()
  return diff / (1000 * 60 * 60) // Convertir a horas
}

/**
 * Helper para validar si un turno excede tiempo permitido
 */
export function excedeTiempoPermitido(duracionHoras: number): boolean {
  return duracionHoras > HORAS_MAXIMAS_TURNO_NORMAL
}

/**
 * Schema para estadísticas de turno
 */
export const estadisticasTurnoSchema = z.object({
  total_turnos: z.number().int(),
  turnos_activos: z.number().int(),
  turnos_finalizados: z.number().int(),
  duracion_promedio: z.number(),
  diferencia_promedio: z.number(),
})

export type EstadisticasTurno = z.infer<typeof estadisticasTurnoSchema>
