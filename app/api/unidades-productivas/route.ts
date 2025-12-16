/**
 * @fileoverview API para gestión de unidades productivas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import {
  getUnidadesProductivas,
  getProductosDisponiblesEnUnidad
} from '@/lib/db/unidades-productivas'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/unidades-productivas
 * Obtener lista de todas las unidades productivas activas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const unidades = await getUnidadesProductivas()

    return NextResponse.json({
      success: true,
      data: unidades
    })

  } catch (error) {
    console.error('❌ Error en GET /api/unidades-productivas:', error)
    
    return NextResponse.json(
      {
        error: 'Error al obtener unidades productivas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/unidades-productivas
 * Crear nueva unidad productiva
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que tenga permisos de Admin
    const user = await prisma.usuarios.findUnique({
      where: { id: Number(session.user.id) },
      include: { rol: true }
    })

    if (user?.rol?.nombre !== 'Admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para crear unidades productivas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { codigo, nombre, descripcion, tipo, ubicacion, responsable_id } = body

    // Validaciones
    if (!codigo || !nombre) {
      return NextResponse.json(
        { error: 'Código y nombre son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el código no exista
    const existingUnidad = await prisma.unidades_productivas.findUnique({
      where: { codigo }
    })

    if (existingUnidad) {
      return NextResponse.json(
        { error: 'Ya existe una unidad productiva con ese código' },
        { status: 400 }
      )
    }

    // Crear unidad productiva
    const nuevaUnidad = await prisma.unidades_productivas.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        tipo: tipo || null,
        ubicacion: ubicacion || null,
        responsable_id: responsable_id ? Number(responsable_id) : null,
        activa: true
      },
      include: {
        responsable: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: nuevaUnidad,
      message: 'Unidad productiva creada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en POST /api/unidades-productivas:', error)
    
    return NextResponse.json(
      {
        error: 'Error al crear unidad productiva',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
