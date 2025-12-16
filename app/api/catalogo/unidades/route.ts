import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/catalogo/unidades - Obtener todas las unidades productivas activas
export async function GET() {
  try {
    const unidades = await prisma.unidades_productivas.findMany({
      where: {
        activa: true,
        productos: {
          some: {
            activo: true,
            stock_actual: {
              gt: 0,
            },
          },
        },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        tipo: true,
        ubicacion: true,
        _count: {
          select: {
            productos: {
              where: {
                activo: true,
                stock_actual: {
                  gt: 0,
                },
              },
            },
          },
        },
      },
      orderBy: {
        nombre: "asc",
      },
    })

    // Mapeo de tipos de unidades productivas a emojis
    const iconosPorTipo: Record<string, string> = {
      huerta: "🥬",
      hortalizas: "🥬",
      lacteos: "🥛",
      lácteos: "🥛",
      panificacion: "🍞",
      panificación: "🍞",
      avicultura: "🥚",
      apicultura: "🍯",
      porcicultura: "🐷",
      ganaderia: "🐄",
      ganadería: "🐄",
      piscicultura: "🐟",
      cunicultura: "🐰",
      general: "🌾",
    }

    const unidadesFormateadas = unidades.map((unidad) => {
      const tipoLower = unidad.tipo?.toLowerCase() || "general"
      const icono = iconosPorTipo[tipoLower] || "🌾"

      return {
        id: unidad.id.toString(),
        codigo: unidad.codigo,
        nombre: unidad.nombre,
        descripcion: unidad.descripcion || "Unidad productiva",
        tipo: unidad.tipo,
        ubicacion: unidad.ubicacion,
        icono,
        totalProductos: unidad._count.productos,
      }
    })

    return NextResponse.json({
      success: true,
      data: unidadesFormateadas,
    })
  } catch (error) {
    console.error("Error al obtener unidades productivas:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener unidades productivas",
      },
      { status: 500 }
    )
  }
}
