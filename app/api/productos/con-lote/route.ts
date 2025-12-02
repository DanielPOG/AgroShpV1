import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { getColombiaDate } from '@/lib/date-utils'

/**
 * POST /api/productos/con-lote
 * Crea un producto junto con su lote inicial en una TRANSACCIÓN ATÓMICA
 * Si falla cualquier parte, se hace rollback completo
 * 
 * Body:
 * - producto: datos del producto (codigo, nombre, categoria_id, etc.)
 * - lote: datos del lote inicial (codigo_lote, cantidad, fecha_produccion, etc.)
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    // Verificar rol
    const userRole = session.user.role
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden crear productos.',
        },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()
    const { producto: productoData, lote: loteData } = body

    if (!productoData || !loteData) {
      return NextResponse.json(
        { error: 'Faltan datos del producto o lote' },
        { status: 400 }
      )
    }

    // TRANSACCIÓN ATÓMICA: Todo o nada
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el código de producto no exista
      const existingProduct = await tx.productos.findUnique({
        where: { codigo: productoData.codigo },
      })

      if (existingProduct) {
        throw new Error(`El código de producto "${productoData.codigo}" ya existe`)
      }

      // 2. Verificar que el código de lote no exista
      const existingLote = await tx.lotes_productos.findUnique({
        where: { codigo_lote: loteData.codigo_lote },
      })

      if (existingLote) {
        throw new Error(`El código de lote "${loteData.codigo_lote}" ya existe`)
      }

      // 3. Crear producto (usando relaciones connect en lugar de IDs directos)
      const producto = await tx.productos.create({
        data: {
          codigo: productoData.codigo,
          nombre: productoData.nombre,
          descripcion: productoData.descripcion || null,
          categoria: productoData.categoria_id ? {
            connect: { id: productoData.categoria_id }
          } : undefined,
          unidad_productiva: productoData.unidad_productiva_id ? {
            connect: { id: productoData.unidad_productiva_id }
          } : undefined,
          tipo_medida: productoData.tipo_medida,
          unidad: productoData.unidad,
          precio_unitario: productoData.precio_unitario,
          precio_mayorista: productoData.precio_mayorista || null,
          stock_actual: 0, // Se actualizará después de crear el lote
          stock_minimo: productoData.stock_minimo || 10,
          stock_maximo: productoData.stock_maximo || null,
          es_perecedero: productoData.es_perecedero || false,
          dias_vencimiento: productoData.dias_vencimiento || null,
          imagen_url: productoData.imagen_url || null,
          activo: true,
        },
      })

      // 4. Calcular fecha de vencimiento si es perecedero
      let fechaVencimiento: Date | null = null
      
      // Parsear fecha_produccion
      const fechaProduccion = new Date(loteData.fecha_produccion)
      
      if (producto.es_perecedero && producto.dias_vencimiento) {
        fechaVencimiento = new Date(fechaProduccion)
        fechaVencimiento.setDate(fechaVencimiento.getDate() + producto.dias_vencimiento)
      }

      // 5. Crear lote inicial (esto dispara el trigger que actualiza stock_actual automáticamente)
      const lote = await tx.lotes_productos.create({
        data: {
          producto: {
            connect: { id: producto.id }
          },
          codigo_lote: loteData.codigo_lote,
          cantidad: loteData.cantidad,
          fecha_produccion: fechaProduccion,
          fecha_vencimiento: fechaVencimiento,
          unidad_productiva: {
            connect: { id: loteData.unidad_productiva_id }
          },
          estado: 'disponible',
        },
      })
      // NOTA: El trigger sync_stock_on_lote_insert se encarga de:
      // - Actualizar stock_actual del producto
      // - Crear registro en historial_inventario (pero sin usuario_id)

      // 5.1. Actualizar el registro de historial que creó el trigger para agregar usuario_id
      await tx.historial_inventario.updateMany({
        where: {
          producto_id: producto.id,
          referencia_id: lote.id,
          referencia_tipo: 'lote',
          usuario_id: null, // Solo actualizar los que no tienen usuario
        },
        data: {
          usuario_id: Number(session.user.id),
        },
      })

      // 5.2. Crear registro en auditoría
      await tx.auditoria.create({
        data: {
          tabla: 'productos',
          registro_id: producto.id,
          accion: 'CREATE',
          usuario_id: Number(session.user.id),
          datos_nuevos: {
            codigo: producto.codigo,
            nombre: producto.nombre,
            categoria_id: productoData.categoria_id,
            unidad_productiva_id: productoData.unidad_productiva_id,
            precio_unitario: producto.precio_unitario,
            stock_minimo: producto.stock_minimo,
            stock_maximo: producto.stock_maximo,
            lote_inicial: {
              codigo_lote: loteData.codigo_lote,
              cantidad: loteData.cantidad
            }
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // 6. Recargar producto con las relaciones completas
      const productoCompleto = await tx.productos.findUnique({
        where: { id: producto.id },
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
              codigo: true,
              nombre: true,
            },
          },
          proveedor: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      })

      // 7. Retornar ambos objetos creados con relaciones
      return { producto: productoCompleto, lote }
    })

    return NextResponse.json(
      {
        success: true,
        message: `Producto "${result.producto.nombre}" creado con lote inicial`,
        data: result,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/productos/con-lote:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
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
