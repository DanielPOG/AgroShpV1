import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/proveedores
 * Obtiene lista de proveedores activos para select
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

    // Obtener solo proveedores activos
    const proveedores = await prisma.proveedores.findMany({
      where: {
        activo: true,
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        nit: true,
        contacto_nombre: true,
        contacto_telefono: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    return NextResponse.json(proveedores, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/proveedores:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
