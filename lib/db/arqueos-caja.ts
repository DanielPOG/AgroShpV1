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
      total_ventas_efectivo: true,
      total_retiros: true,
      total_gastos: true,
    }
  })

  if (!sesion) {
    throw new Error('Sesión no encontrada')
  }

  const montoInicial = Number(sesion.fondo_inicial)
  const totalVentas = Number(sesion.total_ventas_efectivo)
  const totalRetiros = Number(sesion.total_retiros)
  const totalGastos = Number(sesion.total_gastos)

  // Total esperado = Monto Inicial + Ventas Efectivo - Retiros - Gastos
  const totalEsperado = montoInicial + totalVentas - totalRetiros - totalGastos

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
