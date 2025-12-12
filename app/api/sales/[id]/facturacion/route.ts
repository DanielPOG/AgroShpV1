import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * PATCH /api/sales/[id]/facturacion
 * Actualiza la información de facturación de una venta
 */

const facturacionSchema = z.object({
  requiere_factura: z.boolean(),
  factura_generada: z.boolean(),
  cliente_email: z.string().email().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Validar que el usuario tenga permisos
    if (session.user.rol !== 'Admin' && session.user.rol !== 'Cajero') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo Admin y Cajero pueden actualizar ventas.' },
        { status: 403 }
      )
    }

    const ventaId = parseInt(params.id)

    if (isNaN(ventaId)) {
      return NextResponse.json(
        { error: 'ID de venta inválido' },
        { status: 400 }
      )
    }

    // Obtener datos del body
    const body = await request.json()
    const validatedData = facturacionSchema.parse(body)

    // Verificar que la venta existe
    const venta = await prisma.ventas.findUnique({
      where: { id: ventaId },
    })

    if (!venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar información de facturación
    const ventaActualizada = await prisma.ventas.update({
      where: { id: ventaId },
      data: {
        requiere_factura: validatedData.requiere_factura,
        factura_generada: validatedData.factura_generada,
        ...(validatedData.cliente_email && {
          cliente_email: validatedData.cliente_email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      venta: {
        id: ventaActualizada.id,
        codigo_venta: ventaActualizada.codigo_venta,
        requiere_factura: ventaActualizada.requiere_factura,
        factura_generada: ventaActualizada.factura_generada,
        cliente_email: ventaActualizada.cliente_email,
      },
    })
  } catch (error) {
    console.error('Error en PATCH /api/sales/[id]/facturacion:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al actualizar información de facturación' },
      { status: 500 }
    )
  }
}
