/**
 * 🚨 SISTEMA DE ALERTAS AUTOMÁTICAS PARA TURNOS
 * 
 * Monitorea condiciones críticas y genera alertas en tiempo real
 */

import { prisma } from '@/lib/prisma'

/**
 * Tipo de alerta
 */
export type TipoAlerta =
  | 'turno_largo' // Turno > 6 horas
  | 'diferencia_alta' // Diferencia > 5% o > $50,000
  | 'efectivo_alto' // Efectivo acumulado > $500,000
  | 'sin_ventas' // Sin ventas en última hora
  | 'turno_suspendido' // Turno suspendido sin reanudar

/**
 * Nivel de severidad
 */
export type NivelAlerta = 'info' | 'warning' | 'critical'

/**
 * Interfaz de alerta
 */
export interface AlertaTurno {
  tipo: TipoAlerta
  nivel: NivelAlerta
  titulo: string
  mensaje: string
  turno_id: number
  cajero_id: number
  fecha: Date
  datos_adicionales?: Record<string, any>
}

/**
 * Configuración de umbrales para alertas
 */
export const UMBRALES_ALERTAS = {
  // Turno largo: más de 6 horas (360 minutos)
  DURACION_MAXIMA_TURNO_MINUTOS: 360,
  
  // Diferencia alta: más de 5% o más de $50,000
  PORCENTAJE_DIFERENCIA_MAX: 5,
  MONTO_DIFERENCIA_MAX: 50000,
  
  // Efectivo alto: más de $500,000
  EFECTIVO_ACUMULADO_MAX: 500000,
  
  // Sin ventas: más de 60 minutos sin actividad
  MINUTOS_SIN_VENTAS: 60,
  
  // Turno suspendido: más de 30 minutos suspendido
  MINUTOS_SUSPENDIDO_MAX: 30,
} as const

/**
 * Validar si un turno tiene duración excesiva
 */
export async function validarDuracionTurno(turnoId: number): Promise<AlertaTurno | null> {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
    },
  })

  if (!turno || turno.estado !== 'activo') {
    return null
  }

  const duracionMinutos = Math.floor(
    (new Date().getTime() - turno.fecha_inicio.getTime()) / 60000
  )

  if (duracionMinutos > UMBRALES_ALERTAS.DURACION_MAXIMA_TURNO_MINUTOS) {
    const horasTranscurridas = (duracionMinutos / 60).toFixed(1)
    
    return {
      tipo: 'turno_largo',
      nivel: duracionMinutos > 480 ? 'critical' : 'warning', // Critical si > 8 horas
      titulo: '⏰ Turno Excesivamente Largo',
      mensaje: `El turno de ${turno.cajero.nombre} ${turno.cajero.apellido} lleva ${horasTranscurridas} horas activo. Considere realizar un relevo.`,
      turno_id: turno.id,
      cajero_id: turno.cajero_id,
      fecha: new Date(),
      datos_adicionales: {
        duracion_minutos: duracionMinutos,
        duracion_horas: parseFloat(horasTranscurridas),
        cajero: `${turno.cajero.nombre} ${turno.cajero.apellido}`,
      },
    }
  }

  return null
}

/**
 * Validar diferencia al cerrar turno
 */
export function validarDiferenciaCierre(
  efectivoEsperado: number,
  efectivoContado: number,
  turnoId: number,
  cajeroId: number
): AlertaTurno | null {
  const diferencia = Math.abs(efectivoContado - efectivoEsperado)
  const porcentajeDiferencia = (diferencia / efectivoEsperado) * 100

  // Verificar si excede umbrales
  const excedePorcentaje = porcentajeDiferencia > UMBRALES_ALERTAS.PORCENTAJE_DIFERENCIA_MAX
  const excedeMonto = diferencia > UMBRALES_ALERTAS.MONTO_DIFERENCIA_MAX

  if (excedePorcentaje || excedeMonto) {
    const esFaltante = efectivoContado < efectivoEsperado
    const tipoDescripcion = esFaltante ? 'faltante' : 'sobrante'
    
    return {
      tipo: 'diferencia_alta',
      nivel: diferencia > 100000 ? 'critical' : 'warning',
      titulo: `💰 Diferencia ${esFaltante ? '❌' : '✅'} Alta Detectada`,
      mensaje: `Diferencia de $${diferencia.toLocaleString('es-CO')} (${porcentajeDiferencia.toFixed(2)}%) al cerrar turno. ${esFaltante ? 'Falta' : 'Sobra'} efectivo respecto al esperado.`,
      turno_id: turnoId,
      cajero_id: cajeroId,
      fecha: new Date(),
      datos_adicionales: {
        efectivo_esperado: efectivoEsperado,
        efectivo_contado: efectivoContado,
        diferencia,
        porcentaje_diferencia: parseFloat(porcentajeDiferencia.toFixed(2)),
        tipo: tipoDescripcion,
      },
    }
  }

  return null
}

