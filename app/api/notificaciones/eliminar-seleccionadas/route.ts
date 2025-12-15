import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/notificaciones/eliminar-seleccionadas
 * 
 * Elimina múltiples notificaciones seleccionadas.
 * Solo elimina notificaciones que:
 * - Estén marcadas como leídas
 * - Pertenezcan al usuario actual
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

    const body = await request.json()
    const { ids } = body

    // Validar que sea un array de números
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Debe proporcionar un array de IDs" },
        { status: 400 }
      )
    }

    if (!ids.every(id => typeof id === 'number')) {
      return NextResponse.json(
        { error: "Todos los IDs deben ser números" },
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

    // 🔒 Filtro de 24 horas para evitar recreación
    const hace24Horas = new Date()
    hace24Horas.setHours(hace24Horas.getHours() - 24)

    // Eliminar solo notificaciones que:
    // - Estén en el array de IDs
    // - Estén leídas (seguridad)
    // - Tengan más de 24h de antigüedad
    // - Pertenezcan al usuario (o sean globales si es admin)
    const whereClause: any = {
      id: { in: ids },
      leida: true,
      created_at: { lt: hace24Horas } // Solo notificaciones antiguas
    }

    // Si no es admin, solo puede eliminar sus propias notificaciones
    if (usuario.rol?.nombre.toLowerCase() !== 'admin') {
      whereClause.usuario_id = usuario.id
    } else {
      // Admin puede eliminar sus notificaciones o las globales
      whereClause.OR = [
        { usuario_id: usuario.id },
        { usuario_id: null }
      ]
    }

    const result = await prisma.notificaciones.deleteMany({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} notificación(es) eliminada(s) correctamente`
    })

  } catch (error) {
    console.error("Error al eliminar notificaciones seleccionadas:", error)
    return NextResponse.json(
      { error: "Error al eliminar las notificaciones" },
      { status: 500 }
    )
  }
}
