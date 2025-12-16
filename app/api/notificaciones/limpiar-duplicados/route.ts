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

    // Buscar el usuario y verificar permisos
    const usuario = await prisma.usuarios.findUnique({
      where: { email: session.user.email! },
      include: {
        rol: {
          select: { nombre: true }
        }
      }
    })

    console.log('👤 Usuario:', session.user.email, 'Rol:', usuario?.rol?.nombre)

    // Verificar si tiene permiso "all" o es admin
    const tienePermiso = usuario?.rol?.nombre.toLowerCase() === 'admin' || 
                        usuario?.rol?.nombre.toLowerCase() === 'administrador'

    if (!usuario || !tienePermiso) {
      console.log('❌ Acceso denegado - Usuario sin permisos de admin')
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

    // Para cada grupo con duplicados
    for (const [key, grupo] of grupos.entries()) {
      if (grupo.length > 1) {
        // Prioridad: mantener la más reciente NO LEÍDA, sino la más reciente
        const noLeidas = grupo.filter(n => !n.leida)
        
        if (noLeidas.length > 0) {
          // Hay no leídas: mantener la más reciente no leída
          const mantener = noLeidas[0]
          const eliminar = grupo.filter(n => n.id !== mantener.id)
          const idsAEliminar = eliminar.map(n => n.id)
          
          if (idsAEliminar.length > 0) {
            await prisma.notificaciones.deleteMany({
              where: { id: { in: idsAEliminar } }
            })
            
            eliminadas += idsAEliminar.length
            console.log(`🗑️ ${key}: ${idsAEliminar.length} duplicadas eliminadas (mantenida la más reciente NO LEÍDA)`)
          }
        } else {
          // Todas están leídas: mantener solo la más reciente
          const mantener = grupo[0]
          const idsAEliminar = grupo.slice(1).map(n => n.id)
          
          await prisma.notificaciones.deleteMany({
            where: { id: { in: idsAEliminar } }
          })
          
          eliminadas += idsAEliminar.length
          console.log(`🗑️ ${key}: ${idsAEliminar.length} duplicadas eliminadas (todas leídas, mantenida la más reciente)`)
        }
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