/**
 * Validar efectivo acumulado en turno
 */
export async function validarEfectivoAcumulado(turnoId: number): Promise<AlertaTurno | null> {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
    },
  })

  if (!turno || turno.estado !== 'activo') {
    return null
  }

  // Calcular efectivo acumulado
  const ventasEfectivo = await prisma.$queryRaw<[{ total: number }]>`
    SELECT COALESCE(SUM(pv.monto), 0) as total
    FROM pagos_venta pv
    INNER JOIN ventas v ON pv.venta_id = v.id
    INNER JOIN metodos_pago mp ON pv.metodo_pago_id = mp.id
    WHERE v.turno_caja_id = ${turnoId}
    AND LOWER(mp.nombre) LIKE '%efectivo%'
  `

  const efectivoActual = Number(turno.efectivo_inicial) + (ventasEfectivo[0]?.total || 0)

  if (efectivoActual > UMBRALES_ALERTAS.EFECTIVO_ACUMULADO_MAX) {
    return {
      tipo: 'efectivo_alto',
      nivel: efectivoActual > 1000000 ? 'critical' : 'warning',
      titulo: '💵 Efectivo Acumulado Alto',
      mensaje: `El turno de ${turno.cajero.nombre} ${turno.cajero.apellido} tiene $${efectivoActual.toLocaleString('es-CO')} en efectivo. Se recomienda realizar un retiro de seguridad.`,
      turno_id: turno.id,
      cajero_id: turno.cajero_id,
      fecha: new Date(),
      datos_adicionales: {
        efectivo_acumulado: efectivoActual,
        efectivo_inicial: Number(turno.efectivo_inicial),
        ventas_efectivo: ventasEfectivo[0]?.total || 0,
        cajero: `${turno.cajero.nombre} ${turno.cajero.apellido}`,
      },
    }
  }

  return null
}

/**
 * Validar inactividad en turno (sin ventas)
 */
export async function validarInactividadTurno(turnoId: number): Promise<AlertaTurno | null> {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
    },
  })

  if (!turno || turno.estado !== 'activo') {
    return null
  }

  // Obtener última venta
  const ultimaVenta = await prisma.ventas.findFirst({
    where: {
      turno_caja_id: turnoId,
    },
    orderBy: {
      fecha_venta: 'desc',
    },
    select: {
      fecha_venta: true,
    },
  })

  // Si no hay ventas, comparar con inicio del turno
  const fechaReferencia = ultimaVenta?.fecha_venta || turno.fecha_inicio
  const minutosSinVentas = Math.floor(
    (new Date().getTime() - fechaReferencia.getTime()) / 60000
  )

  if (minutosSinVentas > UMBRALES_ALERTAS.MINUTOS_SIN_VENTAS) {
    return {
      tipo: 'sin_ventas',
      nivel: 'info',
      titulo: '📊 Inactividad Detectada',
      mensaje: `El turno de ${turno.cajero.nombre} ${turno.cajero.apellido} no registra ventas desde hace ${minutosSinVentas} minutos.`,
      turno_id: turno.id,
      cajero_id: turno.cajero_id,
      fecha: new Date(),
      datos_adicionales: {
        minutos_sin_ventas: minutosSinVentas,
        ultima_venta: ultimaVenta?.fecha_venta || null,
        cajero: `${turno.cajero.nombre} ${turno.cajero.apellido}`,
      },
    }
  }

  return null
}

/**
 * Validar turno suspendido por mucho tiempo
 */
