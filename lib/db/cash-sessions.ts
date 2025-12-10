import { prisma } from '@/lib/prisma'
import type { OpenCashSessionData, CloseCashSessionData } from '@/lib/validations/cash-session.schema'

/**
 * Obtener sesión activa de un cajero
 */
export async function getActiveCashSession(userId: number) {
  console.log(`🔍 Buscando sesión activa para usuario ${userId}`)
  
  const session = await prisma.sesiones_caja.findFirst({
    where: {
      cajero_id: userId,
      estado: 'abierta',
    },
    include: {
      caja: true,
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
    },
    orderBy: {
      fecha_apertura: 'desc',
    },
  })

  if (session) {
    console.log(`✅ Sesión activa encontrada: ID ${session.id}`)
  } else {
    console.log(`❌ No hay sesión activa para usuario ${userId}`)
  }

  return session
}

/**
 * Abrir una nueva sesión de caja
 */
export async function openCashSession(userId: number, data: OpenCashSessionData) {
  console.log(`🔓 Abriendo nueva sesión de caja para usuario ${userId}`)
  
  // Verificar que no tenga otra sesión abierta
  const existingSession = await getActiveCashSession(userId)
  if (existingSession) {
    throw new Error(`Ya tienes una sesión abierta (ID: ${existingSession.id}). Debes cerrarla primero.`)
  }

  // Verificar que la caja no esté siendo usada por otro cajero
  const cajaEnUso = await prisma.sesiones_caja.findFirst({
    where: {
      caja_id: data.caja_id,
      estado: 'abierta',
    },
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
    },
  })

  if (cajaEnUso) {
    throw new Error(
      `La caja está siendo usada por ${cajaEnUso.cajero.nombre} ${cajaEnUso.cajero.apellido}`
    )
  }

  // Generar código único de sesión
  const codigoSesion = `SES-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

  // Crear nueva sesión
  const session = await prisma.sesiones_caja.create({
    data: {
      codigo_sesion: codigoSesion,
      caja_id: data.caja_id,
      cajero_id: userId,
      fecha_apertura: new Date(),
      fondo_inicial: data.fondo_inicial,
      efectivo_esperado: data.fondo_inicial, // Inicialmente igual al fondo inicial
      estado: 'abierta',
      observaciones_apertura: data.observaciones_apertura,
    },
    include: {
      caja: true,
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
    },
  })

  console.log(`✅ Sesión de caja abierta: ${session.codigo_sesion} (ID ${session.id})`)
  return session
}

/**
 * Cerrar sesión de caja con arqueo
 */
export async function closeCashSession(sessionId: number, userId: number, data: CloseCashSessionData) {
  console.log(`🔒 Cerrando sesión de caja ${sessionId}`)

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener sesión
    const session = await tx.sesiones_caja.findUnique({
      where: { id: sessionId },
      include: {
        caja: true,
        cajero: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
    })

    if (!session) {
      throw new Error('Sesión no encontrada')
    }

    if (session.cajero_id !== userId) {
      throw new Error('No puedes cerrar una sesión que no abriste')
    }

    if (session.estado !== 'abierta') {
      throw new Error('La sesión ya está cerrada')
    }

    // 2. Calcular diferencia entre contado y esperado
    const efectivoContado = data.efectivo_contado
    const efectivoEsperado = session.efectivo_esperado
    const diferencia = Number(efectivoContado) - Number(efectivoEsperado)

    console.log(`💰 Efectivo esperado: ${efectivoEsperado}`)
    console.log(`💵 Efectivo contado: ${efectivoContado}`)
    console.log(`📊 Diferencia: ${diferencia}`)

    // 3. Crear registro de arqueo
    const arqueo = await tx.arqueos_caja.create({
      data: {
        sesion_caja_id: sessionId,
        tipo_arqueo: 'cierre',
        realizado_por: userId,
        fecha_arqueo: new Date(),
        billetes_100000: data.billetes_100000,
        billetes_50000: data.billetes_50000,
        billetes_20000: data.billetes_20000,
        billetes_10000: data.billetes_10000,
        billetes_5000: data.billetes_5000,
        billetes_2000: data.billetes_2000,
        billetes_1000: data.billetes_1000,
        monedas_1000: data.monedas_1000,
        monedas_500: data.monedas_500,
        monedas_200: data.monedas_200,
        monedas_100: data.monedas_100,
        monedas_50: data.monedas_50,
        total_contado: efectivoContado,
        total_esperado: efectivoEsperado,
        diferencia,
        observaciones: data.observaciones_cierre,
      },
    })

    // 4. Cerrar sesión
    const closedSession = await tx.sesiones_caja.update({
      where: { id: sessionId },
      data: {
        fecha_cierre: new Date(),
        efectivo_contado: efectivoContado,
        diferencia,
        estado: 'cerrada',
        cuadrada: Math.abs(diferencia) < 100, // Tolerancia de $100
        observaciones_cierre: data.observaciones_cierre,
      },
      include: {
        caja: true,
        cajero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    })

    console.log(`✅ Sesión cerrada con diferencia de: $${diferencia.toLocaleString('es-CO')}`)

    return {
      session: closedSession,
      arqueo,
    }
  })
}

/**
 * Obtener resumen de caja actual
 */
export async function getCashSessionSummary(sessionId: number) {
  const [session, movimientos, retiros, gastos] = await Promise.all([
    prisma.sesiones_caja.findUnique({
      where: { id: sessionId },
      include: {
        caja: true,
        cajero: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
    }),
    prisma.movimientos_caja.findMany({
      where: { sesion_caja_id: sessionId },
      orderBy: { fecha_movimiento: 'desc' },
    }),
    prisma.retiros_caja.findMany({
      where: { sesion_caja_id: sessionId, estado: 'aprobado' },
    }),
    prisma.gastos_caja.findMany({
      where: { sesion_caja_id: sessionId },
    }),
  ])

  if (!session) {
    throw new Error('Sesión no encontrada')
  }

  // Calcular totales de movimientos (solo efectivo)
  const totalIngresosEfectivo = movimientos
    .filter((m) => m.tipo_movimiento === 'ingreso_adicional' && m.metodo_pago === 'efectivo')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const totalEgresosEfectivo = movimientos
    .filter((m) => m.tipo_movimiento === 'egreso_operativo' && m.metodo_pago === 'efectivo')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  // Totales generales (todos los métodos)
  const totalIngresos = movimientos
    .filter((m) => m.tipo_movimiento === 'ingreso_adicional')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const totalEgresos = movimientos
    .filter((m) => m.tipo_movimiento === 'egreso_operativo')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const totalRetiros = retiros.reduce((sum, r) => sum + Number(r.monto), 0)
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0)

  // Efectivo esperado = fondo inicial + ventas efectivo + ingresos efectivo - retiros - gastos - egresos efectivo
  const ventasEfectivo = Number(session.total_ventas_efectivo || 0)
  const efectivoEsperado =
    Number(session.fondo_inicial) + 
    ventasEfectivo + 
    totalIngresosEfectivo - 
    totalRetiros - 
    totalGastos - 
    totalEgresosEfectivo

  return {
    session,
    ventas: {
      efectivo: ventasEfectivo,
      total: Number(session.total_ventas || 0),
    },
    movimientos: {
      total: movimientos.length,
      ingresos: totalIngresos,
      egresos: totalEgresos,
      ingresosEfectivo: totalIngresosEfectivo,
      egresosEfectivo: totalEgresosEfectivo,
    },
    retiros: {
      total: retiros.length,
      monto: totalRetiros,
    },
    gastos: {
      total: gastos.length,
      monto: totalGastos,
    },
    efectivoEsperado,
  }
}

/**
 * Listar sesiones con filtros
 */
export async function getCashSessions(filters?: {
  cajero_id?: number
  caja_id?: number
  estado?: 'abierta' | 'cerrada'
  fecha_desde?: Date
  fecha_hasta?: Date
  page?: number
  limit?: number
}) {
  const where: any = {}

  if (filters?.cajero_id) {
    where.cajero_id = filters.cajero_id
  }

  if (filters?.caja_id) {
    where.caja_id = filters.caja_id
  }

  if (filters?.estado) {
    where.estado = filters.estado
  }

  if (filters?.fecha_desde || filters?.fecha_hasta) {
    where.fecha_apertura = {}
    if (filters.fecha_desde) {
      where.fecha_apertura.gte = filters.fecha_desde
    }
    if (filters.fecha_hasta) {
      where.fecha_apertura.lte = filters.fecha_hasta
    }
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  const [sessions, total] = await Promise.all([
    prisma.sesiones_caja.findMany({
      where,
      include: {
        caja: true,
        cajero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { fecha_apertura: 'desc' },
    }),
    prisma.sesiones_caja.count({ where }),
  ])

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
