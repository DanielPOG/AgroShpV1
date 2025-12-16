/**
 * @fileoverview API para gestión individual de unidades productivas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/unidades-productivas/[id]
 * Obtener una unidad productiva por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const unidad = await prisma.unidades_productivas.findUnique({
      where: { id: Number(id) },
      include: {
        responsable: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        },
        _count: {
          select: {
            productos: true,
            lotes_productos: true
          }
        }
      }
    })

    if (!unidad) {
      return NextResponse.json(
        { error: 'Unidad productiva no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: unidad
    })

  } catch (error) {
    console.error('❌ Error en GET /api/unidades-productivas/[id]:', error)
    
    return NextResponse.json(
      {
        error: 'Error al obtener unidad productiva',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/unidades-productivas/[id]
 * Actualizar una unidad productiva
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'No tienes permisos para editar unidades productivas' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { codigo, nombre, descripcion, tipo, ubicacion, responsable_id, activa } = body

    // Verificar que la unidad exista
    const unidadExistente = await prisma.unidades_productivas.findUnique({
      where: { id: Number(id) }
    })

    if (!unidadExistente) {
      return NextResponse.json(
        { error: 'Unidad productiva no encontrada' },
        { status: 404 }
      )
    }

    // Si se está cambiando el código, verificar que no exista otro con ese código
    if (codigo && codigo !== unidadExistente.codigo) {
      const codigoExistente = await prisma.unidades_productivas.findUnique({
        where: { codigo }
      })

      if (codigoExistente) {
        return NextResponse.json(
          { error: 'Ya existe una unidad productiva con ese código' },
          { status: 400 }
        )
      }
    }

    // Actualizar unidad productiva
    const unidadActualizada = await prisma.unidades_productivas.update({
      where: { id: Number(id) },
      data: {
        ...(codigo && { codigo }),
        ...(nombre && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tipo !== undefined && { tipo }),
        ...(ubicacion !== undefined && { ubicacion }),
        ...(responsable_id !== undefined && { 
          responsable_id: responsable_id ? Number(responsable_id) : null 
        }),
        ...(activa !== undefined && { activa }),
        updated_at: new Date()
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
      data: unidadActualizada,
      message: 'Unidad productiva actualizada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en PUT /api/unidades-productivas/[id]:', error)
    
    return NextResponse.json(
      {
        error: 'Error al actualizar unidad productiva',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/unidades-productivas/[id]
 * Desactivar una unidad productiva (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'No tienes permisos para eliminar unidades productivas' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar que la unidad exista
    const unidad = await prisma.unidades_productivas.findUnique({
      where: { id: Number(id) }
    })

    if (!unidad) {
      return NextResponse.json(
        { error: 'Unidad productiva no encontrada' },
        { status: 404 }
      )
    }

    // Desactivar unidad (soft delete)
    const unidadDesactivada = await prisma.unidades_productivas.update({
      where: { id: Number(id) },
      data: {
        activa: false,
        updated_at: new Date()
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
      data: unidadDesactivada,
      message: 'Unidad productiva desactivada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en DELETE /api/unidades-productivas/[id]:', error)
    
    return NextResponse.json(
      {
        error: 'Error al desactivar unidad productiva',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
