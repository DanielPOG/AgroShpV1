import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { 
  MovimientoCajaCreate, 
  MONTO_REQUIERE_AUTORIZACION,
  TIPOS_MOVIMIENTO 
} from "@/lib/validations/movimiento-caja.schema"

/**
 * Obtener movimientos de caja extra de una sesión
 * Excluye movimientos de ventas (que tienen venta_id)
 */
export async function getMovimientosCajaExtra(
  sesionId: number,
  filters?: {
    tipo?: string
    metodo?: string
    limit?: number
  }
) {
  const where: Prisma.movimientos_cajaWhereInput = {
    sesion_caja_id: sesionId,
    venta_id: null, // Solo movimientos extra (no ventas)
  }

  if (filters?.tipo) {
    where.tipo_movimiento = filters.tipo
  }

  if (filters?.metodo) {
    where.metodo_pago = filters.metodo
  }

  const movimientos = await prisma.movimientos_caja.findMany({
    where,
    include: {
      usuario: {
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
    },
    orderBy: {
      fecha_movimiento: 'desc',
    },
    take: filters?.limit || 100,
  })

  return movimientos
}

/**
 * Obtener un movimiento específico por ID
 */
export async function getMovimientoCajaById(id: number) {
  const movimiento = await prisma.movimientos_caja.findUnique({
    where: { id },
    include: {
      usuario: {
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
        }
      },
    },
  })

  return movimiento
}

/**
 * Crear un movimiento de caja extra (ingreso/egreso)
 */
