import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import {
  getUnitById,
  updateUnit,
  deleteUnit,
} from '@/lib/db/units'
import { updateUnitSchema } from '@/lib/validations/unit.schema'
import { idParamSchema } from '@/lib/validations/common.schema'
import { ZodError } from 'zod'

/**
 * GET /api/unidades/[id]
 * Obtiene una unidad productiva por ID
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Validar ID
    const { id } = idParamSchema.parse({ id: params.id })

    // Obtener unidad
    const unit = await getUnitById(id)

    return NextResponse.json(unit, { status: 200 })
  } catch (error) {
    console.error(`Error en GET /api/unidades/${params.id}:`, error)

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
 * PUT /api/unidades/[id]
 * Actualiza una unidad productiva existente
 * Nota: No permite actualizar el código
 * 
 * Body: UpdateUnitData (ver unit.schema.ts)
 * 
 * Roles permitidos: Admin
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verificar rol (solo Admin puede actualizar unidades)
    const userRole = session.user.rol
    if (userRole !== 'Admin') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin puede actualizar unidades productivas.',
        },
        { status: 403 }
      )
    }

    // Validar ID
    const { id } = idParamSchema.parse({ id: params.id })

    // Parsear body
    const body = await request.json()

    // Validar datos
    const validatedData = updateUnitSchema.parse(body)

    // Actualizar unidad
    const unit = await updateUnit(id, validatedData)

    return NextResponse.json(unit, { status: 200 })
  } catch (error) {
    console.error(`Error en PUT /api/unidades/${params.id}:`, error)

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
 * DELETE /api/unidades/[id]
 * Desactiva una unidad productiva (soft delete)
 * Protección: No permite desactivar si tiene productos activos
 * 
 * Roles permitidos: Admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verificar rol (solo Admin puede eliminar)
    const userRole = session.user.rol
    if (userRole !== 'Admin') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin puede desactivar unidades productivas.',
        },
        { status: 403 }
      )
    }

    // Validar ID
    const { id } = idParamSchema.parse({ id: params.id })

    // Desactivar unidad (soft delete)
    const result = await deleteUnit(id)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error(`Error en DELETE /api/unidades/${params.id}:`, error)

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
