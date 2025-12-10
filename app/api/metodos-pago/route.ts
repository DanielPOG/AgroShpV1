import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/metodos-pago
 * Obtiene lista de métodos de pago activos
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Obtener métodos de pago activos
    const metodosPago = await prisma.metodos_pago.findMany({
      where: {
        activo: true,
      },
      orderBy: {
        nombre: 'asc',
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        icono: true,
      },
    })

    return NextResponse.json(metodosPago, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/metodos-pago:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
