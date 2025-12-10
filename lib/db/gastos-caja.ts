import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { GastoCajaCreate, MONTO_REQUIERE_AUTORIZACION_GASTO } from "@/lib/validations/gasto-caja.schema"

/**
 * Obtener gastos de caja de una sesión
 */
export async function getGastosCaja(
  sesionId?: number,
  filters?: {
    categoria?: string
    limit?: number
  }
) {
  const where: Prisma.gastos_cajaWhereInput = {}

  if (sesionId) {
    where.sesion_caja_id = sesionId
  }

  if (filters?.categoria) {
    where.categoria_gasto = filters.categoria
  }

  const gastos = await prisma.gastos_caja.findMany({
    where,
    include: {
      autorizador: {
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
      fecha_gasto: 'desc',
    },
    take: filters?.limit || 100,
  })

  return gastos
}

/**
 * Obtener un gasto específico por ID
 */
export async function getGastoById(id: number) {
  const gasto = await prisma.gastos_caja.findUnique({
    where: { id },
    include: {
      autorizador: {
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

  return gasto
}

/**
 * Crear un gasto de caja
 */
export async function createGastoCaja(data: GastoCajaCreate & { autorizado_por?: number | null }) {
  // Verificar que la sesión esté abierta
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

  // Determinar si requiere autorización
  const requiereAutorizacion = data.monto >= MONTO_REQUIERE_AUTORIZACION_GASTO

  if (requiereAutorizacion && !data.autorizado_por) {
    throw new Error('Este gasto requiere autorización de un Supervisor/Admin')
  }

  // Crear gasto
  const gasto = await prisma.gastos_caja.create({
    data: {
      sesion_caja_id: data.sesion_caja_id,
      monto: data.monto,
      categoria_gasto: data.categoria_gasto,
      descripcion: data.descripcion,
      beneficiario: data.beneficiario || null,
      numero_factura: data.numero_factura || null,
      comprobante_url: data.comprobante_url || null,
      observaciones: data.observaciones || null,
      autorizado_por: data.autorizado_por || null,
    },
    include: {
      autorizador: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    }
  })

  // Actualizar totales de la sesión
  await prisma.sesiones_caja.update({
    where: { id: data.sesion_caja_id },
    data: {
      total_gastos: {
        increment: data.monto
      }
    }
  })

  console.log(`✅ Gasto de caja creado: ID ${gasto.id}, Categoría: ${data.categoria_gasto}, Monto: $${data.monto}`)

  return gasto
}

/**
 * Actualizar un gasto (solo comprobante y observaciones)
 */
export async function updateGastoCaja(
  id: number,
  data: {
    comprobante_url?: string
    observaciones?: string
  }
) {
  const gasto = await prisma.gastos_caja.findUnique({
    where: { id },
    select: { id: true }
  })

  if (!gasto) {
    throw new Error('Gasto no encontrado')
  }

  const gastoActualizado = await prisma.gastos_caja.update({
    where: { id },
    data: {
      comprobante_url: data.comprobante_url || undefined,
      observaciones: data.observaciones || undefined,
    },
    include: {
      autorizador: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    }
  })

  console.log(`✅ Gasto ${id} actualizado`)

  return gastoActualizado
}

/**
 * Eliminar un gasto (solo Admin)
 */
export async function deleteGastoCaja(id: number) {
  const gasto = await prisma.gastos_caja.findUnique({
    where: { id },
    select: {
      id: true,
      monto: true,
      sesion_caja_id: true,
    }
  })

  if (!gasto) {
    throw new Error('Gasto no encontrado')
  }

  // Restar del total de gastos de la sesión
  await prisma.sesiones_caja.update({
    where: { id: gasto.sesion_caja_id },
    data: {
      total_gastos: {
        decrement: gasto.monto
      }
    }
  })

  await prisma.gastos_caja.delete({
    where: { id }
  })

  console.log(`🗑️ Gasto ${id} eliminado`)

  return { success: true }
}

/**
 * Obtener totales de gastos por sesión
 */
export async function getTotalesGastosPorSesion(sesionId: number) {
  const gastos = await prisma.gastos_caja.findMany({
    where: {
      sesion_caja_id: sesionId,
    },
    select: {
      categoria_gasto: true,
      monto: true,
    }
  })

  const totales: Record<string, number> = {
    insumos: 0,
    servicios: 0,
    mantenimiento: 0,
    transporte: 0,
    nomina: 0,
    impuestos: 0,
    otros: 0,
    total: 0,
  }

  gastos.forEach(gasto => {
    const monto = Number(gasto.monto)
    totales[gasto.categoria_gasto] += monto
    totales.total += monto
  })

  return totales
}

/**
 * Obtener gastos por categoría
 */
export async function getGastosPorCategoria(
  sesionId: number,
  categoria: string
) {
  const gastos = await prisma.gastos_caja.findMany({
    where: {
      sesion_caja_id: sesionId,
      categoria_gasto: categoria,
    },
    include: {
      autorizador: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    },
    orderBy: {
      fecha_gasto: 'desc',
    },
  })

  return gastos
}

/**
 * Obtener estadísticas de gastos
 */
export async function getEstadisticasGastos(sesionId: number) {
  const resultado = await prisma.gastos_caja.aggregate({
    where: {
      sesion_caja_id: sesionId,
    },
    _sum: {
      monto: true,
    },
    _avg: {
      monto: true,
    },
    _count: true,
    _max: {
      monto: true,
    },
  })

  return {
    total: Number(resultado._sum.monto || 0),
    promedio: Number(resultado._avg.monto || 0),
    cantidad: resultado._count,
    maximo: Number(resultado._max.monto || 0),
  }
}

/**
 * Obtener gastos recientes (todas las sesiones)
 */
export async function getGastosRecientes(limit: number = 10) {
  const gastos = await prisma.gastos_caja.findMany({
    include: {
      autorizador: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
      sesion_caja: {
        select: {
          codigo_sesion: true,
          caja: {
            select: {
              nombre: true,
            }
          }
        }
      },
    },
    orderBy: {
      fecha_gasto: 'desc',
    },
    take: limit,
  })

  return gastos
}
