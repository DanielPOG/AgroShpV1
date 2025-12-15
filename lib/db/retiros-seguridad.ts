import { prisma } from '@/lib/prisma'

/**
 * 💰 RETIROS DE SEGURIDAD DURANTE TURNO
 * 
 * Permite retirar efectivo de caja sin cerrar el turno
 */

export interface RetiroSeguridadData {
  turno_caja_id: number
  sesion_caja_id: number
  monto: number
  motivo: string
  solicitado_por: number
  destino_fondos?: string
  observaciones?: string
}

/**
 * Validar que se puede realizar retiro de seguridad
 */
export async function validarRetiroSeguridad(
  turnoId: number,
  monto: number
): Promise<{ valido: boolean; mensaje: string; efectivoDisponible?: number }> {
  console.log(`🔍 [Retiro Seguridad] Validando retiro de $${monto} para turno ${turnoId}`)

  // 1. Verificar que el turno existe y está activo
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    select: {
      id: true,
      estado: true,
      efectivo_inicial: true,
      sesion_caja_id: true,
    },
  })

  if (!turno) {
    return {
      valido: false,
      mensaje: 'Turno no encontrado',
    }
  }

  if (turno.estado !== 'activo') {
    return {
      valido: false,
      mensaje: `El turno está ${turno.estado}. Solo se pueden hacer retiros de turnos activos.`,
    }
  }

  // 2. Calcular efectivo disponible en el turno
  const ventasEfectivo = await prisma.$queryRaw<[{ total: number }]>`
    SELECT COALESCE(SUM(pv.monto), 0) as total
    FROM pagos_venta pv
    INNER JOIN ventas v ON pv.venta_id = v.id
    INNER JOIN metodos_pago mp ON pv.metodo_pago_id = mp.id
    WHERE v.turno_caja_id = ${turnoId}
    AND LOWER(mp.nombre) LIKE '%efectivo%'
  `

  // Obtener retiros previos del turno
  const retirosAnteriores = await prisma.retiros_caja.findMany({
    where: {
      turno_caja_id: turnoId,
      estado: 'completado',
    },
    select: {
      monto: true,
    },
  })

  const totalRetirosAnteriores = retirosAnteriores.reduce(
    (sum, r) => sum + Number(r.monto),
    0
  )

  const efectivoDisponible =
    Number(turno.efectivo_inicial) + (ventasEfectivo[0]?.total || 0) - totalRetirosAnteriores

  console.log(`💵 [Retiro Seguridad] Efectivo disponible: $${efectivoDisponible}`)

  // 3. Validar que hay suficiente efectivo
  if (monto > efectivoDisponible) {
    return {
      valido: false,
      mensaje: `Efectivo insuficiente. Disponible: $${efectivoDisponible.toLocaleString('es-CO')}, Solicitado: $${monto.toLocaleString('es-CO')}`,
      efectivoDisponible,
    }
  }

  // 4. Validar monto mínimo y máximo
  if (monto < 10000) {
    return {
      valido: false,
      mensaje: 'El monto mínimo de retiro es $10,000',
      efectivoDisponible,
    }
  }

  if (monto > 1000000) {
    return {
      valido: false,
      mensaje: 'El monto máximo de retiro es $1,000,000. Contacte al supervisor para montos mayores.',
      efectivoDisponible,
    }
  }

  console.log(`✅ [Retiro Seguridad] Validación exitosa`)

  return {
    valido: true,
    mensaje: 'Retiro válido',
    efectivoDisponible,
  }
}

/**
 * Crear retiro de seguridad
 */
