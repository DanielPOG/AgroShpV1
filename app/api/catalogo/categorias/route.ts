import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/catalogo/categorias - Obtener todas las categorías con productos activos
export async function GET() {
  try {
    const categorias = await prisma.categorias.findMany({
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
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        icono: true,
        color: true,
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

    const categoriasFormateadas = categorias.map((cat) => ({
      id: cat.id.toString(),
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      icono: cat.icono,
      color: cat.color,
      totalProductos: cat._count.productos,
    }))

    return NextResponse.json({
      success: true,
      data: categoriasFormateadas,
    })
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener categorías",
      },
      { status: 500 }
    )
  }
}
