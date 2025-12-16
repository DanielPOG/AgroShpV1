import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import {
  getResumenTurno,
  getComparativoTurnos,
  getDetalleMovimientosTurno,
  getEstadisticasCajero,
} from '@/lib/db/reportes-turnos'
import { z } from 'zod'

/**
 * GET /api/reportes/turnos
 * Obtiene reportes de turnos según parámetros
 * 
 * Query params:
 * - tipo: 'resumen' | 'comparativo' | 'detalle' | 'estadisticas'
 * - turno_id: ID del turno (para tipo 'resumen' o 'detalle')
 * - sesion_caja_id: ID de sesión (para tipo 'comparativo')
 * - cajero_id: ID del cajero (para filtrar o 'estadisticas')
 * - fecha_desde: Fecha inicio (ISO string)
 * - fecha_hasta: Fecha fin (ISO string)
 * - estado: 'activo' | 'cerrado' | 'suspendido'
 * 
 * Roles permitidos: Admin, Supervisor, Cajero (solo sus propios turnos)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    const userRole = session.user.role
    const userId = Number(session.user.id)

    // Extraer parámetros
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') as 'resumen' | 'comparativo' | 'detalle' | 'estadisticas'
    const turnoId = searchParams.get('turno_id')
    const sesionCajaId = searchParams.get('sesion_caja_id')
    const cajeroId = searchParams.get('cajero_id')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const estado = searchParams.get('estado') as 'activo' | 'cerrado' | 'suspendido' | null

    // Validar tipo de reporte
    if (!tipo) {
      return NextResponse.json(
        { error: 'Debe especificar el tipo de reporte: resumen, comparativo, detalle o estadisticas' },
        { status: 400 }
      )
    }

    // Control de acceso: Cajeros solo pueden ver sus propios turnos
    const cajeroIdFiltro = userRole === 'Cajero' ? userId : (cajeroId ? Number(cajeroId) : undefined)

    // Generar reporte según tipo
    let data: any

    switch (tipo) {
      case 'resumen':
        if (!turnoId) {
          return NextResponse.json(
            { error: 'Debe especificar turno_id para reporte de resumen' },
            { status: 400 }
          )
        }

        // Validar que el cajero solo pueda ver sus propios turnos
        if (userRole === 'Cajero') {
          const turno = await prisma.turnos_caja.findUnique({
            where: { id: Number(turnoId) },
            select: { cajero_id: true },
          })
          if (turno && turno.cajero_id !== userId) {
            return NextResponse.json(
              { error: 'No tienes permiso para ver este turno' },
              { status: 403 }
            )
          }
        }

        data = await getResumenTurno(Number(turnoId))
        break

      case 'comparativo':
        data = await getComparativoTurnos({
          sesion_caja_id: sesionCajaId ? Number(sesionCajaId) : undefined,
          fecha_desde: fechaDesde ? new Date(fechaDesde) : undefined,
          fecha_hasta: fechaHasta ? new Date(fechaHasta) : undefined,
          cajero_id: cajeroIdFiltro,
          estado: estado || undefined,
        })
        break

      case 'detalle':
        if (!turnoId) {
          return NextResponse.json(
            { error: 'Debe especificar turno_id para reporte de detalle' },
            { status: 400 }
          )
        }

        // Validar que el cajero solo pueda ver sus propios turnos
        if (userRole === 'Cajero') {
          const turno = await prisma.turnos_caja.findUnique({
            where: { id: Number(turnoId) },
            select: { cajero_id: true },
          })
          if (turno && turno.cajero_id !== userId) {
            return NextResponse.json(
              { error: 'No tienes permiso para ver este turno' },
              { status: 403 }
            )
          }
        }

        data = await getDetalleMovimientosTurno(Number(turnoId))
        break

      case 'estadisticas':
        const cajeroIdStats = userRole === 'Cajero' ? userId : (cajeroId ? Number(cajeroId) : userId)
        
        data = await getEstadisticasCajero(
          cajeroIdStats,
          fechaDesde ? new Date(fechaDesde) : undefined,
          fechaHasta ? new Date(fechaHasta) : undefined
        )
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de reporte inválido' },
          { status: 400 }
        )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/reportes/turnos:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
