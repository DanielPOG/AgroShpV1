import { NextRequest, NextResponse } from 'next/server'
import { getArqueoHistoryDetail } from '@/lib/db/arqueos-caja'

/**
 * GET /api/arqueos/[id]/history
 * Obtiene el historial detallado de un arqueo con todos los turnos y operaciones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params en Next.js 15
    const { id } = await params
    const arqueoId = parseInt(id)
    
    if (isNaN(arqueoId)) {
      return NextResponse.json(
        { error: 'ID de arqueo inválido' },
        { status: 400 }
      )
    }

    const historial = await getArqueoHistoryDetail(arqueoId)

    return NextResponse.json(historial)
  } catch (error: any) {
    console.error('Error al obtener historial de arqueo:', error)
    
    if (error.message === 'Arqueo no encontrado') {
      return NextResponse.json(
        { error: 'Arqueo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error al obtener historial de arqueo',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
