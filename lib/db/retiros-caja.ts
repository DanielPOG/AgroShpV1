import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { RetiroCajaCreate, ESTADOS_RETIRO } from "@/lib/validations/retiro-caja.schema"
import { validarSaldoPorMetodoPago } from "./cash-sessions"

/**
 * Obtener retiros de caja de una sesión o turno
 */
export async function getRetirosCaja(
  sesionId?: number,
  filters?: {
    estado?: string
    limit?: number
    turnoId?: number
  }
) {
  const where: Prisma.retiros_cajaWhereInput = {}

  // Filtrar por turno (prioridad) o sesión
  if (filters?.turnoId) {
    where.turno_caja_id = filters.turnoId
  } else if (sesionId) {
    where.sesion_caja_id = sesionId
  }

  if (filters?.estado) {
    where.estado = filters.estado
  }

  const retiros = await prisma.retiros_caja.findMany({
    where,
    include: {
      solicitante: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        }
      },
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
      fecha_solicitud: 'desc',
    },
    take: filters?.limit || 100,
  })

  return retiros
}

/**
 * Obtener un retiro específico por ID
 */
export async function getRetiroById(id: number) {
  const retiro = await prisma.retiros_caja.findUnique({
    where: { id },
    include: {
      solicitante: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        }
      },
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

  return retiro
}

/**
 * Crear solicitud de retiro de caja
 */
export async function createRetiroCaja(data: RetiroCajaCreate) {
  // Verificar que la sesión esté abierta
  const sesion = await prisma.sesiones_caja.findUnique({
    where: { id: data.sesion_caja_id },
    select: { 
      id: true, 
      estado: true, 
      codigo_sesion: true,
      fondo_inicial: true,
    }
  })

  if (!sesion) {
    throw new Error('Sesión de caja no encontrada')
  }

  if (sesion.estado !== 'abierta') {
    throw new Error('La sesión de caja no está abierta')
  }

  // Verificar que hay fondos suficientes
  // TODO: Calcular saldo real de caja considerando ventas y movimientos
  const fondoActual = Number(sesion.fondo_inicial)
  if (fondoActual < data.monto) {
    throw new Error(`Fondos insuficientes. Disponible: $${fondoActual.toLocaleString('es-CO')}`)
  }

  // Crear retiro
  const retiro = await prisma.retiros_caja.create({
    data: {
      sesion_caja_id: data.sesion_caja_id,
      turno_caja_id: data.turno_caja_id || null,
      monto: data.monto,
      motivo: data.motivo,
      destino_fondos: data.destino_fondos || null,
      observaciones: data.observaciones || null,
      solicitado_por: data.solicitado_por,
      estado: ESTADOS_RETIRO.PENDIENTE,
    },
    include: {
      solicitante: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    }
  })

  console.log(`✅ Retiro de caja creado: ID ${retiro.id}, Monto: $${data.monto}`)

  return retiro
}

/**
 * Autorizar o rechazar un retiro de caja
 */
export async function autorizarRetiro(
  retiroId: number,
  autorizadoPorId: number,
  estado: "autorizado" | "rechazado",
  observaciones?: string
) {
  // Verificar que el retiro existe
  const retiro = await prisma.retiros_caja.findUnique({
    where: { id: retiroId },
    select: {
      id: true,
      estado: true,
      monto: true,
      solicitado_por: true,
    }
  })

  if (!retiro) {
    throw new Error('Retiro no encontrado')
  }

  if (retiro.estado !== ESTADOS_RETIRO.PENDIENTE) {
    throw new Error(`Este retiro ya fue ${retiro.estado}`)
  }

  // No permitir que el solicitante se autorice
  if (retiro.solicitado_por === autorizadoPorId) {
    throw new Error('No puedes autorizar tu propio retiro')
  }

  const fechaRespuesta = new Date()

  // Actualizar retiro
  const retiroActualizado = await prisma.retiros_caja.update({
    where: { id: retiroId },
    data: {
      estado,
      autorizado_por: autorizadoPorId,
      fecha_respuesta: fechaRespuesta,
      observaciones: observaciones || retiro.estado,
    },
    include: {
      autorizador: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
      solicitante: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    }
  })

  console.log(`✅ Retiro ${retiroId} ${estado} por usuario ${autorizadoPorId}`)

  return retiroActualizado
}

/**
 * Completar un retiro autorizado (marcar como completado)
 */
export async function completarRetiro(
  retiroId: number,
  reciboUrl?: string
) {
  // Verificar que el retiro está autorizado
  const retiro = await prisma.retiros_caja.findUnique({
    where: { id: retiroId },
    select: {
      id: true,
      estado: true,
      monto: true,
      sesion_caja_id: true,
      turno_caja_id: true,
    }
  })

  if (!retiro) {
    throw new Error('Retiro no encontrado')
  }

  if (retiro.estado !== ESTADOS_RETIRO.AUTORIZADO) {
    throw new Error('Solo se pueden completar retiros autorizados')
  }

  // ✅ FASE 4: Validar que haya suficiente efectivo antes de completar el retiro
  const validacion = await validarSaldoPorMetodoPago(retiro.sesion_caja_id, 'efectivo', retiro.monto)
  
  if (!validacion.valido) {
    console.error(`❌ [completarRetiro] ${validacion.mensaje}`)
    throw new Error(`No se puede completar el retiro. ${validacion.mensaje}`)
  }

  // Usar transacción para asegurar consistencia
  return await prisma.$transaction(async (tx) => {
    // 1. Actualizar retiro
    const retiroCompletado = await tx.retiros_caja.update({
      where: { id: retiroId },
      data: {
        estado: ESTADOS_RETIRO.COMPLETADO,
        recibo_url: reciboUrl || null,
      },
    })

    // 2. Actualizar totales de la sesión
    await tx.sesiones_caja.update({
      where: { id: retiro.sesion_caja_id },
      data: {
        total_retiros: {
          increment: retiro.monto
        }
      }
    })

    // 3. Crear movimiento de caja para trazabilidad
    await tx.movimientos_caja.create({
      data: {
        sesion_caja_id: retiro.sesion_caja_id,
        turno_caja_id: retiro.turno_caja_id || null,
        tipo_movimiento: 'retiro_caja',
        metodo_pago: 'efectivo',
        monto: retiro.monto,
        descripcion: `Retiro de caja completado: ${retiroCompletado.motivo}`,
        usuario_id: retiroCompletado.solicitado_por,
      }
    })

    console.log(`✅ Retiro ${retiroId} completado. Monto: $${retiro.monto}. Movimiento de caja creado.`)

    return retiroCompletado
  })
}

/**
 * Obtener retiros pendientes de autorización
 */
export async function getRetirosPendientes() {
  const retiros = await prisma.retiros_caja.findMany({
    where: {
      estado: ESTADOS_RETIRO.PENDIENTE,
    },
    include: {
      solicitante: {
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
      fecha_solicitud: 'asc', // Más antiguos primero
    },
  })

  return retiros
}

/**
 * Obtener retiros autorizados pero no completados
 */
export async function getRetirosAutorizadosPendientes() {
  const retiros = await prisma.retiros_caja.findMany({
    where: {
      estado: ESTADOS_RETIRO.AUTORIZADO,
    },
    include: {
      solicitante: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        }
      },
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
          caja: {
            select: {
              nombre: true,
            }
          }
        }
      },
    },
    orderBy: {
      fecha_respuesta: 'asc',
    },
  })

  return retiros
}

