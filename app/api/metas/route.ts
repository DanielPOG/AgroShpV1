/**
 * API para gestionar metas de ventas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const metaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(150),
  monto_objetivo: z.number().positive('El monto debe ser mayor a 0'),
  anio: z.number().int().min(2000).max(2100),
})

/**
 * GET - Obtener todas las metas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const anio = searchParams.get('anio')

    const where = anio ? { anio: parseInt(anio) } : {}

    const metas = await prisma.metas_ventas.findMany({
      where,
      orderBy: [
        { anio: 'desc' },
        { created_at: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: metas
    })

  } catch (error) {
    console.error('❌ Error en GET /api/metas:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener metas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Crear nueva meta
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const validacion = metaSchema.safeParse(body)

    if (!validacion.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validacion.error.errors 
        },
        { status: 400 }
      )
    }

    const { nombre, monto_objetivo, anio } = validacion.data

    // Desactivar otras metas del mismo año
    await prisma.metas_ventas.updateMany({
      where: {
        anio,
        activa: true
      },
      data: {
        activa: false
      }
    })

    // Crear nueva meta
    const meta = await prisma.metas_ventas.create({
      data: {
        nombre,
        monto_objetivo,
        anio,
        activa: true
      }
    })

    return NextResponse.json({
      success: true,
      data: meta,
      message: 'Meta creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error en POST /api/metas:', error)
    return NextResponse.json(
      {
        error: 'Error al crear meta',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
