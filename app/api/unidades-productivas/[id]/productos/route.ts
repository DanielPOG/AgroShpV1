/**
 * @fileoverview API para obtener productos disponibles en una unidad productiva
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getProductosDisponiblesEnUnidad } from '@/lib/db/unidades-productivas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const productos = await getProductosDisponiblesEnUnidad(id)

    return NextResponse.json({
      success: true,
      data: productos
    })

  } catch (error) {
    console.error('❌ Error en GET /api/unidades-productivas/[id]/productos:', error)
    
    return NextResponse.json(
      {
        error: 'Error al obtener productos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