export async function validarTurnoSuspendido(turnoId: number): Promise<AlertaTurno | null> {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
    },
  })

  if (!turno || turno.estado !== 'suspendido') {
    return null
  }

  // Calcular tiempo suspendido (desde fecha_fin hasta ahora)
  if (!turno.fecha_fin) {
    return null
  }

  const minutosSuspendido = Math.floor(
    (new Date().getTime() - turno.fecha_fin.getTime()) / 60000
  )

  if (minutosSuspendido > UMBRALES_ALERTAS.MINUTOS_SUSPENDIDO_MAX) {
    return {
      tipo: 'turno_suspendido',
      nivel: minutosSuspendido > 120 ? 'warning' : 'info',
      titulo: '⏸️ Turno Suspendido',
      mensaje: `El turno de ${turno.cajero.nombre} ${turno.cajero.apellido} está suspendido desde hace ${minutosSuspendido} minutos. Motivo: ${turno.motivo_suspension || 'No especificado'}.`,
      turno_id: turno.id,
      cajero_id: turno.cajero_id,
      fecha: new Date(),
      datos_adicionales: {
        minutos_suspendido: minutosSuspendido,
        motivo_suspension: turno.motivo_suspension,
        cajero: `${turno.cajero.nombre} ${turno.cajero.apellido}`,
      },
    }
  }

  return null
}

/**
 * Obtener todas las alertas activas para un turno
 */
export async function getAlertasTurno(turnoId: number): Promise<AlertaTurno[]> {
  const alertas: AlertaTurno[] = []

  // Validar duración
  const alertaDuracion = await validarDuracionTurno(turnoId)
  if (alertaDuracion) alertas.push(alertaDuracion)

  // Validar efectivo acumulado
  const alertaEfectivo = await validarEfectivoAcumulado(turnoId)
  if (alertaEfectivo) alertas.push(alertaEfectivo)

  // Validar inactividad
  const alertaInactividad = await validarInactividadTurno(turnoId)
  if (alertaInactividad) alertas.push(alertaInactividad)

  // Validar turno suspendido
  const alertaSuspension = await validarTurnoSuspendido(turnoId)
  if (alertaSuspension) alertas.push(alertaSuspension)

  return alertas
}

/**
 * Obtener todas las alertas de todos los turnos activos de una sesión
 */
export async function getAlertasSesion(sesionId: number): Promise<AlertaTurno[]> {
  const turnosActivos = await prisma.turnos_caja.findMany({
    where: {
      sesion_caja_id: sesionId,
      estado: {
        in: ['activo', 'suspendido'],
      },
    },
    select: {
      id: true,
    },
  })

  const todasAlertas: AlertaTurno[] = []

  for (const turno of turnosActivos) {
    const alertas = await getAlertasTurno(turno.id)
    todasAlertas.push(...alertas)
  }

  return todasAlertas
}

/**
 * Guardar alerta en base de datos (notificaciones)
 */
export async function registrarAlerta(alerta: AlertaTurno): Promise<void> {
  try {
    await prisma.notificaciones.create({
      data: {
        tipo: alerta.tipo,
        titulo: alerta.titulo,
        mensaje: alerta.mensaje,
        prioridad: alerta.nivel === 'critical' ? 'alta' : alerta.nivel === 'warning' ? 'media' : 'normal',
        usuario_id: alerta.cajero_id,
        referencia_id: alerta.turno_id,
        referencia_tipo: 'turno_caja',
        leida: false,
      },
    })

    console.log(`🚨 [Alerta Registrada] ${alerta.tipo} para turno ${alerta.turno_id}`)
  } catch (error) {
    console.error('Error al registrar alerta:', error)
  }
}

/**
 * Monitorear y registrar alertas automáticamente
 * (Esta función se puede llamar desde un cron job o webhook)
 */
export async function monitorearAlertasAutomaticas(sesionId: number): Promise<AlertaTurno[]> {
  console.log(`🔍 [Monitor] Iniciando monitoreo de alertas para sesión ${sesionId}`)

  const alertas = await getAlertasSesion(sesionId)

  // Registrar alertas críticas y warnings en base de datos
  for (const alerta of alertas) {
    if (alerta.nivel === 'critical' || alerta.nivel === 'warning') {
      await registrarAlerta(alerta)
    }
  }

  if (alertas.length > 0) {
    console.log(`⚠️ [Monitor] ${alertas.length} alerta(s) detectada(s)`)
  } else {
    console.log(`✅ [Monitor] No hay alertas activas`)
  }

  return alertas
}
