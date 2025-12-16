import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/turnos/[id]/resumen
 * Obtiene un resumen financiero del turno con efectivo esperado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const turnoId = parseInt(id)

    if (isNaN(turnoId)) {
      return NextResponse.json(
        { error: 'ID de turno inválido' },
        { status: 400 }
      )
    }

    // Obtener turno
    const turno = await prisma.turnos_caja.findUnique({
      where: { id: turnoId },
      select: {
        id: true,
        efectivo_inicial: true,
        estado: true,
      },
    })

    if (!turno) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      )
    }

    // 1. Calcular ventas en efectivo
    // Primero obtener el ID del método de pago "efectivo"
    const metodoPagoEfectivo = await prisma.metodos_pago.findFirst({
      where: {
        nombre: {
          equals: 'efectivo',
          mode: 'insensitive',
        },
      },
    })

    console.log('💳 [Debug] Método pago efectivo:', metodoPagoEfectivo)

    if (!metodoPagoEfectivo) {
      console.warn('⚠️ No se encontró método de pago "efectivo"')
    }

    // Primero, obtener todos los pagos del turno para debug
    const todosPagosTurno = await prisma.pagos_venta.findMany({
      where: {
        venta: {
          turno_caja_id: turnoId,
        },
      },
      include: {
        metodo_pago: true,
      },
    })

    console.log('🔍 [Debug] Todos los pagos del turno:', JSON.stringify(todosPagosTurno, null, 2))

    const ventasEfectivo = await prisma.pagos_venta.aggregate({
      where: {
        venta: {
          turno_caja_id: turnoId,
        },
        metodo_pago_id: metodoPagoEfectivo?.id,
      },
      _sum: {
        monto: true,
      },
    })

    console.log('💰 [Debug] Ventas efectivo result:', ventasEfectivo)

    // 2. Calcular retiros
    const retiros = await prisma.retiros_caja.aggregate({
      where: {
        turno_caja_id: turnoId,
      },
      _sum: {
        monto: true,
      },
    })

    // 3. Calcular gastos en efectivo
    const gastos = await prisma.gastos_caja.aggregate({
      where: {
        turno_caja_id: turnoId,
        metodo_pago: 'efectivo',
      },
      _sum: {
        monto: true,
      },
    })

    // 4. Movimientos adicionales de efectivo
    const movimientosIngreso = await prisma.movimientos_caja.aggregate({
      where: {
        turno_caja_id: turnoId,
        tipo_movimiento: 'ingreso_adicional',
        metodo_pago: 'efectivo',
      },
      _sum: {
        monto: true,
      },
    })

    const movimientosEgreso = await prisma.movimientos_caja.aggregate({
      where: {
        turno_caja_id: turnoId,
        tipo_movimiento: 'egreso_operativo',
        metodo_pago: 'efectivo',
      },
      _sum: {
        monto: true,
      },
    })

    // Calcular totales
    const efectivoInicial = Number(turno.efectivo_inicial)
    const totalVentasEfectivo = Number(ventasEfectivo._sum.monto || 0)
    const totalRetiros = Number(retiros._sum.monto || 0)
    const totalGastos = Number(gastos._sum.monto || 0)
    const totalIngresosAdicionales = Number(movimientosIngreso._sum.monto || 0)
    const totalEgresosOperativos = Number(movimientosEgreso._sum.monto || 0)

    // Debug logs
    console.log('📊 [Resumen Turno] Totales:', {
      efectivoInicial,
      totalVentasEfectivo,
      totalRetiros,
      totalGastos,
      totalIngresosAdicionales,
      totalEgresosOperativos,
    })

    // Calcular efectivo esperado
    const efectivoEsperado =
      efectivoInicial +
      totalVentasEfectivo +
      totalIngresosAdicionales -
      totalRetiros -
      totalGastos -
      totalEgresosOperativos

    console.log('💰 [Resumen Turno] Efectivo esperado:', efectivoEsperado)

    return NextResponse.json({
      turno_id: turnoId,
      efectivo_inicial: efectivoInicial,
      operaciones: {
        ventas_efectivo: totalVentasEfectivo,
        retiros: totalRetiros,
        gastos_efectivo: totalGastos,
        ingresos_adicionales: totalIngresosAdicionales,
        egresos_operativos: totalEgresosOperativos,
      },
      efectivo_esperado: efectivoEsperado,
    })
  } catch (error) {
    console.error('❌ [GET /api/turnos/[id]/resumen] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener resumen del turno' },
      { status: 500 }
    )
  }
}
