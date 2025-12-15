import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * 📊 REPORTES DE TURNOS DE CAJA
 * 
 * Funciones para generar reportes y analíticas de turnos individuales
 */

/**
 * Interfaz para resumen completo de un turno
 */
export interface ResumenTurno {
  turno: {
    id: number
    codigo_sesion: string
    cajero: {
      id: number
      nombre: string
      apellido: string
    }
    fecha_inicio: Date
    fecha_fin: Date | null
    duracion_minutos: number | null
    efectivo_inicial: number
    efectivo_final: number | null
    diferencia: number | null
    estado: string
    tipo_relevo: string
    observaciones: string | null
    observaciones_cierre: string | null
  }
  ventas: {
    cantidad: number
    total: number
    efectivo: number
    nequi: number
    tarjeta: number
    transferencia: number
    promedio: number
  }
  movimientos: {
    ingresos_adicionales: number
    egresos_operativos: number
  }
  retiros: {
    cantidad: number
    total: number
  }
  gastos: {
    cantidad: number
    total: number
  }
  efectivo_esperado: number
  resumen_pagos: Array<{
    metodo: string
    cantidad: number
    monto: number
  }>
}

/**
 * Obtener resumen completo de un turno específico
 */
export async function getResumenTurno(turnoId: number): Promise<ResumenTurno> {
  console.log(`📊 [getResumenTurno] Generando resumen para turno ${turnoId}`)

  // 1. Obtener datos del turno
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
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
          codigo_sesion: true,
        },
      },
    },
  })

  if (!turno) {
    throw new Error(`Turno ${turnoId} no encontrado`)
  }

  // 2. Obtener ventas del turno
  const ventas = await prisma.ventas.findMany({
    where: {
      turno_caja_id: turnoId,
      estado: 'completada',
    },
    include: {
      pagos_venta: {
        include: {
          metodo_pago: true,
        },
      },
    },
  })

  // Calcular totales por método de pago
  let totalVentas = 0
  let ventasEfectivo = 0
  let ventasNequi = 0
  let ventasTarjeta = 0
  let ventasTransferencia = 0

  const resumenPagos: Record<string, { cantidad: number; monto: number }> = {}

  ventas.forEach((venta) => {
    const total = Number(venta.total)
    totalVentas += total

    venta.pagos_venta.forEach((pago) => {
      const metodo = pago.metodo_pago?.nombre || 'Desconocido'
      const monto = Number(pago.monto)

      // Sumar por método específico
      if (!resumenPagos[metodo]) {
        resumenPagos[metodo] = { cantidad: 0, monto: 0 }
      }
      resumenPagos[metodo].cantidad++
      resumenPagos[metodo].monto += monto

      // Categorizar para totales
      const metodoLower = metodo.toLowerCase()
      if (metodoLower.includes('efectivo') || metodoLower.includes('cash')) {
        ventasEfectivo += monto
      } else if (metodoLower.includes('nequi')) {
        ventasNequi += monto
      } else if (metodoLower.includes('tarjeta') || metodoLower.includes('card')) {
        ventasTarjeta += monto
      } else if (metodoLower.includes('transferencia') || metodoLower.includes('bancolombia')) {
        ventasTransferencia += monto
      }
    })
  })

  // 3. Obtener movimientos (ingresos/egresos adicionales)
  const movimientos = await prisma.movimientos_caja.findMany({
    where: {
      turno_caja_id: turnoId,
      tipo_movimiento: {
        in: ['ingreso_adicional', 'egreso_operativo'],
      },
    },
  })

  const ingresosAdicionales = movimientos
    .filter((m) => m.tipo_movimiento === 'ingreso_adicional')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  const egresosOperativos = movimientos
    .filter((m) => m.tipo_movimiento === 'egreso_operativo')
    .reduce((sum, m) => sum + Number(m.monto), 0)

  // 4. Obtener retiros del turno
  const retiros = await prisma.retiros_caja.findMany({
    where: {
      turno_caja_id: turnoId,
      estado: 'completado',
    },
  })

  const totalRetiros = retiros.reduce((sum, r) => sum + Number(r.monto), 0)

  // 5. Obtener gastos del turno
  const gastos = await prisma.gastos_caja.findMany({
    where: {
      turno_caja_id: turnoId,
    },
  })

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0)

  // 6. Calcular efectivo esperado
  const efectivoEsperado =
    Number(turno.efectivo_inicial) +
    ventasEfectivo +
    ingresosAdicionales -
    egresosOperativos -
    totalRetiros -
    totalGastos

  // 7. Calcular duración
  const duracionMinutos = turno.fecha_fin
    ? Math.floor((turno.fecha_fin.getTime() - turno.fecha_inicio.getTime()) / 60000)
    : null

  console.log(`✅ [getResumenTurno] Resumen generado exitosamente`)
  console.log(`   - Ventas: ${ventas.length} ($${totalVentas.toLocaleString('es-CO')})`)
  console.log(`   - Efectivo esperado: $${efectivoEsperado.toLocaleString('es-CO')}`)

  return {
    turno: {
      id: turno.id,
      codigo_sesion: turno.sesion_caja.codigo_sesion,
      cajero: turno.cajero,
      fecha_inicio: turno.fecha_inicio,
      fecha_fin: turno.fecha_fin,
      duracion_minutos: duracionMinutos,
      efectivo_inicial: Number(turno.efectivo_inicial),
      efectivo_final: turno.efectivo_final ? Number(turno.efectivo_final) : null,
      diferencia: turno.diferencia ? Number(turno.diferencia) : null,
      estado: turno.estado,
      tipo_relevo: turno.tipo_relevo,
      observaciones: turno.observaciones,
      observaciones_cierre: turno.observaciones_cierre,
    },
    ventas: {
      cantidad: ventas.length,
      total: totalVentas,
      efectivo: ventasEfectivo,
      nequi: ventasNequi,
      tarjeta: ventasTarjeta,
      transferencia: ventasTransferencia,
      promedio: ventas.length > 0 ? totalVentas / ventas.length : 0,
    },
    movimientos: {
      ingresos_adicionales: ingresosAdicionales,
      egresos_operativos: egresosOperativos,
    },
    retiros: {
      cantidad: retiros.length,
      total: totalRetiros,
    },
    gastos: {
      cantidad: gastos.length,
      total: totalGastos,
    },
    efectivo_esperado: efectivoEsperado,
    resumen_pagos: Object.entries(resumenPagos).map(([metodo, datos]) => ({
      metodo,
      cantidad: datos.cantidad,
      monto: datos.monto,
    })),
  }
}

