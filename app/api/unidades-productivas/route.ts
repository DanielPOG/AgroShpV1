/**
 * @fileoverview API para gestión de unidades productivas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import {
  getUnidadesProductivas,
  getProductosDisponiblesEnUnidad
} from '@/lib/db/unidades-productivas'

/**
 * GET /api/unidades-productivas
 * Obtener lista de todas las unidades productivas activas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const unidades = await getUnidadesProductivas()

    return NextResponse.json({
      success: true,
      data: unidades
    })

  } catch (error) {
    console.error('❌ Error en GET /api/unidades-productivas:', error)
    
    return NextResponse.json(
      {
        error: 'Error al obtener unidades productivas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
