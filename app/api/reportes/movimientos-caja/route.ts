import { NextRequest, NextResponse } from 'next/server'
import { getMovimientosDetallados } from '@/lib/db/movimientos-caja-extra'

/**
 * GET /api/reportes/movimientos-caja
 * 
 * Obtiene un reporte detallado de movimientos de caja con filtros avanzados.
 * 
 * Query Parameters:
 * - sesion_id: number - Filtrar por sesión
 * - fecha_desde: string (ISO) - Fecha inicio
 * - fecha_hasta: string (ISO) - Fecha fin
 * - tipo_movimiento: string[] - Tipos de movimiento (venta, ingreso_adicional, etc.)
 * - metodo_pago: string[] - Métodos de pago (efectivo, nequi, etc.)
 * - usuario_id: number - Filtrar por usuario
 * - page: number - Página (default: 1)
 * - limit: number - Items por página (default: 50)
 * 
 * @example
 * GET /api/reportes/movimientos-caja?sesion_id=123&metodo_pago=efectivo&page=1&limit=20
 * GET /api/reportes/movimientos-caja?fecha_desde=2025-12-01&fecha_hasta=2025-12-31
 * GET /api/reportes/movimientos-caja?tipo_movimiento=venta&tipo_movimiento=ingreso_adicional
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parsear filtros
    const filters: any = {}

    // Sesión
    const sesionId = searchParams.get('sesion_id')
    if (sesionId) {
      filters.sesion_id = parseInt(sesionId)
      if (isNaN(filters.sesion_id)) {
        return NextResponse.json(
          { error: 'sesion_id debe ser un número' },
          { status: 400 }
        )
      }
    }

    // Fechas
    const fechaDesde = searchParams.get('fecha_desde')
    if (fechaDesde) {
      filters.fecha_desde = new Date(fechaDesde)
      if (isNaN(filters.fecha_desde.getTime())) {
        return NextResponse.json(
          { error: 'fecha_desde debe ser una fecha válida (ISO 8601)' },
          { status: 400 }
        )
      }
    }

    const fechaHasta = searchParams.get('fecha_hasta')
    if (fechaHasta) {
      filters.fecha_hasta = new Date(fechaHasta)
      if (isNaN(filters.fecha_hasta.getTime())) {
        return NextResponse.json(
          { error: 'fecha_hasta debe ser una fecha válida (ISO 8601)' },
          { status: 400 }
        )
      }
    }

    // Tipos de movimiento (puede ser múltiple)
    const tiposMovimiento = searchParams.getAll('tipo_movimiento')
    if (tiposMovimiento.length > 0) {
      filters.tipo_movimiento = tiposMovimiento
    }

    // Métodos de pago (puede ser múltiple)
    const metodosPago = searchParams.getAll('metodo_pago')
    if (metodosPago.length > 0) {
      filters.metodo_pago = metodosPago
    }

    // Usuario
    const usuarioId = searchParams.get('usuario_id')
    if (usuarioId) {
      filters.usuario_id = parseInt(usuarioId)
      if (isNaN(filters.usuario_id)) {
        return NextResponse.json(
          { error: 'usuario_id debe ser un número' },
          { status: 400 }
        )
      }
    }

    // Paginación
    const page = searchParams.get('page')
    if (page) {
      filters.page = parseInt(page)
      if (isNaN(filters.page) || filters.page < 1) {
        return NextResponse.json(
          { error: 'page debe ser un número mayor a 0' },
          { status: 400 }
        )
      }
    }

    const limit = searchParams.get('limit')
    if (limit) {
      filters.limit = parseInt(limit)
      if (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 200) {
        return NextResponse.json(
          { error: 'limit debe ser un número entre 1 y 200' },
          { status: 400 }
        )
      }
    }

    // Obtener datos
    const reporte = await getMovimientosDetallados(filters)

    return NextResponse.json(reporte)
  } catch (error) {
    console.error('[API] Error en reporte de movimientos:', error)

    return NextResponse.json(
      { error: 'Error al generar reporte de movimientos' },
      { status: 500 }
    )
  }
}
