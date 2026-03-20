import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
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
 * 💰 FUNCIÓN CRÍTICA: Calcula el efectivo REAL disponible en caja
 * 
 * Esta función considera TODAS las operaciones que afectan el efectivo:
 * 1. Fondo inicial
 * 2. Ventas en efectivo
 * 3. Ingresos adicionales en efectivo (movimientos_caja)
 * 4. Egresos operativos en efectivo (movimientos_caja)
 * 5. Retiros de caja aprobados
 * 6. Gastos pagados en efectivo
 * 
 * IMPORTANTE: Esta es la única fuente de verdad para efectivo disponible.
 * Usar esta función en lugar de calcular manualmente.
 * 
 * @param sessionId - ID de la sesión de caja
 * @returns Monto de efectivo disponible (puede ser negativo si hay faltante)
 */
export async function getEfectivoDisponible(sessionId: number): Promise<number> {
  console.log(`\n💰 [getEfectivoDisponible] Calculando efectivo para sesión ${sessionId}`)

  // 1. Obtener sesión
  const session = await prisma.sesiones_caja.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      codigo_sesion: true,
      fondo_inicial: true,
      total_ventas_efectivo: true,
      total_retiros: true,
      total_gastos: true,
    }
  })

  if (!session) {
    console.error(`❌ [getEfectivoDisponible] Sesión ${sessionId} no encontrada`)
    throw new Error('Sesión no encontrada')
  }

  console.log(`📊 [getEfectivoDisponible] Sesión: ${session.codigo_sesion}`)

  // 2. Buscar el último turno cerrado de la sesión
  const ultimoTurnoCerrado = await prisma.turnos_caja.findFirst({
    where: {
      sesion_caja_id: sessionId,
      estado: 'finalizado',
      efectivo_final: { not: null }
    },
    orderBy: {
      fecha_fin: 'desc'
    },
    select: {
      id: true,
      efectivo_final: true,
      fecha_fin: true
    }
  })

  // Determinar la base de cálculo
  let efectivoBase: number
  let fechaDesde: Date | undefined

  if (ultimoTurnoCerrado) {
    // Si hay turno cerrado, usar su efectivo final como base
    efectivoBase = Number(ultimoTurnoCerrado.efectivo_final)
    const fechaBase = ultimoTurnoCerrado.fecha_fin ?? new Date()
    fechaDesde = fechaBase
    console.log(`   💵 Base: Último turno cerrado (ID ${ultimoTurnoCerrado.id})`)
    console.log(`   💵 Efectivo base: $${efectivoBase.toLocaleString('es-CO')} (desde ${fechaBase.toISOString()})`)
  } else {
    // Si no hay turno cerrado, usar fondo inicial
    efectivoBase = Number(session.fondo_inicial)
    console.log(`   💵 Base: Fondo inicial de sesión`)
    console.log(`   💵 Efectivo base: $${efectivoBase.toLocaleString('es-CO')}`)
  }

  // 3. Obtener movimientos desde la fecha base
  const whereMovimientos: any = {
    sesion_caja_id: sessionId,
    metodo_pago: 'efectivo',
    tipo_movimiento: {
      in: ['ingreso_adicional', 'egreso_operativo']
    }
  }
  
  if (fechaDesde) {
    whereMovimientos.fecha_movimiento = { gt: fechaDesde }
  }

  const movimientos = await prisma.movimientos_caja.findMany({
    where: whereMovimientos,
    select: {
      id: true,
      tipo_movimiento: true,
      monto: true,
      descripcion: true
    }
  })

  const ingresosEfectivo = movimientos
    .filter(m => m.tipo_movimiento === 'ingreso_adicional')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const egresosEfectivo = movimientos
    .filter(m => m.tipo_movimiento === 'egreso_operativo')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  console.log(`   💵 Ingresos extra (${movimientos.filter(m => m.tipo_movimiento === 'ingreso_adicional').length}): $${ingresosEfectivo.toLocaleString('es-CO')}`)
  console.log(`   💵 Egresos extra (${movimientos.filter(m => m.tipo_movimiento === 'egreso_operativo').length}): -$${egresosEfectivo.toLocaleString('es-CO')}`)

  // 4. Obtener ventas, retiros y gastos desde la fecha base
  // Para turnos: obtener IDs de turnos desde la fecha base
  const whereTurnos: any = {
    sesion_caja_id: sessionId
  }
  
  if (fechaDesde) {
    whereTurnos.fecha_inicio = { gt: fechaDesde }
  }

  const turnosDesdeBase = await prisma.turnos_caja.findMany({
    where: whereTurnos,
    select: { id: true }
  })

  const turnoIds = turnosDesdeBase.map(t => t.id)

  // Ventas en efectivo desde la fecha base
  let totalVentasEfectivo = 0
  if (turnoIds.length > 0) {
    // Obtener ID del método de pago "efectivo"
    const metodoPagoEfectivo = await prisma.metodos_pago.findFirst({
      where: { nombre: { contains: 'efectivo', mode: 'insensitive' } },
      select: { id: true }
    })

    if (metodoPagoEfectivo) {
      const pagosEfectivo = await prisma.pagos_venta.aggregate({
        where: {
          metodo_pago_id: metodoPagoEfectivo.id,
          venta: {
            turno_caja_id: { in: turnoIds },
            estado: { not: 'cancelada' }
          }
        },
        _sum: { monto: true }
      })
      
      totalVentasEfectivo = Number(pagosEfectivo._sum.monto || 0)
    }
  }

  console.log(`   💵 Ventas efectivo (desde base): $${totalVentasEfectivo.toLocaleString('es-CO')}`)

  // Retiros desde la fecha base
  const whereRetiros: any = {
    sesion_caja_id: sessionId,
    estado: 'aprobado'
  }
  
  if (fechaDesde) {
    whereRetiros.fecha_solicitud = { gt: fechaDesde }
  }

  const retiros = await prisma.retiros_caja.aggregate({
    where: whereRetiros,
    _sum: { monto: true }
  })

  const totalRetiros = Number(retiros._sum.monto || 0)
  console.log(`   💵 Retiros completados (desde base): -$${totalRetiros.toLocaleString('es-CO')}`)

  // Gastos en efectivo desde la fecha base
  const whereGastos: any = {
    sesion_caja_id: sessionId,
    metodo_pago: 'efectivo'
  }
  
  if (fechaDesde) {
    whereGastos.fecha_gasto = { gt: fechaDesde }
  }

  const gastos = await prisma.gastos_caja.aggregate({
    where: whereGastos,
    _sum: { monto: true }
  })

  const totalGastos = Number(gastos._sum.monto || 0)
  console.log(`   💵 Gastos en efectivo (desde base): -$${totalGastos.toLocaleString('es-CO')}`)

  // 5. CÁLCULO FINAL
  const efectivoDisponible =
    efectivoBase +
    totalVentasEfectivo +
    ingresosEfectivo -
    egresosEfectivo -
    totalRetiros -
    totalGastos

  console.log(`\n   ✅ EFECTIVO DISPONIBLE: $${efectivoDisponible.toLocaleString('es-CO')}`)
  console.log(`   ${efectivoDisponible < 0 ? '⚠️ FALTANTE DETECTADO' : efectivoDisponible < 50000 ? '⚠️ EFECTIVO BAJO' : '✅ EFECTIVO SUFICIENTE'}`)

  return efectivoDisponible
}