/**
 * Interfaz para comparación de turnos
 */
export interface ComparativoTurnos {
  turnos: Array<{
    id: number
    cajero: string
    fecha_inicio: Date
    duracion_minutos: number | null
    ventas_cantidad: number
    ventas_total: number
    efectivo_inicial: number
    efectivo_final: number | null
    diferencia: number | null
    estado: string
  }>
  totales: {
    turnos_completados: number
    turnos_activos: number
    ventas_totales: number
    monto_total: number
    diferencia_total: number
    promedio_ventas_por_turno: number
    promedio_monto_por_turno: number
  }
}

/**
 * Obtener comparativo de turnos (por sesión o rango de fechas)
 */
export async function getComparativoTurnos(filtros: {
  sesion_caja_id?: number
  fecha_desde?: Date
  fecha_hasta?: Date
  cajero_id?: number
  estado?: 'activo' | 'cerrado' | 'suspendido'
}): Promise<ComparativoTurnos> {
  console.log(`📊 [getComparativoTurnos] Generando comparativo con filtros:`, filtros)

  // Construir WHERE dinámicamente
  const where: any = {}

  if (filtros.sesion_caja_id) {
    where.sesion_caja_id = filtros.sesion_caja_id
  }

  if (filtros.fecha_desde || filtros.fecha_hasta) {
    where.fecha_inicio = {}
    if (filtros.fecha_desde) {
      where.fecha_inicio.gte = filtros.fecha_desde
    }
    if (filtros.fecha_hasta) {
      where.fecha_inicio.lte = filtros.fecha_hasta
    }
  }

  if (filtros.cajero_id) {
    where.cajero_id = filtros.cajero_id
  }

  if (filtros.estado) {
    where.estado = filtros.estado
  }

  // Obtener turnos
  const turnos = await prisma.turnos_caja.findMany({
    where,
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
      ventas: {
        where: {
          estado: 'completada',
        },
        select: {
          total: true,
        },
      },
    },
    orderBy: {
      fecha_inicio: 'desc',
    },
  })

  // Calcular datos por turno
  const turnosConDatos = turnos.map((turno) => {
    const ventasCantidad = turno.ventas.length
    const ventasTotal = turno.ventas.reduce((sum, v) => sum + Number(v.total), 0)

    const duracionMinutos = turno.fecha_fin
      ? Math.floor((turno.fecha_fin.getTime() - turno.fecha_inicio.getTime()) / 60000)
      : null

    return {
      id: turno.id,
      cajero: `${turno.cajero.nombre} ${turno.cajero.apellido}`,
      fecha_inicio: turno.fecha_inicio,
      duracion_minutos: duracionMinutos,
      ventas_cantidad: ventasCantidad,
      ventas_total: ventasTotal,
      efectivo_inicial: Number(turno.efectivo_inicial),
      efectivo_final: turno.efectivo_final ? Number(turno.efectivo_final) : null,
      diferencia: turno.diferencia ? Number(turno.diferencia) : null,
      estado: turno.estado,
    }
  })

  // Calcular totales
  const turnosCompletados = turnosConDatos.filter((t) => t.estado === 'cerrado').length
  const turnosActivos = turnosConDatos.filter((t) => t.estado === 'activo').length
  const ventasTotales = turnosConDatos.reduce((sum, t) => sum + t.ventas_cantidad, 0)
  const montoTotal = turnosConDatos.reduce((sum, t) => sum + t.ventas_total, 0)
  const diferenciaTotal = turnosConDatos
    .filter((t) => t.diferencia !== null)
    .reduce((sum, t) => sum + (t.diferencia || 0), 0)

  const promedioVentasPorTurno =
    turnosCompletados > 0 ? ventasTotales / turnosCompletados : 0
  const promedioMontoPorTurno = turnosCompletados > 0 ? montoTotal / turnosCompletados : 0

  console.log(`✅ [getComparativoTurnos] Comparativo generado: ${turnos.length} turnos`)

  return {
    turnos: turnosConDatos,
    totales: {
      turnos_completados: turnosCompletados,
      turnos_activos: turnosActivos,
      ventas_totales: ventasTotales,
      monto_total: montoTotal,
      diferencia_total: diferenciaTotal,
      promedio_ventas_por_turno: promedioVentasPorTurno,
      promedio_monto_por_turno: promedioMontoPorTurno,
    },
  }
}

