import { NextRequest, NextResponse } from 'next/server'
import { auditarDiferenciasCaja } from '@/lib/db/cash-sessions'

/**
 * GET /api/cash-sessions/[id]/auditoria
 * 
 * Ejecuta una auditoría completa de la sesión de caja para detectar inconsistencias.
 * 
 * Verifica:
 * - Ventas con movimientos faltantes
 * - Retiros sin movimientos
 * - Gastos sin movimientos
 * - Movimientos huérfanos
 * - Diferencias en cálculos
 * - Efectivo negativo
 * 
 * @example
 * GET /api/cash-sessions/123/auditoria
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id)

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'ID de sesión inválido' },
        { status: 400 }
      )
    }

    const auditoria = await auditarDiferenciasCaja(sessionId)

    return NextResponse.json(auditoria)
  } catch (error) {
    console.error('[API] Error en auditoría:', error)

    if (error instanceof Error && error.message === 'Sesión no encontrada') {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Error al ejecutar auditoría' },
      { status: 500 }
    )
  }
}
