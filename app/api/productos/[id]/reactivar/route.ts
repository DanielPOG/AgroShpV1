import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { idParamSchema } from '@/lib/validations/common.schema'
import { ZodError } from 'zod'
import { getColombiaDate } from '@/lib/date-utils'

/**
 * PATCH /api/productos/[id]/reactivar
 * Reactiva un producto desactivado (cambia activo a true)
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 PATCH /api/productos/[id]/reactivar - Iniciando')
    
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      console.log('❌ REACTIVAR - No autorizado: sin sesión')
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Verificar rol (Admin e Inventarista pueden reactivar)
    const userRole = session.user.role
    console.log('👤 REACTIVAR - Usuario:', session.user.email, 'Rol:', userRole)
    
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      console.log('❌ REACTIVAR - Acceso denegado: rol insuficiente')
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden reactivar productos.',
        },
        { status: 403 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })
    console.log('🔍 REACTIVAR - Producto ID:', id)

    // Verificar que el producto existe
    const existing = await prisma.productos.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si ya está activo
    if (existing.activo) {
      return NextResponse.json(
        { error: 'El producto ya está activo' },
        { status: 400 }
      )
    }

    // Reactivar producto
    const product = await prisma.productos.update({
      where: { id },
      data: { 
        activo: true,
        updated_at: getColombiaDate()
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            color: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    // Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        tabla: 'productos',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: Number(session.user.id),
        datos_anteriores: { activo: false },
        datos_nuevos: { activo: true },
        fecha: getColombiaDate(),
      },
    })

    console.log('✅ REACTIVAR - Producto reactivado:', product.nombre)

    return NextResponse.json(
      { 
        success: true, 
        message: 'Producto reactivado exitosamente',
        product 
      }, 
      { status: 200 }
    )
  } catch (error) {
    console.error(`❌ Error en PATCH /api/productos/[id]/reactivar:`, error)

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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