/**
 * 🛡️ FASE 4: Validar si hay suficiente efectivo para una operación
 * 
 * Valida que haya efectivo disponible antes de realizar operaciones que requieran efectivo.
 * Previene efectivo negativo y proporciona mensajes descriptivos.
 * 
 * @param sessionId - ID de la sesión de caja
 * @param montoRequerido - Monto que se necesita en efectivo
 * @returns Objeto con validación y mensaje descriptivo
 */
export async function validarEfectivoSuficiente(
  sessionId: number,
  montoRequerido: number
): Promise<{
  valido: boolean
  efectivoDisponible: number
  mensaje: string
  alertaBajoEfectivo: boolean
}> {
  console.log(`\n🛡️ [validarEfectivoSuficiente] Validando $${montoRequerido.toLocaleString('es-CO')} para sesión ${sessionId}`)

  const efectivoDisponible = await getEfectivoDisponible(sessionId)
  const efectivoDespues = efectivoDisponible - montoRequerido

  // Validar si hay suficiente efectivo
  if (efectivoDisponible < montoRequerido) {
    console.error(`❌ [validarEfectivoSuficiente] Efectivo insuficiente`)
    return {
      valido: false,
      efectivoDisponible,
      mensaje: `Efectivo insuficiente. Disponible: $${efectivoDisponible.toLocaleString('es-CO')}, Requerido: $${montoRequerido.toLocaleString('es-CO')}`,
      alertaBajoEfectivo: false
    }
  }

  // Verificar si quedará con poco efectivo
  const alertaBajoEfectivo = efectivoDespues < 50000 && efectivoDespues >= 0

  if (alertaBajoEfectivo) {
    console.warn(`⚠️ [validarEfectivoSuficiente] Alerta: Efectivo quedará bajo ($${efectivoDespues.toLocaleString('es-CO')})`)
  }

  console.log(`✅ [validarEfectivoSuficiente] Validación exitosa`)

  return {
    valido: true,
    efectivoDisponible,
    mensaje: alertaBajoEfectivo
      ? `⚠️ Advertencia: Efectivo quedará bajo ($${efectivoDespues.toLocaleString('es-CO')}). ¿Deseas continuar?`
      : 'Efectivo suficiente para la operación',
    alertaBajoEfectivo
  }
}

