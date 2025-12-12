import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { 
  MovimientoCajaCreate, 
  MONTO_REQUIERE_AUTORIZACION,
  TIPOS_MOVIMIENTO 
} from "@/lib/validations/movimiento-caja.schema"
import { validarEfectivoSuficiente } from "./cash-sessions"

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

  // ✅ FASE 4: Si es EGRESO y método EFECTIVO, validar que haya suficiente efectivo
  if (data.tipo_movimiento === TIPOS_MOVIMIENTO.EGRESO_OPERATIVO && data.metodo_pago === 'efectivo') {
    const validacion = await validarEfectivoSuficiente(data.sesion_caja_id, data.monto)
    
    if (!validacion.valido) {
      console.error(`❌ [createMovimientoCaja] ${validacion.mensaje}`)
      throw new Error(validacion.mensaje)
    }
    
    if (validacion.alertaBajoEfectivo) {
      console.warn(`⚠️ [createMovimientoCaja] ${validacion.mensaje}`)
    }
  }

  // Determinar si requiere autorización
  const requiereAutorizacion = data.monto >= MONTO_REQUIERE_AUTORIZACION

  // Usar transacción para asegurar consistencia
  return await prisma.$transaction(async (tx) => {
    // 1. Crear el movimiento
    const movimiento = await tx.movimientos_caja.create({
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

    // 2. Actualizar sesión si es movimiento de efectivo
    if (data.metodo_pago === 'efectivo') {
      await tx.sesiones_caja.update({
        where: { id: data.sesion_caja_id },
        data: {
          total_ingresos_adicionales: {
            increment: data.tipo_movimiento === TIPOS_MOVIMIENTO.INGRESO_ADICIONAL 
              ? data.monto 
              : 0
          }
        }
      })

      console.log(`✅ Sesión actualizada: ${data.tipo_movimiento} en efectivo por $${data.monto}`)
    }

    console.log(`✅ Movimiento de caja creado: ${data.tipo_movimiento} por $${data.monto}`)

    return movimiento
  })
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

/**
 * 📊 FASE 5: Reporte Detallado de Movimientos de Caja
 * 
 * Obtiene movimientos con filtros avanzados para reportes.
 * Incluye paginación, totales y desglose por tipo/método.
 * 
 * @param filters - Filtros de búsqueda
 * @returns Movimientos con totales y paginación
 */
export async function getMovimientosDetallados(filters?: {
  sesion_id?: number
  fecha_desde?: Date
  fecha_hasta?: Date
  tipo_movimiento?: string[]
  metodo_pago?: string[]
  usuario_id?: number
  page?: number
  limit?: number
}) {
  console.log('\n📊 [getMovimientosDetallados] Generando reporte con filtros:', filters)
  
  const page = filters?.page || 1
  const limit = filters?.limit || 50
  const skip = (page - 1) * limit
  
  // Construir condiciones WHERE
  const where: any = {}
  
  if (filters?.sesion_id) {
    where.sesion_caja_id = filters.sesion_id
  }
  
  if (filters?.fecha_desde || filters?.fecha_hasta) {
    where.fecha = {}
    if (filters.fecha_desde) {
      where.fecha.gte = filters.fecha_desde
    }
    if (filters.fecha_hasta) {
      where.fecha.lte = filters.fecha_hasta
    }
  }
  
  if (filters?.tipo_movimiento && filters.tipo_movimiento.length > 0) {
    where.tipo_movimiento = {
      in: filters.tipo_movimiento
    }
  }
  
  if (filters?.metodo_pago && filters.metodo_pago.length > 0) {
    where.metodo_pago = {
      in: filters.metodo_pago
    }
  }
  
  if (filters?.usuario_id) {
    where.usuario_id = filters.usuario_id
  }
  
  // Obtener movimientos con paginación
  const [movimientos, total] = await Promise.all([
    prisma.movimientos_caja.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        },
        venta: {
          select: {
            id: true,
            codigo_venta: true,
            total: true
          }
        },
        sesion_caja: {
          select: {
            id: true,
            codigo_sesion: true,
            caja: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.movimientos_caja.count({ where })
  ])
  
  // Calcular totales generales (sin paginación)
  const todosMovimientos = await prisma.movimientos_caja.findMany({
    where,
    select: {
      tipo_movimiento: true,
      metodo_pago: true,
      monto: true
    }
  })
  
  // Calcular totales por tipo
  const totalesPorTipo: Record<string, number> = {}
  const totalesPorMetodo: Record<string, number> = {}
  let totalIngresos = 0
  let totalEgresos = 0
  
  todosMovimientos.forEach(mov => {
    const monto = Number(mov.monto)
    
    // Por tipo
    if (!totalesPorTipo[mov.tipo_movimiento]) {
      totalesPorTipo[mov.tipo_movimiento] = 0
    }
    totalesPorTipo[mov.tipo_movimiento] += monto
    
    // Por método
    if (!totalesPorMetodo[mov.metodo_pago]) {
      totalesPorMetodo[mov.metodo_pago] = 0
    }
    totalesPorMetodo[mov.metodo_pago] += monto
    
    // Ingresos vs Egresos
    if (['venta', 'ingreso_adicional'].includes(mov.tipo_movimiento)) {
      totalIngresos += monto
    } else {
      totalEgresos += monto
    }
  })
  
  const totalNeto = totalIngresos - totalEgresos
  
  console.log(`✅ [getMovimientosDetallados] ${movimientos.length} movimientos encontrados (${total} total)`)
  
  return {
    movimientos: movimientos.map(m => ({
      id: m.id,
      fecha: m.fecha,
      tipo_movimiento: m.tipo_movimiento,
      metodo_pago: m.metodo_pago,
      monto: Number(m.monto),
      monto_recibido: m.monto_recibido ? Number(m.monto_recibido) : null,
      monto_cambio: m.monto_cambio ? Number(m.monto_cambio) : null,
      descripcion: m.descripcion,
      usuario: m.usuario ? {
        id: m.usuario.id,
        nombre: `${m.usuario.nombre} ${m.usuario.apellido}`,
        email: m.usuario.email
      } : null,
      venta: m.venta ? {
        id: m.venta.id,
        codigo: m.venta.codigo_venta,
        total: Number(m.venta.total)
      } : null,
      sesion: {
        id: m.sesion_caja.id,
        codigo: m.sesion_caja.codigo_sesion,
        caja: m.sesion_caja.caja.nombre
      }
    })),
    
    totales: {
      ingresos: totalIngresos,
      egresos: totalEgresos,
      neto: totalNeto,
      por_tipo: totalesPorTipo,
      por_metodo: totalesPorMetodo
    },
    
    paginacion: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }
}
