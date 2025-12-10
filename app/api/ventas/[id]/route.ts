import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getSaleById, cancelSale } from '@/lib/db/sales'
import { cancelSaleSchema } from '@/lib/validations/sale.schema'
import { z } from 'zod'
import { ZodError } from 'zod'

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
})

/**
 * GET /api/ventas/[id]
 * Obtiene una venta por ID con todos sus detalles
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(
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

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Obtener venta
    const venta = await getSaleById(id)

    // Si el usuario no es Admin, solo puede ver sus propias ventas
    if (
      session.user.role !== 'Admin' &&
      session.user.role !== 'Administrador' &&
      venta.usuario_id !== Number(session.user.id)
    ) {
      return NextResponse.json(
        { error: 'No tiene permiso para ver esta venta' },
        { status: 403 }
      )
    }

    return NextResponse.json(venta, { status: 200 })
  } catch (error) {
    console.error(`Error en GET /api/ventas/[id]:`, error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'ID inválido',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('no encontrad')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ventas/[id]
 * Cancela una venta (soft delete)
 * 
 * Body: CancelSaleData (ver sale.schema.ts)
 * {
 *   motivo: string (min 10 chars),
 *   requiere_reintegro_stock?: boolean (default: true)
 * }
 * 
 * Roles permitidos: Solo Admin
 */
export async function DELETE(
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

    // Solo Admin puede cancelar ventas
    if (session.user.role !== 'Admin' && session.user.role !== 'Administrador') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo Admin puede cancelar ventas.' },
        { status: 403 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Parsear body
    const body = await request.json()
    const validatedData = cancelSaleSchema.parse(body)

    // Cancelar venta
    const ventaCancelada = await cancelSale(
      id,
      validatedData.motivo,
      validatedData.requiere_reintegro_stock
    )

    return NextResponse.json(ventaCancelada, { status: 200 })
  } catch (error) {
    console.error(`Error en DELETE /api/ventas/[id]:`, error)

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
      if (error.message.includes('no encontrad')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
