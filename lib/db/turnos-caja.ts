import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { 
  TurnoCreate, 
  FinalizarTurno,
  SuspenderTurno,
  calcularMontoEsperadoTurno,
  calcularDuracionTurno,
} from "@/lib/validations/turno-caja.schema"

/**
 * Obtener turnos de caja con filtros
 */
export async function getTurnos(filters?: {
  sesionId?: number
  cajeroId?: number
  estado?: string
  activos?: boolean
  limit?: number
}) {
  const where: Prisma.turnos_cajaWhereInput = {}

  if (filters?.sesionId) {
    where.sesion_caja_id = filters.sesionId
  }

  if (filters?.cajeroId) {
    where.cajero_id = filters.cajeroId
  }

  if (filters?.estado) {
    where.estado = filters.estado
  }

  if (filters?.activos) {
    where.estado = "activo"
  }

  const turnos = await prisma.turnos_caja.findMany({
    where,
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        }
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          estado: true,
          fecha_apertura: true,
          caja: {
            select: {
              nombre: true,
              codigo: true,
            }
          }
        }
      },
    },
    orderBy: {
      fecha_inicio: 'desc',
    },
    take: filters?.limit || 100,
  })

  return turnos
}

/**
 * Obtener un turno por ID
 */
export async function getTurnoById(id: number) {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        }
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          estado: true,
          fecha_apertura: true,
          fecha_cierre: true,
          fondo_inicial: true,
          caja: {
            select: {
              nombre: true,
              codigo: true,
            }
          }
        }
      },
    },
  })

  return turno
}

/**
 * Obtener el turno activo de un cajero
 */
export async function getTurnoActivo(cajeroId: number) {
  const turno = await prisma.turnos_caja.findFirst({
    where: {
      cajero_id: cajeroId,
      estado: "activo",
    },
    include: {
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          estado: true,
          caja: {
            select: {
              nombre: true,
              codigo: true,
            }
          }
        }
      },
    },
    orderBy: {
      fecha_inicio: 'desc',
    },
  })

  return turno
}

/**
 * Crear un turno de caja
 */
export async function createTurno(data: TurnoCreate) {
  // Verificar que la sesión existe y está abierta
  const sesion = await prisma.sesiones_caja.findUnique({
    where: { id: data.sesion_caja_id },
    select: {
      id: true,
      estado: true,
      codigo_sesion: true,
    }
  })

  if (!sesion) {
    throw new Error('Sesión de caja no encontrada')
  }

  if (sesion.estado !== 'abierta') {
    throw new Error('La sesión de caja no está abierta')
  }

  // Verificar que el cajero no tiene otro turno activo
  const turnoActivoExistente = await getTurnoActivo(data.cajero_id)
  if (turnoActivoExistente) {
    throw new Error('El cajero ya tiene un turno activo')
  }

  // Crear el turno
  const turno = await prisma.turnos_caja.create({
    data: {
      sesion_caja_id: data.sesion_caja_id,
      cajero_id: data.cajero_id,
      caja_id: 1,
      monto_inicial: data.monto_inicial_turno,
      tipo_relevo: data.tipo_relevo,
      observaciones: data.observaciones_inicio || null,
      estado: "activo",
    },
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    }
  })

  console.log(`✅ Turno creado: ID ${turno.id}, Cajero: ${turno.cajero.nombre} ${turno.cajero.apellido}, Tipo: ${data.tipo_relevo}`)

  return turno
}

/**
 * Finalizar un turno de caja
 */
export async function finalizarTurno(data: FinalizarTurno) {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: data.turno_id },
    include: {
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          estado: true,
        }
      }
    }
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  if (turno.estado !== 'activo') {
    throw new Error('El turno no está activo')
  }

  // Calcular duración del turno
  const fechaFin = new Date()
  const duracionHoras = calcularDuracionTurno(new Date(turno.fecha_inicio), fechaFin)

  // Actualizar el turno
  const turnoFinalizado = await prisma.turnos_caja.update({
    where: { id: data.turno_id },
    data: {
      fecha_fin: fechaFin,
      monto_final: data.monto_final_turno,
      diferencia: data.diferencia_turno,
      duracion_minutos: Math.floor(duracionHoras * 60),
      observaciones: data.observaciones_cierre || null,
      estado: "finalizado",
    },
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
        }
      }
    }
  })

  console.log(`✅ Turno ${data.turno_id} finalizado. Duración: ${duracionHoras.toFixed(2)} horas, Diferencia: $${data.diferencia_turno}`)

  // Si hay próximo cajero, crear su turno automáticamente
  if (data.proximo_cajero_id) {
    const nuevoTurno = await createTurno({
      sesion_caja_id: turno.sesion_caja_id,
      cajero_id: data.proximo_cajero_id,
      monto_inicial_turno: data.monto_final_turno,
      tipo_relevo: "cambio_turno",
      observaciones_inicio: `Relevo desde turno ${data.turno_id}`,
      autorizado_por: null,
    })

    console.log(`✅ Nuevo turno creado automáticamente: ID ${nuevoTurno.id}`)
  }

  return turnoFinalizado
}

