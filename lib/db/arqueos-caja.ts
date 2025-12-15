import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { 
  ArqueoCreate, 
  DIFERENCIA_PERMITIDA_SIN_APROBACION,
  calcularTotalDesglose,
  DesgloseDenominacion
} from "@/lib/validations/arqueo-caja.schema"

/**
 * Obtener arqueos de caja con filtros
 */
export async function getArqueos(filters?: {
  sesionId?: number
  conDiferencia?: boolean
  pendientesAprobacion?: boolean
  limit?: number
}) {
  const where: Prisma.arqueos_cajaWhereInput = {}

  if (filters?.sesionId) {
    where.sesion_caja_id = filters.sesionId
  }

  if (filters?.conDiferencia) {
    where.diferencia = {
      not: 0
    }
  }

  if (filters?.pendientesAprobacion) {
    // NOTA: Sistema de aprobación no implementado en BD
    // Se filtra solo por diferencia alta
    where.OR = [
      { diferencia: { gt: DIFERENCIA_PERMITIDA_SIN_APROBACION } },
      { diferencia: { lt: -DIFERENCIA_PERMITIDA_SIN_APROBACION } }
    ]
  }

  const arqueos = await prisma.arqueos_caja.findMany({
    where,
    include: {
      realizador: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        }
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          estado: true,
          fecha_apertura: true,
          fecha_cierre: true,
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
      fecha_arqueo: 'desc',
    },
    take: filters?.limit || 100,
  })

  return arqueos
}

/**
 * Obtener un arqueo por ID
 */
