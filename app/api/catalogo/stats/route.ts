import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/catalogo/stats - Obtener estadísticas del catálogo
export async function GET() {
  try {
    const [totalProductos, totalCategorias, totalUnidades] = await Promise.all([
      // Total de productos activos con stock
      prisma.productos.count({
        where: {
          activo: true,
          stock_actual: {
            gt: 0,
          },
        },
      }),

      // Total de categorías con productos activos
      prisma.categorias.count({
        where: {
          productos: {
            some: {
              activo: true,
              stock_actual: {
                gt: 0,
              },
            },
          },
        },
      }),

      // Total de unidades productivas activas con productos
      prisma.unidades_productivas.count({
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
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalProductos,
        totalCategorias,
        totalUnidades,
      },
    })
  } catch (error) {
    console.error("Error al obtener estadísticas del catálogo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener estadísticas del catálogo",
      },
      { status: 500 }
    )
  }
}
