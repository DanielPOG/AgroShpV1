import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from '@/lib/db/products'
import { updateProductSchema } from '@/lib/validations/product.schema'
import { idParamSchema } from '@/lib/validations/common.schema'
import { ZodError } from 'zod'

/**
 * GET /api/productos/[id]
 * Obtiene un producto por ID
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

    // Obtener producto
    const product = await getProductById(id)

    return NextResponse.json(product, { status: 200 })
  } catch (error) {
    console.error(`Error en GET /api/productos/[id]:`, error)

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
      if (error.message.includes('no encontrado')) {
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
 * PUT /api/productos/[id]
 * Actualiza un producto existente
 * 
 * Body: UpdateProductData (ver product.schema.ts)
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function PUT(
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

    // Verificar rol
    const userRole = session.user.role
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden actualizar productos.',
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

    // Agregar usuario_id para auditoría
    const dataWithUser = {
      ...body,
      usuario_id: Number(session.user.id),
    }

    // Validar datos
    const validatedData = updateProductSchema.parse(dataWithUser)

    // Actualizar producto
    const product = await updateProduct(id, validatedData)

    return NextResponse.json(product, { status: 200 })
  } catch (error) {
    console.error(`Error en PUT /api/productos/[id]:`, error)

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
      if (error.message.includes('no encontrado')) {
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
 * DELETE /api/productos/[id]
 * Desactiva un producto (soft delete)
 * 
 * Roles permitidos: Admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🗑️ DELETE /api/productos/[id] - Iniciando')
    
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      console.log('❌ DELETE - No autorizado: sin sesión')
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Verificar rol (solo Admin puede eliminar)
    const userRole = session.user.role
    console.log('👤 DELETE - Usuario:', session.user.email, 'Rol:', userRole)
    
    if (userRole !== 'Admin') {
      console.log('❌ DELETE - Acceso denegado: rol insuficiente')
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin puede eliminar productos.',
        },
        { status: 403 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })
    console.log('🔍 DELETE - Producto ID:', id)

    // Eliminar producto (soft delete) con auditoría
    const result = await deleteProduct(id, Number(session.user.id))
    console.log('✅ DELETE - Producto eliminado:', result)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error(`❌ Error en DELETE /api/productos/[id]:`, error)

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
      if (error.message.includes('no encontrado')) {
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
