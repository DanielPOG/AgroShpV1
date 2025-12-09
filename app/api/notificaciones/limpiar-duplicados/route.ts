/**
 * API: POST /api/notificaciones/limpiar-duplicados
 * 
 * Limpia notificaciones duplicadas basándose en:
 * - Mismo tipo
 * - Misma referencia_id y referencia_tipo
 * - Mantiene solo la más reciente de cada grupo
 * 
 * SOLO PARA ADMIN - Útil para limpiar datos después de bugs
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar el usuario y verificar que sea admin
    const usuario = await prisma.usuarios.findUnique({
      where: { email: session.user.email! },
      include: {
        rol: {
          select: { nombre: true }
        }
      }
    })

    if (!usuario || usuario.rol?.nombre.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden ejecutar esta acción' },
        { status: 403 }
      )
    }

    console.log('🧹 Limpiando notificaciones duplicadas...')

    // Obtener todas las notificaciones agrupadas por tipo y referencia
    const notificaciones = await prisma.notificaciones.findMany({
      where: {
        referencia_tipo: { not: null },
        referencia_id: { not: null }
      },
      orderBy: {
        created_at: 'desc' // Más recientes primero
      }
    })

    // Agrupar por tipo + referencia
    const grupos = new Map<string, typeof notificaciones>()
    
    for (const notif of notificaciones) {
      const key = `${notif.tipo}-${notif.referencia_tipo}-${notif.referencia_id}`
      if (!grupos.has(key)) {
        grupos.set(key, [])
      }
      grupos.get(key)!.push(notif)
    }

    let eliminadas = 0

    // Para cada grupo, mantener solo la más reciente
    for (const [key, grupo] of grupos.entries()) {
      if (grupo.length > 1) {
        // Mantener la primera (más reciente) y eliminar las demás
        const idsAEliminar = grupo.slice(1).map(n => n.id)
        
        await prisma.notificaciones.deleteMany({
          where: {
            id: { in: idsAEliminar }
          }
        })

        eliminadas += idsAEliminar.length
        console.log(`🗑️ Grupo ${key}: Eliminadas ${idsAEliminar.length} duplicadas, mantenida la más reciente`)
      }
    }

    console.log(`✅ Limpieza completada: ${eliminadas} notificaciones duplicadas eliminadas`)

    return NextResponse.json({
      success: true,
      message: `${eliminadas} notificaciones duplicadas eliminadas`,
      eliminadas
    })
  } catch (error) {
    console.error('Error al limpiar duplicados:', error)
    return NextResponse.json(
      { error: 'Error al limpiar notificaciones duplicadas' },
      { status: 500 }
    )
  }
}