export async function getArqueoById(id: number) {
  const arqueo = await prisma.arqueos_caja.findUnique({
    where: { id },
    include: {
      realizador: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        }
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          estado: true,
          fecha_apertura: true,
          fecha_cierre: true,
          total_retiros: true,
          total_gastos: true,
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

  return arqueo
}

/**
 * Crear un arqueo de caja
 */
export async function createArqueo(data: ArqueoCreate) {
  // Verificar que la sesión existe y está abierta
  const sesion = await prisma.sesiones_caja.findUnique({
    where: { id: data.sesion_caja_id },
    select: {
      id: true,
      estado: true,
      codigo_sesion: true,
      fondo_inicial: true,
      total_retiros: true,
      total_gastos: true,
    }
  })

  if (!sesion) {
    throw new Error('Sesión de caja no encontrada')
  }

  if (sesion.estado !== 'abierta') {
    throw new Error('La sesión de caja no está abierta')
  }

  // Verificar que no exista un arqueo previo para esta sesión
  const arqueoExistente = await prisma.arqueos_caja.findFirst({
    where: { sesion_caja_id: data.sesion_caja_id }
  })

  if (arqueoExistente) {
    throw new Error('Ya existe un arqueo para esta sesión')
  }

  // Calcular diferencia
  const diferencia = data.total_contado - data.total_esperado

  // Determinar si requiere aprobación
  const requiereAprobacion = Math.abs(diferencia) > DIFERENCIA_PERMITIDA_SIN_APROBACION

  // Convertir array de desglose a campos individuales
  const desglose: any = {}
  if (data.desglose_billetes_monedas) {
    data.desglose_billetes_monedas.forEach((item) => {
      const denom = item.denominacion
      if (denom === 100000) desglose.billetes_100000 = item.cantidad
      else if (denom === 50000) desglose.billetes_50000 = item.cantidad
      else if (denom === 20000) desglose.billetes_20000 = item.cantidad
      else if (denom === 10000) desglose.billetes_10000 = item.cantidad
      else if (denom === 5000) desglose.billetes_5000 = item.cantidad
      else if (denom === 2000) desglose.billetes_2000 = item.cantidad
      else if (denom === 1000) desglose.billetes_1000 = item.cantidad
      else if (denom === 500) desglose.monedas_500 = item.cantidad
      else if (denom === 200) desglose.monedas_200 = item.cantidad
      else if (denom === 100) desglose.monedas_100 = item.cantidad
      else if (denom === 50) desglose.monedas_50 = item.cantidad
    })
  }

  // Crear el arqueo
  const arqueo = await prisma.arqueos_caja.create({
    data: {
      sesion_caja_id: data.sesion_caja_id,
      tipo_arqueo: "cierre",
      total_contado: data.total_contado,
      total_esperado: data.total_esperado,
      diferencia: diferencia,
      billetes_100000: desglose.billetes_100000 || 0,
      billetes_50000: desglose.billetes_50000 || 0,
      billetes_20000: desglose.billetes_20000 || 0,
      billetes_10000: desglose.billetes_10000 || 0,
      billetes_5000: desglose.billetes_5000 || 0,
      billetes_2000: desglose.billetes_2000 || 0,
      billetes_1000: desglose.billetes_1000 || 0,
      monedas_1000: desglose.monedas_1000 || 0,
      monedas_500: desglose.monedas_500 || 0,
      monedas_200: desglose.monedas_200 || 0,
      monedas_100: desglose.monedas_100 || 0,
      monedas_50: desglose.monedas_50 || 0,
      observaciones: data.observaciones || null,
      realizado_por: data.realizado_por,
    },
    include: {
      realizador: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    }
  })

  // Cerrar la sesión automáticamente si diferencia es aceptable
  if (Math.abs(diferencia) <= DIFERENCIA_PERMITIDA_SIN_APROBACION) {
    await prisma.sesiones_caja.update({
      where: { id: data.sesion_caja_id },
      data: {
        estado: 'cerrada',
        fecha_cierre: new Date(),
        efectivo_contado: data.total_contado,
        diferencia: diferencia,
      }
    })

    console.log(`✅ Sesión ${sesion.codigo_sesion} cerrada automáticamente (diferencia dentro del límite)`)
  } else {
    console.log(`⚠️ Arqueo requiere aprobación (diferencia: $${diferencia})`)
  }

  console.log(`✅ Arqueo creado: ID ${arqueo.id}, Diferencia: $${diferencia}`)

  return arqueo
}

/**
 * Aprobar un arqueo con diferencia
 * TODO: Sistema de aprobación no implementado en BD actual
 * Requiere agregar al schema: aprobado_por, aprobador
 */
export async function aprobarArqueo(
  arqueoId: number,
  aprobadoPorId: number,
  observacionesAprobacion?: string
) {
  throw new Error('Sistema de aprobación no implementado en BD actual')
  /* TODO: Implementar en schema:
     - aprobado_por: Int?
     - Relación aprobador con usuarios
     - monto_final en sesiones_caja
  */
}

/**
 * Eliminar un arqueo (solo si sesión sigue abierta)
 */
export async function deleteArqueo(id: number, usuarioId: number, isAdmin: boolean) {
  const arqueo = await prisma.arqueos_caja.findUnique({
    where: { id },
    include: {
      sesion_caja: {
        select: { estado: true }
      }
    }
  })

  if (!arqueo) {
    throw new Error('Arqueo no encontrado')
  }

  // Solo el creador o Admin puede eliminar
  if (!isAdmin && arqueo.realizado_por !== usuarioId) {
    throw new Error('No tienes permisos para eliminar este arqueo')
  }

  if (arqueo.sesion_caja.estado === 'cerrada') {
    throw new Error('No se puede eliminar un arqueo de una sesión cerrada')
  }

  await prisma.arqueos_caja.delete({
    where: { id }
  })

  console.log(`🗑️ Arqueo ${id} eliminado`)

  return { success: true }
}

/**
 * Calcular el total esperado de una sesión
 */
export async function calcularTotalEsperado(sesionId: number): Promise<number> {
  const sesion = await prisma.sesiones_caja.findUnique({
    where: { id: sesionId },
    select: {
      fondo_inicial: true,
      estado: true,
    }
  })

  if (!sesion) {
    throw new Error('Sesión no encontrada')
  }

  // Buscar el último arqueo de esta sesión
  const ultimoArqueo = await prisma.arqueos_caja.findFirst({
    where: { sesion_caja_id: sesionId },
    orderBy: { fecha_arqueo: 'desc' },
    select: {
      total_contado: true,
      fecha_arqueo: true,
    }
  })

  // Si hay arqueo previo, partir desde el efectivo contado en ese arqueo
  // Si no, partir desde el fondo inicial
  const efectivoBase = ultimoArqueo 
    ? Number(ultimoArqueo.total_contado)
    : Number(sesion.fondo_inicial)
  
  const fechaDesde = ultimoArqueo?.fecha_arqueo

  // 1. Ventas en efectivo desde último arqueo
  // Primero obtenemos los IDs de los turnos de esta sesión
  const turnosDeSesion = await prisma.turnos_caja.findMany({
    where: { sesion_caja_id: sesionId },
    select: { id: true }
  })
  
  const turnoIds = turnosDeSesion.map(t => t.id)

  // Ahora obtenemos las ventas que pertenecen a estos turnos
  const ventasQuery: any = {
    turno_caja_id: { in: turnoIds },
    estado: { not: 'cancelada' }
  }

  if (fechaDesde) {
    ventasQuery.fecha_venta = { gt: fechaDesde }
  }

  const ventas = await prisma.ventas.findMany({
    where: ventasQuery,
    select: {
      id: true,
      pagos_venta: {
        where: {
          metodo_pago: {
            nombre: 'efectivo'
          }
        },
        select: {
          monto: true
        }
      }
    }
  })

  // Sumar los montos de pagos en efectivo
  const totalVentas = ventas.reduce((sum, venta) => {
    const pagoEfectivo = venta.pagos_venta.reduce((s, p) => s + Number(p.monto), 0)
    return sum + pagoEfectivo
  }, 0)

  // 2. Retiros desde último arqueo
  const retiros = await prisma.retiros_caja.aggregate({
    where: {
      sesion_caja_id: sesionId,
      estado: 'aprobado',
      ...(fechaDesde && { fecha_solicitud: { gt: fechaDesde } })
    },
    _sum: { monto: true }
  })

  // 3. Gastos en efectivo desde último arqueo
  const gastos = await prisma.gastos_caja.aggregate({
    where: {
      sesion_caja_id: sesionId,
      metodo_pago: 'efectivo',
      ...(fechaDesde && { fecha_gasto: { gt: fechaDesde } })
    },
    _sum: { monto: true }
  })

  // 4. Movimientos de caja en efectivo desde último arqueo
  const movimientosIngreso = await prisma.movimientos_caja.aggregate({
    where: {
      sesion_caja_id: sesionId,
      tipo_movimiento: 'ingreso_adicional',
      metodo_pago: 'efectivo',
      venta_id: null,
      ...(fechaDesde && { fecha_movimiento: { gt: fechaDesde } })
    },
    _sum: { monto: true }
  })

  const movimientosEgreso = await prisma.movimientos_caja.aggregate({
    where: {
      sesion_caja_id: sesionId,
      tipo_movimiento: 'egreso_operativo',
      metodo_pago: 'efectivo',
      venta_id: null,
      ...(fechaDesde && { fecha_movimiento: { gt: fechaDesde } })
    },
    _sum: { monto: true }
  })

  const totalRetiros = Number(retiros._sum.monto || 0)
  const totalGastos = Number(gastos._sum.monto || 0)
  const totalIngresos = Number(movimientosIngreso._sum.monto || 0)
  const totalEgresos = Number(movimientosEgreso._sum.monto || 0)

  // Total esperado = Base + Ventas + Ingresos - Retiros - Gastos - Egresos
  const totalEsperado = efectivoBase + totalVentas + totalIngresos - totalRetiros - totalGastos - totalEgresos

  console.log(`💰 [calcularTotalEsperado] Sesión ${sesionId}:`, {
    efectivoBase,
    ultimoArqueo: !!ultimoArqueo,
    totalVentas,
    totalIngresos,
    totalRetiros,
    totalGastos,
    totalEgresos,
    totalEsperado,
  })

  return totalEsperado
}

/**
 * Obtener estadísticas de arqueos
 */
export async function getEstadisticasArqueos(filters?: {
  fechaDesde?: Date
  fechaHasta?: Date
}) {
  const where: Prisma.arqueos_cajaWhereInput = {}

  if (filters?.fechaDesde || filters?.fechaHasta) {
    where.fecha_arqueo = {}
    if (filters.fechaDesde) {
      where.fecha_arqueo.gte = filters.fechaDesde
    }
    if (filters.fechaHasta) {
      where.fecha_arqueo.lte = filters.fechaHasta
    }
  }

  const resultado = await prisma.arqueos_caja.aggregate({
    where,
    _count: true,
    _sum: {
      diferencia: true,
    },
    _avg: {
      diferencia: true,
    },
  })

  // Contar arqueos con diferencia
  const conDiferencia = await prisma.arqueos_caja.count({
    where: {
      ...where,
      diferencia: {
        not: 0
      }
    }
  })

  // Contar arqueos pendientes de aprobación (diferencias altas)
  const pendientesAprobacion = await prisma.arqueos_caja.count({
    where: {
      ...where,
      OR: [
        { diferencia: { gt: DIFERENCIA_PERMITIDA_SIN_APROBACION } },
        { diferencia: { lt: -DIFERENCIA_PERMITIDA_SIN_APROBACION } }
      ]
    }
  })

  return {
    total: resultado._count,
    sumaDiferencias: Number(resultado._sum.diferencia || 0),
    promedioDiferencia: Number(resultado._avg.diferencia || 0),
    conDiferencia,
    pendientesAprobacion,
  }
}

/**
 * Obtener arqueos pendientes de aprobación
 */
export async function getArqueosPendientesAprobacion() {
  return getArqueos({
    pendientesAprobacion: true,
    limit: 50,
  })
}

/**
 * Obtener historial detallado de un arqueo con todos los turnos y operaciones
 * Retorna la sesión, todos los turnos y las operaciones detalladas de cada turno
 */
export async function getArqueoHistoryDetail(arqueoId: number) {
  // Obtener el arqueo con la sesión
  const arqueo = await prisma.arqueos_caja.findUnique({
    where: { id: arqueoId },
    include: {
      sesion_caja: {
        include: {
          cajero: {
            select: {
              nombre: true,
              apellido: true,
              email: true,
            }
          },
          caja: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
            }
          }
        }
      },
      realizador: {
        select: {
          nombre: true,
          apellido: true,
          email: true,
        }
      }
    }
  })

  if (!arqueo) {
    throw new Error('Arqueo no encontrado')
  }

  // Obtener todos los turnos de la sesión en orden cronológico
  const turnos = await prisma.turnos_caja.findMany({
    where: {
      sesion_caja_id: arqueo.sesion_caja_id
    },
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
          email: true,
        }
      }
    },
    orderBy: {
      fecha_inicio: 'asc'
    }
  })

  // Para cada turno, obtener todas las operaciones
  const turnosConOperaciones = await Promise.all(
    turnos.map(async (turno) => {
      // Ventas del turno
      const ventas = await prisma.ventas.findMany({
        where: {
          turno_caja_id: turno.id
        },
        select: {
          id: true,
          codigo_venta: true,
          fecha_venta: true,
          subtotal: true,
          descuento: true,
          total: true,
          estado: true,
          pagos_venta: {
            select: {
              id: true,
              monto: true,
              metodo_pago: {
                select: {
                  nombre: true
                }
              }
            }
          }
        },
        orderBy: {
          fecha_venta: 'asc'
        }
      })

      // Retiros del turno
      const retiros = await prisma.retiros_caja.findMany({
        where: {
          turno_caja_id: turno.id
        },
        select: {
          id: true,
          fecha_solicitud: true,
          monto: true,
          motivo: true,
          estado: true,
          autorizador: {
            select: {
              nombre: true,
              apellido: true,
            }
          },
        },
        orderBy: {
          fecha_solicitud: 'asc'
        }
      })

      // Gastos del turno
      const gastos = await prisma.gastos_caja.findMany({
        where: {
          turno_caja_id: turno.id
        },
        select: {
          id: true,
          fecha_gasto: true,
          monto: true,
          metodo_pago: true,
          categoria_gasto: true,
          descripcion: true,
        },
        orderBy: {
          fecha_gasto: 'asc'
        }
      })

      // Movimientos extra del turno
      const movimientos = await prisma.movimientos_caja.findMany({
        where: {
          turno_caja_id: turno.id,
          venta_id: null, // Solo movimientos extra, no ventas
        },
        select: {
          id: true,
          fecha_movimiento: true,
          tipo_movimiento: true,
          metodo_pago: true,
          monto: true,
          descripcion: true,
        },
        orderBy: {
          fecha_movimiento: 'asc'
        }
      })

      // Calcular totales del turno por método de pago
      const totalesPorMetodo = {
        efectivo: { ventas: 0, retiros: 0, gastos: 0, ingresos: 0, egresos: 0 },
        nequi: { ventas: 0, gastos: 0, ingresos: 0, egresos: 0 },
        tarjeta: { ventas: 0, gastos: 0, ingresos: 0, egresos: 0 },
        transferencia: { ventas: 0, gastos: 0, ingresos: 0, egresos: 0 },
      }

      // Sumar ventas por método
      ventas.forEach(venta => {
        if (venta.estado !== 'cancelada') {
          // Cada venta puede tener múltiples pagos
          venta.pagos_venta.forEach(pago => {
            const nombreMetodo = pago.metodo_pago.nombre.toLowerCase()
            const metodo = nombreMetodo as keyof typeof totalesPorMetodo
            if (totalesPorMetodo[metodo]) {
              totalesPorMetodo[metodo].ventas += Number(pago.monto)
            }
          })
        }
      })

      // Sumar retiros (siempre efectivo)
      retiros.forEach(retiro => {
        totalesPorMetodo.efectivo.retiros += Number(retiro.monto)
      })

      // Sumar gastos por método
      gastos.forEach(gasto => {
        const metodo = gasto.metodo_pago as keyof typeof totalesPorMetodo
        if (totalesPorMetodo[metodo]) {
          totalesPorMetodo[metodo].gastos += Number(gasto.monto)
        }
      })

      // Sumar movimientos por método
      movimientos.forEach(mov => {
        const metodo = mov.metodo_pago as keyof typeof totalesPorMetodo
        if (totalesPorMetodo[metodo]) {
          if (mov.tipo_movimiento === 'ingreso_operativo') {
            totalesPorMetodo[metodo].ingresos += Number(mov.monto)
          } else if (mov.tipo_movimiento === 'egreso_operativo') {
            totalesPorMetodo[metodo].egresos += Number(mov.monto)
          }
        }
      })

      // Calcular saldo final por método
      const saldosPorMetodo = Object.entries(totalesPorMetodo).reduce((acc, [metodo, totales]) => {
        const saldo = totales.ventas + totales.ingresos - totales.gastos - totales.egresos - 
                     (metodo === 'efectivo' ? totales.retiros : 0)
        return {
          ...acc,
          [metodo]: saldo
        }
      }, {} as Record<string, number>)

      return {
        turno: {
          id: turno.id,
          fecha_inicio: turno.fecha_inicio,
          fecha_fin: turno.fecha_fin,
          tipo_relevo: turno.tipo_relevo,
          efectivo_inicial: Number(turno.efectivo_inicial),
          efectivo_final: turno.efectivo_final ? Number(turno.efectivo_final) : null,
          cajero: turno.cajero,
          observaciones: turno.observaciones,
        },
        operaciones: {
          ventas,
          retiros,
          gastos,
          movimientos,
        },
        totales: {
          porMetodo: totalesPorMetodo,
          saldos: saldosPorMetodo,
          cantidades: {
            ventas: ventas.length,
            retiros: retiros.length,
            gastos: gastos.length,
            movimientos: movimientos.length,
          }
        }
      }
    })
  )

  // Calcular totales generales de la sesión
  const totalesGenerales = turnosConOperaciones.reduce((acc, turno) => {
    Object.entries(turno.totales.porMetodo).forEach(([metodo, totales]) => {
      if (!acc[metodo]) {
        acc[metodo] = { ventas: 0, retiros: 0, gastos: 0, ingresos: 0, egresos: 0 }
      }
      acc[metodo].ventas += totales.ventas
      acc[metodo].gastos += totales.gastos
      acc[metodo].ingresos += totales.ingresos
      acc[metodo].egresos += totales.egresos
      if (metodo === 'efectivo') {
        acc[metodo].retiros += totales.retiros
      }
    })
    return acc
  }, {} as Record<string, any>)

  // Usar los valores originales del arqueo tal como fueron guardados
  // NO recalcular porque ya están en la base de datos
  return {
    arqueo: {
      id: arqueo.id,
      tipo_arqueo: arqueo.tipo_arqueo,
      fecha_arqueo: arqueo.fecha_arqueo,
      total_contado: Number(arqueo.total_contado),
      total_esperado: Number(arqueo.total_esperado),
      diferencia: Number(arqueo.diferencia),
      observaciones: arqueo.observaciones,
      realizador: arqueo.realizador,
    },
    sesion: {
      id: arqueo.sesion_caja.id,
      fecha_apertura: arqueo.sesion_caja.fecha_apertura,
      fecha_cierre: arqueo.sesion_caja.fecha_cierre,
      fondo_inicial: Number(arqueo.sesion_caja.fondo_inicial),
      responsable: arqueo.sesion_caja.cajero,
      tienda: arqueo.sesion_caja.caja,
    },
    turnos: turnosConOperaciones,
    totalesGenerales: {
      porMetodo: totalesGenerales,
      cantidades: {
        turnos: turnos.length,
        ventas: turnosConOperaciones.reduce((sum, t) => sum + t.totales.cantidades.ventas, 0),
        retiros: turnosConOperaciones.reduce((sum, t) => sum + t.totales.cantidades.retiros, 0),
        gastos: turnosConOperaciones.reduce((sum, t) => sum + t.totales.cantidades.gastos, 0),
        movimientos: turnosConOperaciones.reduce((sum, t) => sum + t.totales.cantidades.movimientos, 0),
      }
    }
  }
}