/**
 * 📊 FASE 4: Verificar estado del efectivo en caja
 * 
 * Proporciona un análisis del estado del efectivo sin requerir monto de operación.
 * Útil para dashboards y alertas preventivas.
 * 
 * @param sessionId - ID de la sesión de caja
 * @returns Estado del efectivo con alertas
 */
export async function verificarEstadoEfectivo(sessionId: number): Promise<{
  efectivoDisponible: number
  estado: 'critico' | 'bajo' | 'normal' | 'alto'
  mensaje: string
  alerta: boolean
}> {
  const efectivoDisponible = await getEfectivoDisponible(sessionId)

  let estado: 'critico' | 'bajo' | 'normal' | 'alto'
  let mensaje: string
  let alerta: boolean

  if (efectivoDisponible < 0) {
    estado = 'critico'
    mensaje = `🔴 CRÍTICO: Faltante de efectivo ($${Math.abs(efectivoDisponible).toLocaleString('es-CO')})`
    alerta = true
  } else if (efectivoDisponible < 50000) {
    estado = 'bajo'
    mensaje = `🟡 BAJO: Efectivo disponible ($${efectivoDisponible.toLocaleString('es-CO')}). Considere hacer retiros parciales o ajustes.`
    alerta = true
  } else if (efectivoDisponible < 200000) {
    estado = 'normal'
    mensaje = `🟢 NORMAL: Efectivo disponible ($${efectivoDisponible.toLocaleString('es-CO')})`
    alerta = false
  } else {
    estado = 'alto'
    mensaje = `🔵 ALTO: Efectivo disponible ($${efectivoDisponible.toLocaleString('es-CO')}). Considere realizar retiros para seguridad.`
    alerta = false
  }

  return {
    efectivoDisponible,
    estado,
    mensaje,
    alerta
  }
}

/**
 * 💳 FUNCIÓN CRÍTICA: Validar saldo disponible por método de pago
 * 
 * Valida que haya saldo suficiente para hacer un egreso según el método de pago:
 * - EFECTIVO: Puede tener saldo negativo (préstamo temporal)
 * - NEQUI, TARJETA, TRANSFERENCIA: NO pueden tener saldo negativo
 * 
 * @param sessionId - ID de la sesión de caja
 * @param metodoPago - Método de pago a validar
 * @param montoRequerido - Monto que se desea retirar/gastar
 * @returns Validación con saldo disponible y mensaje
 */
