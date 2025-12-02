import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { adjustStock } from '@/lib/db/products'
import { adjustStockSchema } from '@/lib/validations/product.schema'
import { ZodError } from 'zod'

/**
 * POST /api/productos/ajustar-stock
 * Ajusta el stock de un producto (entrada/salida/ajuste)
 * 
 * Body: AdjustStockData (ver product.schema.ts)
 * {
 *   producto_id: number
 *   tipo_movimiento: 'entrada' | 'salida' | 'ajuste'
 *   cantidad: number
 *   motivo: string
 * }
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Verificar rol
    const userRole = session.user.role
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden ajustar stock.',
        },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()

    // Agregar usuario_id del usuario autenticado
    const dataWithUser = {
      ...body,
      usuario_id: session.user.id,
    }

    // Validar datos
    const validatedData = adjustStockSchema.parse(dataWithUser)

    // Ajustar stock
    const result = await adjustStock(validatedData)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error en POST /api/productos/ajustar-stock:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
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
