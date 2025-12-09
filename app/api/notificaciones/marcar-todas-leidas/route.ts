/**
 * API: POST /api/notificaciones/marcar-todas-leidas
 * 
 * Marca todas las notificaciones del usuario como leídas
 * Incluye notificaciones personales y globales
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = Number(session.user.id)

    // Marcar todas las notificaciones no leídas como leídas
    const result = await prisma.notificaciones.updateMany({
      where: {
        OR: [
          { usuario_id: userId }, // Notificaciones personales
          { usuario_id: null } // Notificaciones globales
        ],
        leida: false
      },
      data: {
        leida: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
      count: result.count
    })
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error)
    return NextResponse.json(
      { error: 'Error al marcar todas las notificaciones como leídas' },
      { status: 500 }
    )
  }
}
