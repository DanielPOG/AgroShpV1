import { prisma } from '@/lib/prisma'
import type { IniciarTurno, CerrarTurno } from '@/lib/validations/turno-caja.schema'
import { 
  calcularEfectivoEsperadoTurno, 
  calcularDiferenciaTurno,
  calcularDuracionTurno 
} from '@/lib/validations/turno-caja.schema'

/**
 * 🎯 Obtener turno activo de una sesión
 * Solo puede haber un turno activo por sesión
 */
export async function getTurnoActivo(sesionCajaId: number, cajeroId?: number) {
  console.log(`🔍 Buscando turno activo para sesión ${sesionCajaId}${cajeroId ? ` y cajero ${cajeroId}` : ''}`)

  const whereCondition: any = {
    sesion_caja_id: sesionCajaId,
    estado: 'activo',
  }

  if (cajeroId) {
    whereCondition.cajero_id = cajeroId
  }

  const turno = await prisma.turnos_caja.findFirst({
    where: whereCondition,
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          rol: true,
        },
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          fecha_apertura: true,
          estado: true,
        },
      },
      autorizador: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
      turno_anterior: {
        select: {
          id: true,
          cajero_id: true,
          fecha_inicio: true,
          fecha_fin: true,
        },
      },
    },
    orderBy: {
      fecha_inicio: 'desc',
    },
  })

  if (turno) {
    console.log(`✅ Turno activo encontrado: ID ${turno.id} - Cajero: ${turno.cajero.nombre} ${turno.cajero.apellido}`)
  } else {
    console.log(`❌ No hay turno activo`)
  }

  return turno
}

/**
 * 🚀 Iniciar un nuevo turno
 * Valida que no haya otro turno activo en la sesión
 */
export async function iniciarTurno(data: IniciarTurno) {
  console.log(`\n🚀 [iniciarTurno] Iniciando turno para cajero ${data.cajero_id}`)
  console.log(`   📦 Sesión: ${data.sesion_caja_id}`)
  console.log(`   💵 Efectivo inicial: $${data.efectivo_inicial}`)
  console.log(`   🔄 Tipo relevo: ${data.tipo_relevo}`)

  // 1. Validar que la sesión existe y está abierta
  const sesion = await prisma.sesiones_caja.findUnique({
    where: { id: data.sesion_caja_id },
    select: {
      id: true,
      codigo_sesion: true,
      estado: true,
      cajero_id: true,
      caja_id: true,
      fondo_inicial: true,
      fecha_apertura: true,
    },
  })

  if (!sesion) {
    throw new Error('Sesión de caja no encontrada')
  }

  if (sesion.estado !== 'abierta') {
    throw new Error('La sesión de caja no está activa')
  }

  // 2. Validar que NO haya otro turno activo
  const turnoActivo = await getTurnoActivo(data.sesion_caja_id)
  if (turnoActivo) {
    throw new Error(`Ya existe un turno activo para el cajero ${turnoActivo.cajero.nombre} ${turnoActivo.cajero.apellido}`)
  }

  // 3. Determinar efectivo inicial según tipo de relevo
  let efectivoInicial = data.efectivo_inicial ?? 0
  let turnoAnteriorId = data.turno_anterior_id

  if (data.tipo_relevo === 'inicio_jornada') {
    // Para inicio de jornada, buscar si hay turnos previos en el día
    const inicioDelDia = new Date(sesion.fecha_apertura)
    inicioDelDia.setHours(0, 0, 0, 0)

    const ultimoTurnoDia = await prisma.turnos_caja.findFirst({
      where: {
        sesion_caja_id: data.sesion_caja_id,
        fecha_inicio: {
          gte: inicioDelDia,
        },
      },
      orderBy: {
        fecha_inicio: 'desc',
      },
      select: {
        id: true,
        efectivo_final: true,
      },
    })

    if (ultimoTurnoDia && ultimoTurnoDia.efectivo_final) {
      // Si hay un turno previo en el día, usar su efectivo final
      efectivoInicial = Number(ultimoTurnoDia.efectivo_final)
      turnoAnteriorId = ultimoTurnoDia.id
      console.log(`   📌 Turno previo encontrado (ID ${ultimoTurnoDia.id}), usando efectivo final: $${efectivoInicial}`)
    } else {
      // Si es el primer turno del día, usar fondo inicial de la sesión
      efectivoInicial = Number(sesion.fondo_inicial)
      console.log(`   📌 Primer turno del día, usando fondo inicial de sesión: $${efectivoInicial}`)
    }
  } else if (data.tipo_relevo === 'cambio_turno' && data.turno_anterior_id) {
    // Para cambio de turno, validar turno anterior
    const turnoAnterior = await prisma.turnos_caja.findUnique({
      where: { id: data.turno_anterior_id },
      select: {
        id: true,
        estado: true,
        efectivo_final: true,
      },
    })

    if (!turnoAnterior) {
      throw new Error('El turno anterior especificado no existe')
    }

    if (turnoAnterior.estado !== 'finalizado') {
      throw new Error('El turno anterior debe estar finalizado antes de iniciar el relevo')
    }

    // Usar el efectivo final del turno anterior
    if (turnoAnterior.efectivo_final) {
      efectivoInicial = Number(turnoAnterior.efectivo_final)
      console.log(`   📌 Usando efectivo final del turno anterior (ID ${turnoAnterior.id}): $${efectivoInicial}`)
    }
  }

  // 4. Crear el nuevo turno
  const nuevoTurno = await prisma.turnos_caja.create({
    data: {
      sesion_caja_id: data.sesion_caja_id,
      cajero_id: data.cajero_id,
      caja_id: sesion.caja_id,
      efectivo_inicial: efectivoInicial,
      monto_inicial: efectivoInicial, // Al inicio, monto_inicial = efectivo_inicial
      tipo_relevo: data.tipo_relevo,
      observaciones_inicio: data.observaciones_inicio,
      turno_anterior_id: turnoAnteriorId,
      autorizado_por: data.autorizado_por,
      fecha_inicio: new Date(),
      estado: 'activo',
    },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
        },
      },
    },
  })

  console.log(`✅ [iniciarTurno] Turno ${nuevoTurno.id} creado exitosamente`)
  console.log(`   👤 Cajero: ${nuevoTurno.cajero.nombre} ${nuevoTurno.cajero.apellido}`)
  console.log(`   � Efectivo inicial: $${efectivoInicial}`)
  console.log(`   �📅 Inicio: ${nuevoTurno.fecha_inicio}`)

  return nuevoTurno
}

