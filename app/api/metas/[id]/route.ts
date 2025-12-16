/**
 * API para gestionar meta individual
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const metaUpdateSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  monto_objetivo: z.number().positive().optional(),
  activa: z.boolean().optional(),
})

/**
 * PATCH - Actualizar meta
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validacion = metaUpdateSchema.safeParse(body)

    if (!validacion.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validacion.error.errors 
        },
        { status: 400 }
      )
    }

    // Verificar que la meta existe
    const metaExistente = await prisma.metas_ventas.findUnique({
      where: { id }
    })

    if (!metaExistente) {
      return NextResponse.json(
        { error: 'Meta no encontrada' },
        { status: 404 }
      )
    }

    // Si se está activando, desactivar otras del mismo año
    if (validacion.data.activa === true) {
      await prisma.metas_ventas.updateMany({
        where: {
          anio: metaExistente.anio,
          activa: true,
          id: { not: id }
        },
        data: {
          activa: false
        }
      })
    }

    // Actualizar meta
    const meta = await prisma.metas_ventas.update({
      where: { id },
      data: {
        ...validacion.data,
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: meta,
      message: 'Meta actualizada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en PATCH /api/metas/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error al actualizar meta',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Eliminar meta
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    await prisma.metas_ventas.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Meta eliminada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en DELETE /api/metas/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error al eliminar meta',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