/**
 * Obtener total de retiros por sesión
 */
export async function getTotalRetirosPorSesion(sesionId: number) {
  const resultado = await prisma.retiros_caja.aggregate({
    where: {
      sesion_caja_id: sesionId,
      estado: {
        in: [ESTADOS_RETIRO.AUTORIZADO, ESTADOS_RETIRO.COMPLETADO]
      }
    },
    _sum: {
      monto: true,
    },
    _count: true,
  })

  return {
    total: Number(resultado._sum.monto || 0),
    cantidad: resultado._count,
  }
}

/**
 * Cancelar retiro (solo si está pendiente)
 */
export async function cancelarRetiro(retiroId: number, usuarioId: number) {
  const retiro = await prisma.retiros_caja.findUnique({
    where: { id: retiroId },
    select: {
      id: true,
      estado: true,
      solicitado_por: true,
    }
  })

  if (!retiro) {
    throw new Error('Retiro no encontrado')
  }

  if (retiro.estado !== ESTADOS_RETIRO.PENDIENTE) {
    throw new Error('Solo se pueden cancelar retiros pendientes')
  }

  // Solo el solicitante puede cancelar
  if (retiro.solicitado_por !== usuarioId) {
    throw new Error('Solo el solicitante puede cancelar este retiro')
  }

  await prisma.retiros_caja.delete({
    where: { id: retiroId }
  })

  console.log(`🗑️ Retiro ${retiroId} cancelado por usuario ${usuarioId}`)

  return { success: true }
}