/**
 * 🏁 Cerrar un turno
 * Calcula automáticamente totales y diferencias
 */
export async function cerrarTurno(data: CerrarTurno) {
  console.log(`\n🏁 [cerrarTurno] Cerrando turno ${data.turno_id}`)
  console.log(`   💵 Efectivo final contado: $${data.efectivo_final}`)

  // 1. Validar que el turno existe y está activo
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: data.turno_id },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
        },
      },
    },
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  if (turno.estado !== 'activo') {
    throw new Error('El turno no está activo')
  }

  // 1.5. Validar que NO hay retiros pendientes
  const retirosPendientes = await prisma.retiros_caja.count({
    where: {
      turno_caja_id: data.turno_id,
      estado: 'pendiente',
    },
  })

  if (retirosPendientes > 0) {
    throw new Error(`No puedes cerrar el turno. Tienes ${retirosPendientes} retiro(s) pendiente(s) de autorización. Espera a que sean autorizados o rechazados.`)
  }

  // 2. Calcular totales del turno
  console.log(`📊 [cerrarTurno] Calculando totales del turno...`)

  // Obtener ID del método de pago efectivo
  const metodoPagoEfectivo = await prisma.metodos_pago.findFirst({
    where: {
      nombre: {
        equals: 'efectivo',
        mode: 'insensitive',
      },
    },
  })

  // Ventas en efectivo del turno
  const ventasEfectivo = await prisma.pagos_venta.aggregate({
    where: {
      venta: {
        turno_caja_id: data.turno_id,
      },
      metodo_pago_id: metodoPagoEfectivo?.id,
    },
    _sum: {
      monto: true,
    },
  })

  const totalVentasEfectivo = Number(ventasEfectivo._sum.monto || 0)
  console.log(`   💰 Ventas en efectivo: $${totalVentasEfectivo.toLocaleString('es-CO')}`)

  // Retiros del turno
  const retiros = await prisma.retiros_caja.aggregate({
    where: {
      turno_caja_id: data.turno_id,
      estado: 'aprobado',
    },
    _sum: {
      monto: true,
    },
  })

  const totalRetiros = Number(retiros._sum.monto || 0)
  console.log(`   📤 Retiros: $${totalRetiros.toLocaleString('es-CO')}`)

  // Gastos en efectivo del turno
  const gastos = await prisma.gastos_caja.aggregate({
    where: {
      turno_caja_id: data.turno_id,
      metodo_pago: 'efectivo',
    },
    _sum: {
      monto: true,
    },
  })

  const totalGastos = Number(gastos._sum.monto || 0)
  console.log(`   💸 Gastos: $${totalGastos.toLocaleString('es-CO')}`)

  // Movimientos adicionales de efectivo
  const movimientosIngreso = await prisma.movimientos_caja.aggregate({
    where: {
      turno_caja_id: data.turno_id,
      tipo_movimiento: 'ingreso_adicional',
      metodo_pago: 'efectivo',
    },
    _sum: {
      monto: true,
    },
  })

  const movimientosEgreso = await prisma.movimientos_caja.aggregate({
    where: {
      turno_caja_id: data.turno_id,
      tipo_movimiento: 'egreso_operativo',
      metodo_pago: 'efectivo',
    },
    _sum: {
      monto: true,
    },
  })

  const totalIngresosAdicionales = Number(movimientosIngreso._sum.monto || 0)
  const totalEgresosOperativos = Number(movimientosEgreso._sum.monto || 0)

  // 3. Calcular efectivo esperado y diferencia
  const efectivoInicial = Number(turno.efectivo_inicial)
  const efectivoEsperado = calcularEfectivoEsperadoTurno(
    efectivoInicial,
    totalVentasEfectivo + totalIngresosAdicionales,
    totalRetiros,
    totalGastos + totalEgresosOperativos
  )

  const diferencia = calcularDiferenciaTurno(efectivoEsperado, data.efectivo_final)

  console.log(`   💵 Efectivo inicial: $${efectivoInicial.toLocaleString('es-CO')}`)
  console.log(`   📊 Efectivo esperado: $${efectivoEsperado.toLocaleString('es-CO')}`)
  console.log(`   🎯 Efectivo contado: $${data.efectivo_final.toLocaleString('es-CO')}`)
  console.log(`   ${diferencia >= 0 ? '💚' : '❌'} Diferencia: $${diferencia.toLocaleString('es-CO')} ${diferencia >= 0 ? '(sobrante)' : '(faltante)'}`)

  // 4. Cerrar el turno
  const turnoCerrado = await prisma.turnos_caja.update({
    where: { id: data.turno_id },
    data: {
      efectivo_final: data.efectivo_final,
      desglose_efectivo: data.desglose_efectivo as any,
      observaciones_cierre: data.observaciones_cierre,
      fecha_fin: new Date(),
      estado: 'finalizado',
    },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
        },
      },
    },
  })

  const duracion = calcularDuracionTurno(turno.fecha_inicio, turnoCerrado.fecha_fin!)
  console.log(`✅ [cerrarTurno] Turno cerrado exitosamente`)
  console.log(`   ⏱️ Duración: ${duracion.toFixed(2)} horas`)
  console.log(`   👤 Cajero: ${turnoCerrado.cajero.nombre} ${turnoCerrado.cajero.apellido}`)

  return {
    turno: turnoCerrado,
    resumen: {
      efectivo_inicial: efectivoInicial,
      efectivo_final: data.efectivo_final,
      efectivo_esperado: efectivoEsperado,
      diferencia,
      total_ventas_efectivo: totalVentasEfectivo,
      total_retiros: totalRetiros,
      total_gastos: totalGastos,
      duracion_horas: duracion,
    },
  }
}

