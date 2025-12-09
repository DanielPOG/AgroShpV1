/**
 * API: GET /api/notificaciones
 * 
 * Obtiene las notificaciones del usuario autenticado
 * Incluye notificaciones personales (usuario_id específico) y globales (usuario_id null)
 * 
 * Query params:
 * - leidas: 'true' | 'false' (filtrar por leídas/no leídas)
 * - limit: number (máximo de notificaciones a devolver, default: 20)
 * - tipo: string (filtrar por tipo: stock_bajo, lote_vencimiento, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { ejecutarVerificacionCompleta, limpiarAlertasResueltas } from '@/lib/db/alertas'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // ❌ NO ejecutar verificaciones aquí - causan duplicados
    // Las verificaciones se ejecutan después de operaciones que afectan stock
    // (ajustar stock, retirar lote, crear/eliminar lote, etc.)

    // Extraer query params
    const { searchParams } = new URL(request.url)
    const leidasParam = searchParams.get('leidas')
    const limitParam = searchParams.get('limit')
    const tipoParam = searchParams.get('tipo')
    const productoActivoParam = searchParams.get('productoActivo') // 'all' | 'true' | 'false'

    const limit = limitParam ? parseInt(limitParam) : 20

    // Construir filtros
    const where: any = {
      OR: [
        { usuario_id: Number(session.user.id) }, // Notificaciones personales
        { usuario_id: null } // Notificaciones globales
      ]
    }

    // Filtro por leídas/no leídas
    if (leidasParam !== null) {
      where.leida = leidasParam === 'true'
    }

    // Filtro por tipo
    if (tipoParam) {
      where.tipo = tipoParam
    }

    // Obtener notificaciones (sin includes - no hay relaciones en el schema)
    const notificaciones = await prisma.notificaciones.findMany({
      where,
      orderBy: [
        { leida: 'asc' }, // No leídas primero
        { created_at: 'desc' } // Más recientes primero
      ],
      take: limit
    })

    // Filtrar por estado activo del producto (post-query)
    let notificacionesFiltradas = notificaciones
    
    if (productoActivoParam && productoActivoParam !== 'all') {
      const filtrarPorActivo = productoActivoParam === 'true'
      
      // Para filtrar necesitamos obtener info del producto
      // Solo aplicar filtro a notificaciones de lotes o productos
      const notificacionesConProducto = await Promise.all(
        notificaciones.map(async (notif) => {
          let productoActivo: boolean | null = null
          
          // Para notificaciones de lotes
          if (notif.referencia_tipo === 'lote' && notif.referencia_id) {
            const lote = await prisma.lotes_productos.findUnique({
              where: { id: notif.referencia_id },
              include: {
                producto: {
                  select: { activo: true }
                }
              }
            })
            productoActivo = lote?.producto?.activo ?? null
          }
          
          // Para notificaciones de productos directos
          if (notif.referencia_tipo === 'producto' && notif.referencia_id) {
            const producto = await prisma.productos.findUnique({
              where: { id: notif.referencia_id },
              select: { activo: true }
            })
            productoActivo = producto?.activo ?? null
          }
          
          return { notif, productoActivo }
        })
      )
      
      // Filtrar según el estado activo
      notificacionesFiltradas = notificacionesConProducto
        .filter(({ productoActivo }) => {
          // Si no tiene producto asociado, siempre incluir
          if (productoActivo === null) return true
          // Si tiene producto, filtrar por estado activo
          return productoActivo === filtrarPorActivo
        })
        .map(({ notif }) => notif)
    }

    // Contar no leídas en las notificaciones filtradas
    const noLeidas = notificacionesFiltradas.filter(n => !n.leida).length

    return NextResponse.json({
      notificaciones: notificacionesFiltradas,
      count: {
        total: notificacionesFiltradas.length,
        noLeidas
      }
    })
  } catch (error) {
    console.error('Error al obtener notificaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    )
  }
}
