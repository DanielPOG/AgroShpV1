import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getAllCategoriesForSelect } from '@/lib/db/categories'

/**
 * GET /api/categorias/select
 * Obtiene lista simplificada de categorías para selectores/formularios
 * Sin paginación, solo campos esenciales
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

    // Obtener categorías
    const categories = await getAllCategoriesForSelect()

    return NextResponse.json({ data: categories }, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/categorias/select:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
