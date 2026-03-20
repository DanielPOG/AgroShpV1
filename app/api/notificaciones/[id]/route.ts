import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

/**
 * DELETE /api/notificaciones/[id]
 * 
 * Elimina una notificación específica.
 * Solo el propietario de la notificación puede eliminarla.
 * Las notificaciones globales (sin usuario_id) requieren permisos de admin.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const notificationId = parseInt(id)

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: "ID de notificación inválido" },
        { status: 400 }
      )
    }

    // Buscar el usuario actual
    const usuario = await prisma.usuarios.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rol: {
          select: {
            nombre: true
          }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que la notificación existe
    const notificacion = await prisma.notificaciones.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        usuario_id: true,
        titulo: true,
        created_at: true,
        referencia_tipo: true
      }
    })

    if (!notificacion) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      )
    }

    // 🔒 Bloquear eliminación de notificaciones recientes (menos de 24h)
    // Esto evita que se recreen inmediatamente después de eliminarlas
    if (notificacion.referencia_tipo && notificacion.created_at) {
      const hace24Horas = new Date()
      hace24Horas.setHours(hace24Horas.getHours() - 24)
      
      if (new Date(notificacion.created_at) > hace24Horas) {
        return NextResponse.json(
          { error: 'No se pueden eliminar notificaciones creadas hace menos de 24 horas. Esto evita que se recreen automáticamente.' },
          { status: 400 }
        )
      }
    }

    // Verificar permisos:
    // - Si tiene usuario_id, debe ser el propietario
    // - Si es global (usuario_id null), debe ser admin
    if (notificacion.usuario_id !== null) {
      if (notificacion.usuario_id !== usuario.id) {
        return NextResponse.json(
          { error: "No tienes permiso para eliminar esta notificación" },
          { status: 403 }
        )
      }
    } else {
      // Notificación global, requiere admin
      if (usuario.rol?.nombre.toLowerCase() !== 'admin') {
        return NextResponse.json(
          { error: "Solo los administradores pueden eliminar notificaciones globales" },
          { status: 403 }
        )
      }
    }

    // Eliminar la notificación
    await prisma.notificaciones.delete({
      where: { id: notificationId }
    })

    return NextResponse.json({
      success: true,
      message: "Notificación eliminada correctamente"
    })

  } catch (error) {
    console.error("Error al eliminar notificación:", error)
    return NextResponse.json(
      { error: "Error al eliminar la notificación" },
      { status: 500 }
    )
  }
}
