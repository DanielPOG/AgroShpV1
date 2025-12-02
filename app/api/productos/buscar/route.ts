import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { searchProducts } from '@/lib/db/products'
import { z } from 'zod'

/**
 * GET /api/productos/buscar
 * Búsqueda rápida de productos
 * 
 * Query Params:
 * - q: término de búsqueda (requerido)
 * - limit: límite de resultados (default: 10)
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

    // Extraer parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 10

    // Validar que query existe
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'El parámetro "q" es requerido' },
        { status: 400 }
      )
    }

    // Validar límite
    const limitSchema = z.number().min(1).max(50)
    const validatedLimit = limitSchema.parse(limit)

    // Buscar productos
    const products = await searchProducts(query, validatedLimit)

    return NextResponse.json({ data: products }, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/productos/buscar:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