export async function validarSaldoPorMetodoPago(
  sessionId: number,
  metodoPago: 'efectivo' | 'nequi' | 'tarjeta' | 'transferencia',
  montoRequerido: number
): Promise<{
  valido: boolean
  saldoDisponible: number
  mensaje: string
}> {
  console.log(`\n💳 [validarSaldoPorMetodoPago] Validando ${metodoPago.toUpperCase()} - Monto: $${montoRequerido.toLocaleString('es-CO')}`)

  // 1. Para efectivo, usar la validación existente
  if (metodoPago === 'efectivo') {
    const validacion = await validarEfectivoSuficiente(sessionId, montoRequerido)
    return {
      valido: validacion.valido,
      saldoDisponible: validacion.efectivoDisponible,
      mensaje: validacion.mensaje
    }
  }

  // 2. Para otros métodos de pago, calcular saldo exacto
  const session = await prisma.sesiones_caja.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      codigo_sesion: true,
      total_ventas_nequi: true,
      total_ventas_tarjeta: true,
      total_ventas_transferencia: true,
    }
  })

  if (!session) {
    throw new Error('Sesión no encontrada')
  }

  // 3. Calcular saldo según método de pago
  let saldoVentas = 0
  let campoTotal = ''

  switch (metodoPago) {
    case 'nequi':
      saldoVentas = Number(session.total_ventas_nequi || 0)
      campoTotal = 'Nequi'
      break
    case 'tarjeta':
      saldoVentas = Number(session.total_ventas_tarjeta || 0)
      campoTotal = 'Tarjeta'
      break
    case 'transferencia':
      saldoVentas = Number(session.total_ventas_transferencia || 0)
      campoTotal = 'Transferencia'
      break
  }

  // 4. Obtener egresos de este método de pago (gastos + movimientos)
  const gastos = await prisma.gastos_caja.aggregate({
    where: {
      sesion_caja_id: sessionId,
      metodo_pago: metodoPago,
    },
    _sum: {
      monto: true
    }
  })

  const movimientosEgreso = await prisma.movimientos_caja.aggregate({
    where: {
      sesion_caja_id: sessionId,
      metodo_pago: metodoPago,
      tipo_movimiento: 'egreso_operativo'
    },
    _sum: {
      monto: true
    }
  })

  const totalGastos = Number(gastos._sum.monto || 0)
  const totalEgresos = Number(movimientosEgreso._sum.monto || 0)

  // 5. Obtener ingresos adicionales de este método
  const movimientosIngreso = await prisma.movimientos_caja.aggregate({
    where: {
      sesion_caja_id: sessionId,
      metodo_pago: metodoPago,
      tipo_movimiento: 'ingreso_adicional'
    },
    _sum: {
      monto: true
    }
  })

  const totalIngresos = Number(movimientosIngreso._sum.monto || 0)

  // 6. Calcular saldo disponible
  const saldoDisponible = saldoVentas + totalIngresos - totalGastos - totalEgresos

  console.log(`   📊 Saldo ${campoTotal}:`)
  console.log(`      Ventas: $${saldoVentas.toLocaleString('es-CO')}`)
  console.log(`      Ingresos adicionales: $${totalIngresos.toLocaleString('es-CO')}`)
  console.log(`      Gastos: -$${totalGastos.toLocaleString('es-CO')}`)
  console.log(`      Egresos: -$${totalEgresos.toLocaleString('es-CO')}`)
  console.log(`      DISPONIBLE: $${saldoDisponible.toLocaleString('es-CO')}`)

  // 7. Validar saldo
  if (saldoDisponible < montoRequerido) {
    console.error(`   ❌ Saldo insuficiente en ${campoTotal}`)
    return {
      valido: false,
      saldoDisponible,
      mensaje: `Saldo insuficiente en ${campoTotal}. Disponible: $${saldoDisponible.toLocaleString('es-CO')}, Requerido: $${montoRequerido.toLocaleString('es-CO')}`
    }
  }

  console.log(`   ✅ Saldo suficiente en ${campoTotal}`)
  return {
    valido: true,
    saldoDisponible,
    mensaje: `Saldo suficiente en ${campoTotal}`
  }
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

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    // ⭐ NUEVO: Validar que no haya turnos activos
    console.log(`🔍 Verificando turnos activos en sesión ${sessionId}`)
    const turnosActivos = await tx.turnos_caja.findMany({
      where: {
        sesion_caja_id: sessionId,
        estado: 'activo'
      },
      include: {
        cajero: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      }
    })

    if (turnosActivos.length > 0) {
      const cajerosConTurnos = turnosActivos.map(t => 
        `${t.cajero.nombre} ${t.cajero.apellido}`
      ).join(', ')
      
      throw new Error(
        `No se puede cerrar la sesión. Hay ${turnosActivos.length} turno(s) activo(s): ${cajerosConTurnos}. ` +
        `Todos los turnos deben cerrarse antes de cerrar la sesión.`
      )
    }

    console.log(`✅ No hay turnos activos, procediendo con cierre de sesión`)

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
      where: { sesion_caja_id: sessionId, estado: 'completado' },
    }),
    prisma.gastos_caja.findMany({
      where: { sesion_caja_id: sessionId },
    }),
  ])

  if (!session) {
    throw new Error('Sesión no encontrada')
  }

  // ✅ Calcular totales de movimientos DESGLOSADOS por método de pago

  // EFECTIVO
  const totalIngresosEfectivo = movimientos
    .filter((m) => m.tipo_movimiento === 'ingreso_adicional' && m.metodo_pago === 'efectivo')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const totalEgresosEfectivo = movimientos
    .filter((m) => m.tipo_movimiento === 'egreso_operativo' && m.metodo_pago === 'efectivo')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  // NEQUI
  const totalIngresosNequi = movimientos
    .filter((m) => m.tipo_movimiento === 'ingreso_adicional' && m.metodo_pago === 'nequi')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const totalEgresosNequi = movimientos
    .filter((m) => m.tipo_movimiento === 'egreso_operativo' && m.metodo_pago === 'nequi')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  // TARJETA
  const totalIngresosTarjeta = movimientos
    .filter((m) => m.tipo_movimiento === 'ingreso_adicional' && m.metodo_pago === 'tarjeta')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const totalEgresosTarjeta = movimientos
    .filter((m) => m.tipo_movimiento === 'egreso_operativo' && m.metodo_pago === 'tarjeta')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  // TRANSFERENCIA
  const totalIngresosTransferencia = movimientos
    .filter((m) => m.tipo_movimiento === 'ingreso_adicional' && m.metodo_pago === 'transferencia')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const totalEgresosTransferencia = movimientos
    .filter((m) => m.tipo_movimiento === 'egreso_operativo' && m.metodo_pago === 'transferencia')
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

  // Calcular ventas en efectivo
  const ventasEfectivo = Number(session.total_ventas_efectivo || 0)

  // Calcular total de ventas (todos los métodos)
  const totalVentas =
    Number(session.total_ventas_efectivo || 0) +
    Number(session.total_ventas_nequi || 0) +
    Number(session.total_ventas_tarjeta || 0) +
    Number(session.total_ventas_transferencia || 0)

  // ✅ USAR FUNCIÓN CENTRALIZADA para efectivo esperado
  const efectivoEsperado = await getEfectivoDisponible(sessionId)

  // ✅ OBTENER PANEL DE EFECTIVO con desglose por método
  let panelData
  try {
    panelData = await getEfectivoPanelData(sessionId)
  } catch (error) {
    console.warn('No se pudo obtener panel de efectivo:', error)
    panelData = null
  }

  return {
    session,
    ventas: {
      efectivo: ventasEfectivo,
      total: totalVentas,
    },
    movimientos: {
      total: movimientos.length,
      ingresos: totalIngresos,
      egresos: totalEgresos,
      // Desglose por método de pago
      ingresosEfectivo: totalIngresosEfectivo,
      egresosEfectivo: totalEgresosEfectivo,
      ingresosNequi: totalIngresosNequi,
      egresosNequi: totalEgresosNequi,
      ingresosTarjeta: totalIngresosTarjeta,
      egresosTarjeta: totalEgresosTarjeta,
      ingresosTransferencia: totalIngresosTransferencia,
      egresosTransferencia: totalEgresosTransferencia,
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
    // ✅ Incluir datos del panel por método de pago
    ...(panelData ? {
      efectivo: panelData.efectivo,
      nequi: panelData.nequi,
      tarjeta: panelData.tarjeta,
      transferencia: panelData.transferencia,
      totales: panelData.totales,
    } : {}),
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

/**
 * 📊 FASE 5: Panel de Efectivo en Tiempo Real
 * 
 * Obtiene todos los datos necesarios para mostrar un dashboard completo
 * del estado del efectivo en caja.
 * 
 * @param sessionId - ID de la sesión de caja
 * @returns Datos completos del panel de efectivo
 */
export async function getEfectivoPanelData(sessionId: number) {
  console.log(`\n📊 [getEfectivoPanelData] Obteniendo datos para sesión ${sessionId}`)

  // 1. Obtener sesión
  const session = await prisma.sesiones_caja.findUnique({
    where: { id: sessionId },
    include: {
      caja: {
        select: {
          nombre: true,
          ubicacion: true
        }
      },
      cajero: {
        select: {
          nombre: true,
          apellido: true
        }
      }
    }
  })

  if (!session) {
    throw new Error('Sesión no encontrada')
  }

  // 2. Calcular efectivo disponible y estado
  const efectivoDisponible = await getEfectivoDisponible(sessionId)
  const estadoEfectivo = await verificarEstadoEfectivo(sessionId)

  // 3. Obtener movimientos extra (ingresos y egresos) por método de pago
  const movimientosExtra = await prisma.movimientos_caja.findMany({
    where: {
      sesion_caja_id: sessionId,
      tipo_movimiento: {
        in: ['ingreso_adicional', 'egreso_operativo']
      }
    },
    select: {
      id: true,
      tipo_movimiento: true,
      metodo_pago: true,
      monto: true
    }
  })

  console.log(`📊 [getEfectivoPanelData] Total movimientos extra encontrados:`, movimientosExtra.length)
  console.log(`📊 [getEfectivoPanelData] Movimientos:`, JSON.stringify(movimientosExtra, null, 2))

  // Calcular ingresos/egresos por método de pago
  const calcularPorMetodo = (tipo: string, metodo: string) => {
    return movimientosExtra
      .filter(m => m.tipo_movimiento === tipo && m.metodo_pago === metodo)
      .reduce((sum, m) => sum + Number(m.monto), 0)
  }

  // Ingresos extra por método
  const ingresosExtraEfectivo = calcularPorMetodo('ingreso_adicional', 'efectivo')
  const ingresosExtraNequi = calcularPorMetodo('ingreso_adicional', 'nequi')
  const ingresosExtraTarjeta = calcularPorMetodo('ingreso_adicional', 'tarjeta')
  const ingresosExtraTransferencia = calcularPorMetodo('ingreso_adicional', 'transferencia')

  console.log(`📊 [getEfectivoPanelData] Ingresos Extra por método:`, {
    efectivo: ingresosExtraEfectivo,
    nequi: ingresosExtraNequi,
    tarjeta: ingresosExtraTarjeta,
    transferencia: ingresosExtraTransferencia
  })

  // Egresos extra por método
  const egresosExtraEfectivo = calcularPorMetodo('egreso_operativo', 'efectivo')
  const egresosExtraNequi = calcularPorMetodo('egreso_operativo', 'nequi')
  const egresosExtraTarjeta = calcularPorMetodo('egreso_operativo', 'tarjeta')
  const egresosExtraTransferencia = calcularPorMetodo('egreso_operativo', 'transferencia')

  // 4. Obtener retiros completados (siempre en efectivo)
  const totalRetiros = Number(session.total_retiros || 0)

  // 5. Obtener gastos por método de pago
  const gastos = await prisma.gastos_caja.findMany({
    where: { sesion_caja_id: sessionId },
    select: {
      monto: true,
      metodo_pago: true
    }
  })

  const gastosEfectivo = gastos
    .filter(g => g.metodo_pago === 'efectivo')
    .reduce((sum, g) => sum + Number(g.monto), 0)

  const gastosNequi = gastos
    .filter(g => g.metodo_pago === 'nequi')
    .reduce((sum, g) => sum + Number(g.monto), 0)

  const gastosTarjeta = gastos
    .filter(g => g.metodo_pago === 'tarjeta')
    .reduce((sum, g) => sum + Number(g.monto), 0)

  const gastosTransferencia = gastos
    .filter(g => g.metodo_pago === 'transferencia')
    .reduce((sum, g) => sum + Number(g.monto), 0)

  const totalGastos = Number(session.total_gastos || 0)

  // 6. Obtener retiros pendientes (en tránsito)
  const retirosPendientes = await prisma.retiros_caja.findMany({
    where: {
      sesion_caja_id: sessionId,
      estado: {
        in: ['pendiente', 'autorizado']
      }
    },
    select: {
      monto: true
    }
  })

  const efectivoEnTransito = retirosPendientes.reduce(
    (sum, r) => sum + Number(r.monto),
    0
  )

  // 7. Obtener últimos 10 movimientos
  const movimientosRecientes = await prisma.movimientos_caja.findMany({
    where: {
      sesion_caja_id: sessionId
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true
        }
      },
      venta: {
        select: {
          codigo_venta: true
        }
      }
    },
    orderBy: {
      fecha_movimiento: 'desc'
    },
    take: 10
  })

  // 8. Calcular totales de ventas
  const totalVentas =
    Number(session.total_ventas_efectivo || 0) +
    Number(session.total_ventas_nequi || 0) +
    Number(session.total_ventas_tarjeta || 0) +
    Number(session.total_ventas_transferencia || 0)

  // 9. Calcular disponible por método de pago
  const disponibleEfectivo =
    Number(session.fondo_inicial) +
    Number(session.total_ventas_efectivo || 0) +
    ingresosExtraEfectivo -
    egresosExtraEfectivo -
    totalRetiros -
    gastosEfectivo

  const disponibleNequi =
    Number(session.total_ventas_nequi || 0) +
    ingresosExtraNequi -
    egresosExtraNequi -
    gastosNequi

  const disponibleTarjeta =
    Number(session.total_ventas_tarjeta || 0) +
    ingresosExtraTarjeta -
    egresosExtraTarjeta -
    gastosTarjeta

  const disponibleTransferencia =
    Number(session.total_ventas_transferencia || 0) +
    ingresosExtraTransferencia -
    egresosExtraTransferencia -
    gastosTransferencia

  const totalDisponible = disponibleEfectivo + disponibleNequi + disponibleTarjeta + disponibleTransferencia

  console.log(`✅ [getEfectivoPanelData] Datos obtenidos exitosamente`)

  return {
    sesion: {
      id: session.id,
      codigo: session.codigo_sesion,
      caja: session.caja.nombre,
      cajero: `${session.cajero.nombre} ${session.cajero.apellido}`,
      fecha_apertura: session.fecha_apertura,
      estado: session.estado
    },

    // Composición por método de pago
    efectivo: {
      fondoInicial: Number(session.fondo_inicial),
      ventas: Number(session.total_ventas_efectivo || 0),
      ingresos: ingresosExtraEfectivo,
      egresos: egresosExtraEfectivo,
      retiros: totalRetiros,
      gastos: gastosEfectivo,
      disponible: disponibleEfectivo
    },

    nequi: {
      ventas: Number(session.total_ventas_nequi || 0),
      ingresos: ingresosExtraNequi,
      egresos: egresosExtraNequi,
      gastos: gastosNequi,
      disponible: disponibleNequi
    },

    tarjeta: {
      ventas: Number(session.total_ventas_tarjeta || 0),
      ingresos: ingresosExtraTarjeta,
      egresos: egresosExtraTarjeta,
      gastos: gastosTarjeta,
      disponible: disponibleTarjeta
    },

    transferencia: {
      ventas: Number(session.total_ventas_transferencia || 0),
      ingresos: ingresosExtraTransferencia,
      egresos: egresosExtraTransferencia,
      gastos: gastosTransferencia,
      disponible: disponibleTransferencia
    },

    // Totales generales
    totales: {
      totalVentas,
      totalDisponible,
      efectivoEnTransito
    },

    // Estado y alertas
    estado: {
      tipo: estadoEfectivo.estado,
      mensaje: estadoEfectivo.mensaje,
      alerta: estadoEfectivo.alerta,
      bajoEfectivo: efectivoDisponible < 50000 && efectivoDisponible >= 0,
      efectivoNegativo: efectivoDisponible < 0
    },

    // Movimientos recientes
    movimientosRecientes: movimientosRecientes.map(m => ({
      id: m.id,
      fecha: m.fecha_movimiento,
      tipo: m.tipo_movimiento,
      metodoPago: m.metodo_pago,
      monto: Number(m.monto),
      descripcion: m.descripcion,
      usuario: m.usuario ? `${m.usuario.nombre} ${m.usuario.apellido}` : null,
      venta: m.venta?.codigo_venta || null
    }))
  }
}

