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
 * Schema para desglose de efectivo (billetes y monedas)
 */
export const desgloseEfectivoSchema = z.object({
  // Billetes colombianos
  billetes_100000: z.number().int().min(0).default(0),
  billetes_50000: z.number().int().min(0).default(0),
  billetes_20000: z.number().int().min(0).default(0),
  billetes_10000: z.number().int().min(0).default(0),
  billetes_5000: z.number().int().min(0).default(0),
  billetes_2000: z.number().int().min(0).default(0),
  billetes_1000: z.number().int().min(0).default(0),
  
  // Monedas colombianas
  monedas_1000: z.number().int().min(0).default(0),
  monedas_500: z.number().int().min(0).default(0),
  monedas_200: z.number().int().min(0).default(0),
  monedas_100: z.number().int().min(0).default(0),
  monedas_50: z.number().int().min(0).default(0),
  
  // Total calculado
  total_contado: z.number().min(0),
})

export type DesgloseEfectivo = z.infer<typeof desgloseEfectivoSchema>

/**
 * Helper para calcular el total del desglose
 */
export function calcularTotalDesglose(desglose: Partial<DesgloseEfectivo>): number {
  return (
    (desglose.billetes_100000 || 0) * 100000 +
    (desglose.billetes_50000 || 0) * 50000 +
    (desglose.billetes_20000 || 0) * 20000 +
    (desglose.billetes_10000 || 0) * 10000 +
    (desglose.billetes_5000 || 0) * 5000 +
    (desglose.billetes_2000 || 0) * 2000 +
    (desglose.billetes_1000 || 0) * 1000 +
    (desglose.monedas_1000 || 0) * 1000 +
    (desglose.monedas_500 || 0) * 500 +
    (desglose.monedas_200 || 0) * 200 +
    (desglose.monedas_100 || 0) * 100 +
    (desglose.monedas_50 || 0) * 50
  )
}

/**
 * Schema para crear un turno (iniciar turno)
 */
export const iniciarTurnoSchema = z.object({
  sesion_caja_id: z.number().int().positive({
    message: "Sesión de caja requerida"
  }),
  
  cajero_id: z.number().int().positive({
    message: "Cajero requerido"
  }),
  
  // Efectivo con el que inicia el turno (opcional, se calcula automáticamente para inicio_jornada)
  efectivo_inicial: z.number().min(0, {
    message: "El efectivo inicial no puede ser negativo"
  }).optional(),
  
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
  
  // Turno anterior (si es cambio de turno)
  turno_anterior_id: z.number().int().positive().optional().nullable(),
  
  // Supervisor que autoriza (si es necesario)
  autorizado_por: z.number().int().positive().optional().nullable(),
})
.refine(
  (data) => {
    // Cambio de turno requiere turno anterior
    if (data.tipo_relevo === "cambio_turno" && !data.turno_anterior_id) {
      return false
    }
    return true
  },
  {
    message: "El cambio de turno requiere especificar el turno anterior",
    path: ["turno_anterior_id"],
  }
)
.refine(
  (data) => {
    // Emergencia requiere autorización
    if (data.tipo_relevo === "emergencia" && !data.autorizado_por) {
      return false
    }
    return true
  },
  {
    message: "El relevo de emergencia requiere autorización de un supervisor",
    path: ["autorizado_por"],
  }
)

export type IniciarTurno = z.infer<typeof iniciarTurnoSchema>

/**
 * Schema para cerrar un turno
 */
export const cerrarTurnoSchema = z.object({
  turno_id: z.number().int().positive(),
  
  // Efectivo al finalizar el turno (contado físicamente)
  efectivo_final: z.number().min(0, {
    message: "El efectivo final no puede ser negativo"
  }),
  
  // Desglose detallado del efectivo contado
  desglose_efectivo: desgloseEfectivoSchema.optional().nullable(),
  
  // Observaciones del cierre
  observaciones_cierre: z.string().max(500).optional().nullable(),
  
  // Supervisor que autoriza el cierre (si es necesario)
  autorizado_por: z.number().int().positive().optional().nullable(),
})
.refine(
  (data) => {
    // Validar que el desglose coincida con el efectivo final
    if (data.desglose_efectivo) {
      const totalDesglose = calcularTotalDesglose(data.desglose_efectivo)
      // Permitir diferencia de máximo 0.50 por redondeo
      const diferencia = Math.abs(totalDesglose - data.efectivo_final)
      return diferencia <= 0.50
    }
    return true
  },
  {
    message: "El desglose de efectivo no coincide con el efectivo final contado",
    path: ["desglose_efectivo"],
  }
)

export type CerrarTurno = z.infer<typeof cerrarTurnoSchema>

/**
 * Schema para consultar turno activo
 */
export const getTurnoActivoSchema = z.object({
  sesion_caja_id: z.number().int().positive(),
  cajero_id: z.number().int().positive().optional(),
})

export type GetTurnoActivo = z.infer<typeof getTurnoActivoSchema>

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
 * Helper para calcular el efectivo esperado al final del turno
 */
export function calcularEfectivoEsperadoTurno(
  efectivoInicial: number,
  ventasEfectivo: number,
  retiros: number,
  gastos: number
): number {
  return efectivoInicial + ventasEfectivo - retiros - gastos
}

/**
 * Helper para calcular diferencia del turno (faltante/sobrante)
 */
export function calcularDiferenciaTurno(
  efectivoEsperado: number,
  efectivoContado: number
): number {
  return efectivoContado - efectivoEsperado
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

/**
 * Schema para resumen de turno
 */
export const resumenTurnoSchema = z.object({
  turno_id: z.number(),
  cajero_nombre: z.string(),
  fecha_inicio: z.date(),
  fecha_fin: z.date().nullable(),
  duracion_horas: z.number(),
  efectivo_inicial: z.number(),
  efectivo_final: z.number().nullable(),
  total_ventas: z.number(),
  total_retiros: z.number(),
  total_gastos: z.number(),
  efectivo_esperado: z.number(),
  diferencia: z.number().nullable(),
  estado: z.enum(["activo", "finalizado", "suspendido"]),
})

export type ResumenTurno = z.infer<typeof resumenTurnoSchema>
