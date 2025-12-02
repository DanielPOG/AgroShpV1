import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getAllUnitsForSelect } from '@/lib/db/units'

/**
 * GET /api/unidades/select
 * Obtiene lista simplificada de unidades productivas para selectores/formularios
 * Sin paginación, solo unidades activas, campos esenciales
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

    // Obtener unidades
    const units = await getAllUnitsForSelect()

    return NextResponse.json({ data: units }, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/unidades/select:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