/**
 * 🔍 Validar que exista un turno activo para realizar operaciones
 */
export async function validarTurnoActivo(sesionCajaId: number, cajeroId?: number) {
  const turno = await getTurnoActivo(sesionCajaId, cajeroId)

  if (!turno) {
    throw new Error('No hay un turno activo. Debe iniciar un turno antes de realizar operaciones.')
  }

  return turno
}

/**
 * 📊 Obtener resumen completo de un turno
 */
export async function getResumenTurno(turnoId: number) {
  console.log(`📊 Obteniendo resumen del turno ${turnoId}`)

  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
      sesion_caja: {
        select: {
          id: true,
          codigo_sesion: true,
          fecha_apertura: true,
        },
      },
      autorizador: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
      ventas: {
        select: {
          id: true,
          codigo_venta: true,
          total: true,
          fecha_venta: true,
        },
      },
      movimientos_caja: {
        select: {
          id: true,
          tipo_movimiento: true,
          metodo_pago: true,
          monto: true,
          descripcion: true,
          fecha_movimiento: true,
        },
      },
      retiros_caja: {
        select: {
          id: true,
          monto: true,
          motivo: true,
          estado: true,
          fecha_solicitud: true,
        },
      },
      gastos_caja: {
        select: {
          id: true,
          categoria_gasto: true,
          monto: true,
          descripcion: true,
          metodo_pago: true,
          fecha_gasto: true,
        },
      },
    },
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  // Calcular totales
  const totalVentas = turno.ventas.reduce((sum, v) => sum + Number(v.total), 0)
  const totalRetiros = turno.retiros_caja
    .filter(r => r.estado === 'aprobado')
    .reduce((sum, r) => sum + Number(r.monto), 0)
  const totalGastos = turno.gastos_caja.reduce((sum, g) => sum + Number(g.monto), 0)

  const duracion = turno.fecha_fin 
    ? calcularDuracionTurno(turno.fecha_inicio, turno.fecha_fin)
    : calcularDuracionTurno(turno.fecha_inicio, new Date())

  return {
    ...turno,
    resumen: {
      duracion_horas: duracion,
      total_ventas: totalVentas,
      total_retiros: totalRetiros,
      total_gastos: totalGastos,
      cantidad_ventas: turno.ventas.length,
      cantidad_retiros: turno.retiros_caja.length,
      cantidad_gastos: turno.gastos_caja.length,
    },
  }
}