/**
 * Interfaz para detalle de movimientos
 */
export interface DetalleMovimientosTurno {
  turno: {
    id: number
    cajero: string
    fecha_inicio: Date
  }
  ventas: Array<{
    id: number
    codigo_venta: string
    fecha: Date
    total: number
    cliente: string | null
    metodos_pago: string[]
  }>
  movimientos: Array<{
    id: number
    tipo: string
    monto: number
    descripcion: string | null
    fecha: Date
  }>
  retiros: Array<{
    id: number
    monto: number
    motivo: string
    estado: string
    fecha: Date
  }>
  gastos: Array<{
    id: number
    monto: number
    categoria: string
    descripcion: string
    fecha: Date
  }>
}

/**
 * Obtener detalle completo de movimientos de un turno
 */
export async function getDetalleMovimientosTurno(
  turnoId: number
): Promise<DetalleMovimientosTurno> {
  console.log(`📊 [getDetalleMovimientosTurno] Obteniendo movimientos del turno ${turnoId}`)

  // 1. Obtener turno
  const turno = await prisma.turnos_caja.findUnique({
    where: { id: turnoId },
    include: {
      cajero: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
    },
  })

  if (!turno) {
    throw new Error(`Turno ${turnoId} no encontrado`)
  }

  // 2. Obtener ventas
  const ventas = await prisma.ventas.findMany({
    where: {
      turno_caja_id: turnoId,
    },
    include: {
      cliente: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
      pagos_venta: {
        include: {
          metodo_pago: true,
        },
      },
    },
    orderBy: {
      fecha_venta: 'asc',
    },
  })

  // 3. Obtener movimientos de caja
  const movimientos = await prisma.movimientos_caja.findMany({
    where: {
      turno_caja_id: turnoId,
      tipo_movimiento: {
        in: ['ingreso_adicional', 'egreso_operativo'],
      },
    },
    orderBy: {
      fecha_movimiento: 'asc',
    },
  })

  // 4. Obtener retiros
  const retiros = await prisma.retiros_caja.findMany({
    where: {
      turno_caja_id: turnoId,
    },
    orderBy: {
      fecha_solicitud: 'asc',
    },
  })

  // 5. Obtener gastos
  const gastos = await prisma.gastos_caja.findMany({
    where: {
      turno_caja_id: turnoId,
    },
    orderBy: {
      fecha_gasto: 'asc',
    },
  })

  console.log(`✅ [getDetalleMovimientosTurno] Detalle obtenido exitosamente`)
  console.log(`   - Ventas: ${ventas.length}`)
  console.log(`   - Movimientos: ${movimientos.length}`)
  console.log(`   - Retiros: ${retiros.length}`)
  console.log(`   - Gastos: ${gastos.length}`)

  return {
    turno: {
      id: turno.id,
      cajero: `${turno.cajero.nombre} ${turno.cajero.apellido}`,
      fecha_inicio: turno.fecha_inicio,
    },
    ventas: ventas.map((venta) => ({
      id: venta.id,
      codigo_venta: venta.codigo_venta,
      fecha: venta.fecha_venta || venta.created_at || new Date(),
      total: Number(venta.total),
      cliente: venta.cliente
        ? `${venta.cliente.nombre} ${venta.cliente.apellido || ''}`
        : venta.cliente_nombre,
      metodos_pago: venta.pagos_venta.map((p) => p.metodo_pago?.nombre || 'Desconocido'),
    })),
    movimientos: movimientos.map((mov) => ({
      id: mov.id,
      tipo: mov.tipo_movimiento,
      monto: Number(mov.monto),
      descripcion: mov.descripcion,
      fecha: mov.fecha_movimiento || new Date(),
    })),
    retiros: retiros.map((ret) => ({
      id: ret.id,
      monto: Number(ret.monto),
      motivo: ret.motivo,
      estado: ret.estado,
      fecha: ret.fecha_solicitud || new Date(),
    })),
    gastos: gastos.map((gas) => ({
      id: gas.id,
      monto: Number(gas.monto),
      categoria: gas.categoria_gasto,
      descripcion: gas.descripcion,
      fecha: gas.fecha_gasto || new Date(),
    })),
  }
}