/**
 * Suspender un turno (pausa)
 */
export async function suspenderTurno(data: SuspenderTurno) {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: data.turno_id },
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  if (turno.estado !== 'activo') {
    throw new Error('Solo se pueden suspender turnos activos')
  }

  const turnoSuspendido = await prisma.turnos_caja.update({
    where: { id: data.turno_id },
    data: {
      estado: "suspendido",
      motivo_suspension: data.motivo,
      observaciones: `[SUSPENDIDO]: ${data.motivo}`,
    },
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
        }
      }
    }
  })

  console.log(`⏸️ Turno ${data.turno_id} suspendido`)

  return turnoSuspendido
}

/**
 * Reanudar un turno suspendido
 */
export async function reanudarTurno(turnoId: number, observaciones?: string) {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  if (turno.estado !== 'suspendido') {
    throw new Error('Solo se pueden reanudar turnos suspendidos')
  }

  const turnoReanudado = await prisma.turnos_caja.update({
    where: { id: turnoId },
    data: {
      estado: "activo",
      observaciones: observaciones 
        ? `${turno.observaciones || ''}\n\n[REANUDADO]: ${observaciones}`
        : turno.observaciones,
    },
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
        }
      }
    }
  })

  console.log(`▶️ Turno ${turnoId} reanudado`)

  return turnoReanudado
}

/**
 * Obtener totales de un turno específico
 */
export async function getTotalesTurno(turnoId: number) {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    select: {
      id: true,
      fecha_inicio: true,
      fecha_fin: true,
      monto_inicial: true,
      cajero_id: true,
      sesion_caja_id: true,
    }
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  const fechaInicio = new Date(turno.fecha_inicio)
  const fechaFin = turno.fecha_fin ? new Date(turno.fecha_fin) : new Date()

  // Obtener ventas del turno
  const ventas = await prisma.ventas.aggregate({
    where: {
      fecha_venta: {
        gte: fechaInicio,
        lte: fechaFin,
      }
    },
    _sum: {
      total: true,
    },
    _count: true,
  })

  // Obtener retiros del turno
  const retiros = await prisma.retiros_caja.aggregate({
    where: {
      sesion_caja_id: turno.sesion_caja_id,
      fecha_solicitud: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      estado: {
        in: ["autorizado", "completado"]
      }
    },
    _sum: {
      monto: true,
    },
    _count: true,
  })

  // Obtener gastos del turno
  const gastos = await prisma.gastos_caja.aggregate({
    where: {
      sesion_caja_id: turno.sesion_caja_id,
      fecha_gasto: {
        gte: fechaInicio,
        lte: fechaFin,
      }
    },
    _sum: {
      monto: true,
    },
    _count: true,
  })

  const totalVentas = Number(ventas._sum?.total || 0)
  const totalRetiros = Number(retiros._sum.monto || 0)
  const totalGastos = Number(gastos._sum.monto || 0)

  const montoEsperado = calcularMontoEsperadoTurno(
    Number(turno.monto_inicial),
    totalVentas,
    totalRetiros,
    totalGastos
  )

  return {
    total_ventas: totalVentas,
    cantidad_ventas: ventas._count,
    total_retiros: totalRetiros,
    cantidad_retiros: retiros._count,
    total_gastos: totalGastos,
    cantidad_gastos: gastos._count,
    monto_esperado: montoEsperado,
  }
}

/**
 * Obtener estadísticas de turnos
 */
export async function getEstadisticasTurnos(filters?: {
  sesionId?: number
  cajeroId?: number
  fechaDesde?: Date
  fechaHasta?: Date
}) {
  const where: Prisma.turnos_cajaWhereInput = {}

  if (filters?.sesionId) {
    where.sesion_caja_id = filters.sesionId
  }

  if (filters?.cajeroId) {
    where.cajero_id = filters.cajeroId
  }

  if (filters?.fechaDesde || filters?.fechaHasta) {
    where.fecha_inicio = {}
    if (filters.fechaDesde) {
      where.fecha_inicio.gte = filters.fechaDesde
    }
    if (filters.fechaHasta) {
      where.fecha_inicio.lte = filters.fechaHasta
    }
  }

  const resultado = await prisma.turnos_caja.aggregate({
    where,
    _count: true,
    _sum: {
      diferencia: true,
    },
    _avg: {
      diferencia: true,
    },
  })

  // Contar turnos por estado
  const activos = await prisma.turnos_caja.count({
    where: { ...where, estado: "activo" }
  })

  const finalizados = await prisma.turnos_caja.count({
    where: { ...where, estado: "finalizado" }
  })

  const suspendidos = await prisma.turnos_caja.count({
    where: { ...where, estado: "suspendido" }
  })

  return {
    total: resultado._count,
    activos,
    finalizados,
    suspendidos,
    suma_diferencias: Number(resultado._sum?.diferencia || 0),
    promedio_diferencia: Number(resultado._avg?.diferencia || 0),
  }
}

/**
 * Obtener turnos activos de una sesión
 */
export async function getTurnosActivos(sesionId?: number) {
  return getTurnos({
    sesionId,
    activos: true,
    limit: 50,
  })
}
