import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/catalogo/productos - Obtener productos del catálogo público
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get("categoria")
    const busqueda = searchParams.get("busqueda")

    // Obtener productos activos con stock disponible
    const productos = await prisma.productos.findMany({
      where: {
        activo: true,
        stock_actual: {
          gt: 0, // Solo productos con stock mayor a 0
        },
        ...(categoria &&
          categoria !== "Todas" && {
            categoria: {
              nombre: categoria,
            },
          }),
        ...(busqueda && {
          OR: [
            {
              nombre: {
                contains: busqueda,
                mode: "insensitive",
              },
            },
            {
              descripcion: {
                contains: busqueda,
                mode: "insensitive",
              },
            },
            {
              categoria: {
                nombre: {
                  contains: busqueda,
                  mode: "insensitive",
                },
              },
            },
          ],
        }),
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            color: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            tipo: true,
          },
        },
        lotes_productos: {
          where: {
            estado: "activo",
            cantidad: {
              gt: 0,
            },
          },
          select: {
            id: true,
            codigo_lote: true,
            fecha_vencimiento: true,
            cantidad: true,
          },
          orderBy: {
            fecha_vencimiento: "asc",
          },
          take: 1, // Solo el lote más próximo a vencer
        },
      },
      orderBy: [
        {
          categoria: {
            nombre: "asc",
          },
        },
        {
          nombre: "asc",
        },
      ],
    })

    // Transformar datos para el formato del catálogo
    const productosFormateados = productos.map((producto) => {
      const stockActual = Number(producto.stock_actual) || 0
      const stockMinimo = Number(producto.stock_minimo) || 0
      const loteProximo = producto.lotes_productos[0]

      // Determinar estado
      let estado: "disponible" | "bajo-stock" | "agotado" | "proximo-vencer" = "disponible"

      if (stockActual === 0) {
        estado = "agotado"
      } else if (stockActual <= stockMinimo) {
        estado = "bajo-stock"
      } else if (loteProximo?.fecha_vencimiento) {
        const diasRestantes = Math.floor(
          (new Date(loteProximo.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diasRestantes <= 7) {
          estado = "proximo-vencer"
        }
      }

      return {
        id: producto.id.toString(),
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        codigo: producto.codigo,
        categoria: producto.categoria?.nombre || "Sin categoría",
        categoriaId: producto.categoria_id,
        categoriaIcono: producto.categoria?.icono,
        categoriaColor: producto.categoria?.color,
        unidadProductiva: producto.unidad_productiva?.nombre || "General",
        unidadProductivaId: producto.unidad_productiva_id,
        unidadProductivaDescripcion: producto.unidad_productiva?.descripcion,
        unidadProductivaTipo: producto.unidad_productiva?.tipo,
        tipoMedida: producto.tipo_medida,
        unidad: producto.unidad || "und",
        precio: Number(producto.precio_unitario),
        precioMayorista: producto.precio_mayorista ? Number(producto.precio_mayorista) : null,
        stock: stockActual,
        stockMinimo: stockMinimo,
        imagen: producto.imagen_url || "/placeholder-product.jpg",
        esPerecedero: producto.es_perecedero || false,
        diasVencimiento: producto.dias_vencimiento,
        estado,
        loteProximo: loteProximo
          ? {
              id: loteProximo.id,
              numeroLote: loteProximo.codigo_lote,
              fechaVencimiento: loteProximo.fecha_vencimiento?.toISOString(),
              cantidadDisponible: Number(loteProximo.cantidad),
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: productosFormateados,
      total: productosFormateados.length,
    })
  } catch (error) {
    console.error("Error al obtener productos del catálogo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener productos del catálogo",
      },
      { status: 500 }
    )
  }
}