/**
 * Obtener estadísticas de desempeño por cajero
 */
export async function getEstadisticasCajero(
  cajeroId: number,
  fechaDesde?: Date,
  fechaHasta?: Date
) {
  console.log(`📊 [getEstadisticasCajero] Generando estadísticas para cajero ${cajeroId}`)

  const where: any = {
    cajero_id: cajeroId,
    estado: 'cerrado',
  }

  if (fechaDesde || fechaHasta) {
    where.fecha_inicio = {}
    if (fechaDesde) where.fecha_inicio.gte = fechaDesde
    if (fechaHasta) where.fecha_inicio.lte = fechaHasta
  }

  const turnos = await prisma.turnos_caja.findMany({
    where,
    include: {
      ventas: {
        where: { estado: 'completada' },
      },
    },
  })

  const totalTurnos = turnos.length
  const totalVentas = turnos.reduce((sum, t) => sum + t.ventas.length, 0)
  const montoTotal = turnos.reduce(
    (sum, t) => sum + t.ventas.reduce((s, v) => s + Number(v.total), 0),
    0
  )
  const totalDiferencias = turnos
    .filter((t) => t.diferencia !== null)
    .reduce((sum, t) => sum + Math.abs(Number(t.diferencia)), 0)

  const duracionTotal = turnos.reduce((sum, t) => {
    if (t.fecha_fin) {
      const duracion = Math.floor((t.fecha_fin.getTime() - t.fecha_inicio.getTime()) / 60000)
      return sum + duracion
    }
    return sum
  }, 0)

  return {
    total_turnos: totalTurnos,
    total_ventas: totalVentas,
    monto_total: montoTotal,
    promedio_ventas_por_turno: totalTurnos > 0 ? totalVentas / totalTurnos : 0,
    promedio_monto_por_turno: totalTurnos > 0 ? montoTotal / totalTurnos : 0,
    total_diferencias: totalDiferencias,
    promedio_diferencia: totalTurnos > 0 ? totalDiferencias / totalTurnos : 0,
    duracion_promedio_minutos: totalTurnos > 0 ? duracionTotal / totalTurnos : 0,
  }
}
