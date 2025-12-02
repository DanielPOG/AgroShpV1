import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import {
  getLowStockProducts,
  getOutOfStockProducts,
  getProductsExpiringSoon,
} from '@/lib/db/products'

/**
 * GET /api/productos/alertas
 * Obtiene alertas de productos (stock bajo, agotados, próximos a vencer)
 * 
 * Query Params:
 * - tipo: 'stock_bajo' | 'agotados' | 'vencimientos' | 'todos' (default: 'todos')
 * - dias: días para alerta de vencimiento (default: 7)
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

    // Extraer parámetros
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'todos'
    const dias = searchParams.get('dias')
      ? parseInt(searchParams.get('dias')!)
      : 7

    let result: any = {}

    // Obtener alertas según el tipo
    if (tipo === 'stock_bajo' || tipo === 'todos') {
      const lowStock = await getLowStockProducts()
      result.stock_bajo = lowStock
    }

    if (tipo === 'agotados' || tipo === 'todos') {
      const outOfStock = await getOutOfStockProducts()
      result.agotados = outOfStock
    }

    if (tipo === 'vencimientos' || tipo === 'todos') {
      const expiring = await getProductsExpiringSoon(dias)
      result.proximos_vencer = expiring
    }

    // Agregar contadores
    result.contadores = {
      stock_bajo: result.stock_bajo?.length || 0,
      agotados: result.agotados?.length || 0,
      proximos_vencer: result.proximos_vencer?.length || 0,
      total:
        (result.stock_bajo?.length || 0) +
        (result.agotados?.length || 0) +
        (result.proximos_vencer?.length || 0),
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/productos/alertas:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
