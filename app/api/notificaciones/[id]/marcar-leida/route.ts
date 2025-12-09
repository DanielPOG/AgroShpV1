/**
 * API: PUT /api/notificaciones/[id]/marcar-leida
 * 
 * Marca una notificación específica como leída
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const notificacionId = parseInt(id)

    if (isNaN(notificacionId)) {
      return NextResponse.json(
        { error: 'ID de notificación inválido' },
        { status: 400 }
      )
    }

    // Verificar que la notificación existe
    const notificacion = await prisma.notificaciones.findUnique({
      where: { id: notificacionId },
      select: {
        id: true,
        usuario_id: true
      }
    })

    if (!notificacion) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos: solo puede marcar sus propias notificaciones o las globales
    const userId = Number(session.user.id)
    if (notificacion.usuario_id !== null && notificacion.usuario_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado para modificar esta notificación' },
        { status: 403 }
      )
    }

    // Marcar como leída
    await prisma.notificaciones.update({
      where: { id: notificacionId },
      data: { leida: true }
    })

    return NextResponse.json({
      success: true,
      message: 'Notificación marcada como leída'
    })
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error)
    return NextResponse.json(
      { error: 'Error al marcar notificación como leída' },
      { status: 500 }
    )
  }
}
