import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/turnos/efectivo-inicial
 * Calcula el efectivo inicial para un nuevo turno
 * - Si es el primer turno del día: retorna fondo_inicial de la sesión
 * - Si hay turnos previos: retorna efectivo_final del último turno
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sesionCajaId = searchParams.get('sesion_caja_id')

    if (!sesionCajaId) {
      return NextResponse.json(
        { error: 'sesion_caja_id es requerido' },
        { status: 400 }
      )
    }

    const sesionId = parseInt(sesionCajaId)

    // 1. Obtener información de la sesión
    const sesion = await prisma.sesiones_caja.findUnique({
      where: { id: sesionId },
      select: {
        id: true,
        fondo_inicial: true,
        fecha_apertura: true,
        estado: true,
      },
    })

    if (!sesion) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    if (sesion.estado !== 'abierta') {
      return NextResponse.json(
        { error: 'La sesión no está activa' },
        { status: 400 }
      )
    }

    // 2. Buscar el último turno del día
    const inicioDelDia = new Date(sesion.fecha_apertura)
    inicioDelDia.setHours(0, 0, 0, 0)

    const ultimoTurnoDia = await prisma.turnos_caja.findFirst({
      where: {
        sesion_caja_id: sesionId,
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
        cajero: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
    })

    let efectivoInicial: number
    let origen: string
    let turnoAnteriorInfo: any = null

    if (ultimoTurnoDia && ultimoTurnoDia.efectivo_final) {
      // Hay un turno previo en el día
      efectivoInicial = Number(ultimoTurnoDia.efectivo_final)
      origen = 'turno_anterior'
      turnoAnteriorInfo = {
        id: ultimoTurnoDia.id,
        cajero: `${ultimoTurnoDia.cajero.nombre} ${ultimoTurnoDia.cajero.apellido}`,
      }
    } else {
      // Es el primer turno del día
      efectivoInicial = Number(sesion.fondo_inicial)
      origen = 'fondo_inicial'
    }

    return NextResponse.json({
      efectivo_inicial: efectivoInicial,
      origen,
      turno_anterior: turnoAnteriorInfo,
      sesion_id: sesion.id,
    })
  } catch (error) {
    console.error('Error al calcular efectivo inicial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