export async function crearRetiroSeguridad(data: RetiroSeguridadData) {
  console.log(`💰 [Retiro Seguridad] Creando retiro de $${data.monto} para turno ${data.turno_caja_id}`)

  // Validar retiro
  const validacion = await validarRetiroSeguridad(data.turno_caja_id, data.monto)

  if (!validacion.valido) {
    throw new Error(validacion.mensaje)
  }

  // Crear retiro en transacción
  const retiro = await prisma.$transaction(async (tx) => {
    // 1. Crear registro de retiro
    const nuevoRetiro = await tx.retiros_caja.create({
      data: {
        sesion_caja_id: data.sesion_caja_id,
        turno_caja_id: data.turno_caja_id,
        monto: data.monto,
        motivo: data.motivo,
        solicitado_por: data.solicitado_por,
        estado: 'completado', // Auto-aprobado para retiros de seguridad
        fecha_solicitud: new Date(),
        fecha_respuesta: new Date(),
        destino_fondos: data.destino_fondos || 'Caja fuerte / Banco',
        observaciones: `${data.observaciones || ''}\n[RETIRO DE SEGURIDAD - Auto-aprobado]`,
      },
    })

    // 2. Actualizar total_retiros en sesión
    await tx.sesiones_caja.update({
      where: { id: data.sesion_caja_id },
      data: {
        total_retiros: {
          increment: data.monto,
        },
      },
    })

    // 3. Registrar movimiento de caja
    await tx.movimientos_caja.create({
      data: {
        sesion_caja_id: data.sesion_caja_id,
        turno_caja_id: data.turno_caja_id,
        tipo_movimiento: 'egreso_operativo',
        metodo_pago: 'efectivo',
        monto: data.monto,
        descripcion: `Retiro de seguridad - ${data.motivo}`,
        usuario_id: data.solicitado_por,
        fecha_movimiento: new Date(),
      },
    })

    console.log(`✅ [Retiro Seguridad] Retiro ID ${nuevoRetiro.id} creado exitosamente`)

    return nuevoRetiro
  })

  return retiro
}

/**
 * Obtener historial de retiros de seguridad de un turno
 */
export async function getRetirosSeguridad(turnoId: number) {
  const retiros = await prisma.retiros_caja.findMany({
    where: {
      turno_caja_id: turnoId,
    },
    include: {
      solicitante: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
    },
    orderBy: {
      fecha_solicitud: 'desc',
    },
  })

  return retiros.map((retiro) => ({
    id: retiro.id,
    monto: Number(retiro.monto),
    motivo: retiro.motivo,
    estado: retiro.estado,
    fecha: retiro.fecha_solicitud,
    solicitante: `${retiro.solicitante.nombre} ${retiro.solicitante.apellido}`,
    destino: retiro.destino_fondos,
    observaciones: retiro.observaciones,
  }))
}

/**
 * Calcular efectivo disponible actual en turno
 */
export async function getEfectivoDisponibleTurno(turnoId: number): Promise<number> {
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    select: {
      efectivo_inicial: true,
    },
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  // Ventas en efectivo
  const ventasEfectivo = await prisma.$queryRaw<[{ total: number }]>`
    SELECT COALESCE(SUM(pv.monto), 0) as total
    FROM pagos_venta pv
    INNER JOIN ventas v ON pv.venta_id = v.id
    INNER JOIN metodos_pago mp ON pv.metodo_pago_id = mp.id
    WHERE v.turno_caja_id = ${turnoId}
    AND LOWER(mp.nombre) LIKE '%efectivo%'
  `

  // Retiros completados
  const retiros = await prisma.retiros_caja.findMany({
    where: {
      turno_caja_id: turnoId,
      estado: 'completado',
    },
    select: {
      monto: true,
    },
  })

  const totalRetiros = retiros.reduce((sum, r) => sum + Number(r.monto), 0)

  // Gastos en efectivo
  const gastos = await prisma.gastos_caja.findMany({
    where: {
      turno_caja_id: turnoId,
      metodo_pago: 'efectivo',
    },
    select: {
      monto: true,
    },
  })

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0)

  const efectivoDisponible =
    Number(turno.efectivo_inicial) +
    (ventasEfectivo[0]?.total || 0) -
    totalRetiros -
    totalGastos

  return efectivoDisponible
}
