import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getLotesProximosVencer } from '@/lib/db/lotes'

/**
 * GET /api/lotes/vencimientos
 * Obtiene lotes próximos a vencer
 * 
 * Query Params:
 * - dias: número de días (default: 7)
 * 
 * Roles permitidos: Todos los autenticados
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

    // Extraer parámetro días
    const { searchParams } = new URL(request.url)
    const dias = searchParams.get('dias') ? parseInt(searchParams.get('dias')!) : 7

    // Validar que dias sea positivo
    if (dias <= 0) {
      return NextResponse.json(
        { error: 'El parámetro días debe ser positivo' },
        { status: 400 }
      )
    }

    // Obtener lotes próximos a vencer
    const lotes = await getLotesProximosVencer(dias)

    return NextResponse.json(lotes, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/lotes/vencimientos:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
