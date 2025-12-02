import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { adjustStock } from '@/lib/db/products'
import { adjustStockSchema } from '@/lib/validations/product.schema'
import { idParamSchema } from '@/lib/validations/common.schema'
import { ZodError } from 'zod'

/**
 * POST /api/productos/[id]/ajustar-stock
 * Ajusta el stock de un producto (entrada, salida o ajuste)
 * 
 * Body:
 * {
 *   tipo_movimiento: 'entrada' | 'salida' | 'ajuste',
 *   cantidad: number,
 *   motivo: string
 * }
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Validar que el usuario tenga ID
    if (!session.user.id) {
      return NextResponse.json(
        { error: 'Sesión inválida. Usuario sin ID.' },
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

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Parsear body
    const body = await request.json()

    // Agregar producto_id y usuario_id
    const dataWithIds = {
      ...body,
      producto_id: id,
      usuario_id: Number(session.user.id),
    }

    console.log('🔍 Datos de ajuste de stock:', {
      usuario_id: dataWithIds.usuario_id,
      producto_id: dataWithIds.producto_id,
      tipo_movimiento: dataWithIds.tipo_movimiento,
      cantidad: dataWithIds.cantidad,
    })

    // Validar datos
    const validatedData = adjustStockSchema.parse(dataWithIds)

    // Ajustar stock
    const result = await adjustStock(validatedData)

    return NextResponse.json(
      {
        success: true,
        message: `Stock ajustado correctamente (${validatedData.tipo_movimiento})`,
        product: result.product,
        historial: result.historial,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(`Error en POST /api/productos/[id]/ajustar-stock:`, error)

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
      // Errores específicos de negocio
      if (error.message.includes('no encontrado')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('stock insuficiente')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
