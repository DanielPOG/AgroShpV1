import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/notificaciones/eliminar-todas-leidas
 * 
 * Elimina todas las notificaciones leídas del usuario actual.
 * Si es admin, puede eliminar también las notificaciones globales leídas.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
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

    // 🔒 Filtro de 24 horas para evitar recreación
    const hace24Horas = new Date()
    hace24Horas.setHours(hace24Horas.getHours() - 24)

    // Construir la consulta según el rol
    const whereClause: any = {
      leida: true,
      created_at: { lt: hace24Horas } // Solo notificaciones antiguas
    }

    if (usuario.rol?.nombre.toLowerCase() !== 'admin') {
      // Usuario normal: solo sus notificaciones leídas
      whereClause.usuario_id = usuario.id
    } else {
      // Admin: sus notificaciones o las globales
      whereClause.OR = [
        { usuario_id: usuario.id },
        { usuario_id: null }
      ]
    }

    // Eliminar todas las notificaciones que cumplan el criterio
    const result = await prisma.notificaciones.deleteMany({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: result.count === 0 
        ? "No hay notificaciones leídas para eliminar"
        : `${result.count} notificación(es) eliminada(s) correctamente`
    })

  } catch (error) {
    console.error("Error al eliminar todas las notificaciones leídas:", error)
    return NextResponse.json(
      { error: "Error al eliminar las notificaciones" },
      { status: 500 }
    )
  }
}