/**
 * 🔍 FASE 5: Auditoría de Diferencias en Caja
 * 
 * Detecta inconsistencias y problemas en los registros de la sesión de caja.
 * Útil para encontrar errores de registro y asegurar integridad de datos.
 * 
 * @param sessionId - ID de la sesión de caja
 * @returns Reporte completo de auditoría con inconsistencias detectadas
 */
export async function auditarDiferenciasCaja(sessionId: number) {
  console.log(`\n🔍 [auditarDiferenciasCaja] Iniciando auditoría para sesión ${sessionId}`)

  const inconsistencias: Array<{
    tipo: string
    severidad: 'baja' | 'media' | 'alta' | 'critica'
    mensaje: string
    detalle?: any
  }> = []

  // 1. Verificar que la sesión existe
  const session = await prisma.sesiones_caja.findUnique({
    where: { id: sessionId }
  })

  if (!session) {
    throw new Error('Sesión no encontrada')
  }

  // 2. Verificar que todas las ventas tienen movimientos
  const movimientosSesion = await prisma.movimientos_caja.findMany({
    where: { sesion_caja_id: sessionId, tipo_movimiento: 'venta', venta_id: { not: null } },
    select: { venta_id: true }
  })
  const ventaIds = movimientosSesion.map(m => m.venta_id!).filter(Boolean)
  const ventas = await prisma.ventas.findMany({
    where: { id: { in: ventaIds } },
    include: {
      pagos_venta: {
        include: {
          metodo_pago: true
        }
      }
    }
  })

  for (const venta of ventas) {
    const movimientos = await prisma.movimientos_caja.findMany({
      where: {
        venta_id: venta.id,
        tipo_movimiento: 'venta'
      }
    })

    // Cada método de pago debe tener su movimiento
    if (movimientos.length !== venta.pagos_venta.length) {
      inconsistencias.push({
        tipo: 'venta_sin_movimiento_completo',
        severidad: 'alta',
        mensaje: `Venta ${venta.codigo_venta} tiene ${venta.pagos_venta.length} pagos pero solo ${movimientos.length} movimientos`,
        detalle: {
          venta_id: venta.id,
          codigo_venta: venta.codigo_venta,
          pagos_esperados: venta.pagos_venta.length,
          movimientos_encontrados: movimientos.length
        }
      })
    }
  }

  // 3. Verificar que todos los retiros completados tienen movimientos
  const retirosCompletados = await prisma.retiros_caja.findMany({
    where: {
      sesion_caja_id: sessionId,
      estado: 'completado'
    }
  })

  for (const retiro of retirosCompletados) {
    const movimiento = await prisma.movimientos_caja.findFirst({
      where: {
        sesion_caja_id: sessionId,
        tipo_movimiento: 'retiro_caja',
        monto: retiro.monto
      }
    })

    if (!movimiento) {
      inconsistencias.push({
        tipo: 'retiro_sin_movimiento',
        severidad: 'media',
        mensaje: `Retiro completado de $${Number(retiro.monto).toLocaleString('es-CO')} no tiene movimiento asociado`,
        detalle: {
          retiro_id: retiro.id,
          monto: Number(retiro.monto),
          motivo: retiro.motivo
        }
      })
    }
  }

  // 4. Verificar que todos los gastos tienen movimientos
  const gastos = await prisma.gastos_caja.findMany({
    where: { sesion_caja_id: sessionId }
  })

  for (const gasto of gastos) {
    const movimiento = await prisma.movimientos_caja.findFirst({
      where: {
        sesion_caja_id: sessionId,
        tipo_movimiento: 'gasto_operativo',
        monto: gasto.monto
      }
    })

    if (!movimiento) {
      inconsistencias.push({
        tipo: 'gasto_sin_movimiento',
        severidad: 'media',
        mensaje: `Gasto de $${Number(gasto.monto).toLocaleString('es-CO')} (${gasto.categoria_gasto}) no tiene movimiento asociado`,
        detalle: {
          gasto_id: gasto.id,
          monto: Number(gasto.monto),
          categoria: gasto.categoria_gasto,
          descripcion: gasto.descripcion
        }
      })
    }
  }

  // 5. Detectar movimientos huérfanos (sin referencia)
  const movimientosHuerfanos = await prisma.movimientos_caja.findMany({
    where: {
      sesion_caja_id: sessionId,
      tipo_movimiento: 'venta',
      venta_id: null
    }
  })

  if (movimientosHuerfanos.length > 0) {
    inconsistencias.push({
      tipo: 'movimientos_huerfanos',
      severidad: 'media',
      mensaje: `${movimientosHuerfanos.length} movimientos de venta sin referencia a venta`,
      detalle: {
        cantidad: movimientosHuerfanos.length,
        movimientos: movimientosHuerfanos.map(m => ({
          id: m.id,
          monto: Number(m.monto),
          fecha: m.fecha_movimiento
        }))
      }
    })
  }

  // 6. Calcular efectivo esperado manualmente y comparar
  const efectivoCalculado = await getEfectivoDisponible(sessionId)
  const efectivoRegistrado = session.efectivo_esperado
    ? Number(session.efectivo_esperado)
    : null

  if (efectivoRegistrado !== null) {
    const diferencia = Math.abs(efectivoCalculado - efectivoRegistrado)

    if (diferencia > 0.01) { // Tolerancia de $0.01 por redondeos
      inconsistencias.push({
        tipo: 'diferencia_calculo',
        severidad: diferencia > 1000 ? 'alta' : diferencia > 100 ? 'media' : 'baja',
        mensaje: `Diferencia de $${diferencia.toLocaleString('es-CO')} entre efectivo calculado y registrado`,
        detalle: {
          efectivo_calculado: efectivoCalculado,
          efectivo_registrado: efectivoRegistrado,
          diferencia
        }
      })
    }
  }

  // 7. Verificar efectivo negativo
  if (efectivoCalculado < 0) {
    inconsistencias.push({
      tipo: 'efectivo_negativo',
      severidad: 'critica',
      mensaje: `Efectivo disponible es negativo: $${efectivoCalculado.toLocaleString('es-CO')}`,
      detalle: {
        efectivo_disponible: efectivoCalculado
      }
    })
  }

  // 8. Resumen por severidad
  const resumenSeveridad = {
    critica: inconsistencias.filter(i => i.severidad === 'critica').length,
    alta: inconsistencias.filter(i => i.severidad === 'alta').length,
    media: inconsistencias.filter(i => i.severidad === 'media').length,
    baja: inconsistencias.filter(i => i.severidad === 'baja').length
  }

  const totalInconsistencias = inconsistencias.length
  const esConsistente = totalInconsistencias === 0

  console.log(`${esConsistente ? '✅' : '⚠️'} [auditarDiferenciasCaja] Auditoría completada: ${totalInconsistencias} inconsistencias encontradas`)

  return {
    sesion_id: sessionId,
    codigo_sesion: session.codigo_sesion,
    fecha_auditoria: new Date(),
    es_consistente: esConsistente,
    total_inconsistencias: totalInconsistencias,
    resumen_severidad: resumenSeveridad,
    inconsistencias,
    estadisticas: {
      total_ventas: ventas.length,
      total_retiros: retirosCompletados.length,
      total_gastos: gastos.length,
      total_movimientos: await prisma.movimientos_caja.count({
        where: { sesion_caja_id: sessionId }
      })
    },
    efectivo: {
      calculado: efectivoCalculado,
      registrado: efectivoRegistrado,
      diferencia: efectivoRegistrado ? Math.abs(efectivoCalculado - efectivoRegistrado) : null
    }
  }
}