/**
 * 📋 Obtener historial de turnos de una sesión
 */
export async function getTurnosPorSesion(sesionCajaId: number) {
  console.log(`📋 Obteniendo turnos de la sesión ${sesionCajaId}`)

  const turnos = await prisma.turnos_caja.findMany({
    where: {
      sesion_caja_id: sesionCajaId,
    },
    include: {
      cajero: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
    },
    orderBy: {
      fecha_inicio: 'asc',
    },
  })

  console.log(`✅ ${turnos.length} turnos encontrados`)

  return turnos
}

/**
 * 🔄 Suspender un turno (para pausas largas o emergencias)
 */
export async function suspenderTurno(turnoId: number, motivo: string, autorizadoPor: number) {
  console.log(`⏸️ Suspendiendo turno ${turnoId}`)

  const turno = await prisma.turnos_caja.update({
    where: { id: turnoId },
    data: {
      estado: 'suspendido',
      observaciones_cierre: motivo,
      autorizado_por: autorizadoPor,
    },
  })

  console.log(`✅ Turno ${turnoId} suspendido`)

  return turno
}

/**
 * ▶️ Reanudar un turno suspendido
 */
export async function reanudarTurno(turnoId: number, observaciones?: string) {
  console.log(`▶️ Reanudando turno ${turnoId}`)

  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
  })

  if (!turno) {
    throw new Error('Turno no encontrado')
  }

  if (turno.estado !== 'suspendido') {
    throw new Error('El turno no está suspendido')
  }

  const turnoReanudado = await prisma.turnos_caja.update({
    where: { id: turnoId },
    data: {
      estado: 'activo',
      observaciones_inicio: observaciones 
        ? `${turno.observaciones_inicio || ''}\nReanudado: ${observaciones}`.trim()
        : turno.observaciones_inicio,
    },
  })

  console.log(`✅ Turno ${turnoId} reanudado`)

  return turnoReanudado
}
