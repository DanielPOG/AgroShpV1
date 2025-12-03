import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { getLotesByProducto } from '@/lib/db/lotes'
import { z } from 'zod'
import { ZodError } from 'zod'

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
})

/**
 * GET /api/productos/[id]/lotes
 * Obtiene todos los lotes de un producto específico
 * 
 * Roles permitidos: Todos los autenticados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Await params (Next.js 15+)
    const { id: paramId } = await params

    // Validar ID
    const { id } = idParamSchema.parse({ id: paramId })

    // Obtener lotes del producto
    const lotes = await getLotesByProducto(id)

    // Calcular estadísticas útiles para el frontend
    const ahora = new Date()
    
    const estadisticas = {
      total: lotes.length,
      disponibles: lotes.filter(l => l.estado === 'disponible').length,
      vencidos: lotes.filter(l => {
        if (!l.fecha_vencimiento) return false
        return new Date(l.fecha_vencimiento) < ahora && l.estado === 'disponible'
      }).length,
      retirados: lotes.filter(l => l.estado === 'retirado').length,
      cantidad_total: lotes
        .filter(l => l.estado === 'disponible')
        .reduce((sum, l) => sum + Number(l.cantidad), 0),
      proximos_vencer: lotes.filter(l => {
        if (!l.fecha_vencimiento || l.estado !== 'disponible') return false
        const diasRestantes = Math.ceil(
          (new Date(l.fecha_vencimiento).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
        )
        return diasRestantes > 0 && diasRestantes <= 7
      }).length,
    }

    return NextResponse.json(
      {
        success: true,
        data: lotes,
        estadisticas,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(`Error en GET /api/productos/[id]/lotes:`, error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'ID inválido',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