export async function createMovimientoCaja(data: MovimientoCajaCreate) {
  // Verificar que la sesión esté abierta
  const sesion = await prisma.sesiones_caja.findUnique({
    where: { id: data.sesion_caja_id },
    select: { 
      id: true, 
      estado: true, 
      codigo_sesion: true,
      fondo_inicial: true,
      total_ventas_efectivo: true,
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

  // Si es EGRESO y método EFECTIVO, validar que haya suficiente efectivo
  if (data.tipo_movimiento === TIPOS_MOVIMIENTO.EGRESO_OPERATIVO && data.metodo_pago === 'efectivo') {
    // Calcular efectivo disponible actual
    const fondoInicial = Number(sesion.fondo_inicial)
    const ventasEfectivo = Number(sesion.total_ventas_efectivo || 0)
    const retiros = Number(sesion.total_retiros || 0)
    const gastos = Number(sesion.total_gastos || 0)

    // Obtener ingresos y egresos adicionales (movimientos previos)
    const movimientos = await prisma.movimientos_caja.findMany({
      where: {
        sesion_caja_id: data.sesion_caja_id,
        venta_id: null,
        metodo_pago: 'efectivo',
      },
      select: {
        tipo_movimiento: true,
        monto: true,
      }
    })

    let ingresosAdicionales = 0
    let egresosOperativos = 0

    movimientos.forEach(mov => {
      const monto = Number(mov.monto)
      if (mov.tipo_movimiento === TIPOS_MOVIMIENTO.INGRESO_ADICIONAL) {
        ingresosAdicionales += monto
      } else if (mov.tipo_movimiento === TIPOS_MOVIMIENTO.EGRESO_OPERATIVO) {
        egresosOperativos += monto
      }
    })

    // Efectivo disponible = Fondo + Ventas + Ingresos - Retiros - Gastos - Egresos
    const efectivoDisponible = fondoInicial + ventasEfectivo + ingresosAdicionales - retiros - gastos - egresosOperativos

    if (data.monto > efectivoDisponible) {
      throw new Error(
        `Efectivo insuficiente. Disponible: $${efectivoDisponible.toLocaleString('es-CO')}. ` +
        `Intentas retirar: $${data.monto.toLocaleString('es-CO')}`
      )
    }
  }

  // Determinar si requiere autorización
  const requiereAutorizacion = data.monto >= MONTO_REQUIERE_AUTORIZACION

  // Crear el movimiento
  const movimiento = await prisma.movimientos_caja.create({
    data: {
      sesion_caja_id: data.sesion_caja_id,
      tipo_movimiento: data.tipo_movimiento,
      metodo_pago: data.metodo_pago,
      monto: data.monto,
      descripcion: data.descripcion,
      usuario_id: data.usuario_id,
      requiere_autorizacion: requiereAutorizacion,
      autorizado_por: data.autorizado_por || null,
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
        }
      },
    }
  })

  console.log(`✅ Movimiento de caja creado: ${data.tipo_movimiento} por $${data.monto}`)

  return movimiento
}

/**
 * Autorizar un movimiento de caja
 * Solo Admin/Supervisor pueden autorizar
 */
export async function autorizarMovimiento(
  movimientoId: number,
  autorizadoPorId: number
) {
  // Verificar que el movimiento existe y requiere autorización
  const movimiento = await prisma.movimientos_caja.findUnique({
    where: { id: movimientoId },
    select: {
      id: true,
      requiere_autorizacion: true,
      autorizado_por: true,
      monto: true,
      tipo_movimiento: true,
    }
  })

  if (!movimiento) {
    throw new Error('Movimiento no encontrado')
  }

  if (!movimiento.requiere_autorizacion) {
    throw new Error('Este movimiento no requiere autorización')
  }

  if (movimiento.autorizado_por) {
    throw new Error('Este movimiento ya fue autorizado')
  }

  // Actualizar movimiento con autorización
  const movimientoAutorizado = await prisma.movimientos_caja.update({
    where: { id: movimientoId },
    data: {
      autorizado_por: autorizadoPorId,
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

  console.log(`✅ Movimiento ${movimientoId} autorizado por usuario ${autorizadoPorId}`)

  return movimientoAutorizado
}

/**
 * Obtener totales de movimientos extra por sesión
 */
export async function getTotalesMovimientosExtra(sesionId: number) {
  const movimientos = await prisma.movimientos_caja.findMany({
    where: {
      sesion_caja_id: sesionId,
      venta_id: null, // Solo movimientos extra
    },
    select: {
      tipo_movimiento: true,
      monto: true,
    }
  })

  const totales = {
    ingresos_adicionales: 0,
    egresos_operativos: 0,
    total_neto: 0,
  }

  movimientos.forEach(mov => {
    const monto = Number(mov.monto)
    if (mov.tipo_movimiento === TIPOS_MOVIMIENTO.INGRESO_ADICIONAL) {
      totales.ingresos_adicionales += monto
    } else if (mov.tipo_movimiento === TIPOS_MOVIMIENTO.EGRESO_OPERATIVO) {
      totales.egresos_operativos += monto
    }
  })

  totales.total_neto = totales.ingresos_adicionales - totales.egresos_operativos

  return totales
}

/**
 * Obtener movimientos pendientes de autorización
 */
export async function getMovimientosPendientesAutorizacion() {
  const movimientos = await prisma.movimientos_caja.findMany({
    where: {
      requiere_autorizacion: true,
      autorizado_por: null,
    },
    include: {
      usuario: {
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
            }
          }
        }
      },
    },
    orderBy: {
      fecha_movimiento: 'asc', // Más antiguos primero
    },
  })

  return movimientos
}

/**
 * Eliminar movimiento de caja (solo si no está autorizado)
 */
export async function deleteMovimientoCaja(id: number, usuarioId: number) {
  // Verificar que existe
  const movimiento = await prisma.movimientos_caja.findUnique({
    where: { id },
    select: {
      id: true,
      autorizado_por: true,
      usuario_id: true,
    }
  })

  if (!movimiento) {
    throw new Error('Movimiento no encontrado')
  }

  if (movimiento.autorizado_por) {
    throw new Error('No se puede eliminar un movimiento autorizado')
  }

  // Solo el creador puede eliminar (o un Admin)
  if (movimiento.usuario_id !== usuarioId) {
    throw new Error('Solo el creador puede eliminar este movimiento')
  }

  await prisma.movimientos_caja.delete({
    where: { id }
  })

  console.log(`🗑️ Movimiento ${id} eliminado por usuario ${usuarioId}`)

  return { success: true }
}
