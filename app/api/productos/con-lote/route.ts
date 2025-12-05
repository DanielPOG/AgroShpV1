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
 * - producto: datos del producto (codigo, nombre, categoria_id, stock_maximo, proveedor_id, etc.)
 * - lote: datos del lote inicial (codigo_lote, cantidad, fecha_produccion, etc.)
 * - costos: costos de producción del lote (opcional, solo para productos propios)
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
    const { producto: productoData, lote: loteData, costos: costosData } = body

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
          es_produccion_propia: productoData.es_produccion_propia ?? true,
          proveedor: productoData.proveedor_id ? {
            connect: { id: productoData.proveedor_id }
          } : undefined,
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

      // 5. Crear lote inicial
      // NOTA: El trigger sync_stock_on_lote_insert se encarga automáticamente de:
      // - Actualizar stock_actual del producto
      // - Crear registro en historial_inventario
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

      // 6. Actualizar usuario_id en el registro de historial creado por el trigger
      await tx.historial_inventario.updateMany({
        where: {
          producto_id: producto.id,
          referencia_id: lote.id,
          referencia_tipo: 'lote',
          usuario_id: null, // Solo actualizar registros sin usuario
        },
        data: {
          usuario_id: Number(session.user.id),
        },
      })

      // 7. Registrar costos de producción si se proporcionaron
      if (costosData && producto.es_produccion_propia) {
        const costoTotal = 
          (costosData.costo_materia_prima || 0) +
          (costosData.costo_mano_obra || 0) +
          (costosData.costo_insumos || 0) +
          (costosData.costo_energia || 0) +
          (costosData.otros_costos || 0)

        const costoUnitario = loteData.cantidad > 0 ? costoTotal / loteData.cantidad : 0

        await tx.costos_produccion.create({
          data: {
            producto_id: producto.id,
            lote_id: lote.id,
            costo_materia_prima: costosData.costo_materia_prima || 0,
            costo_mano_obra: costosData.costo_mano_obra || 0,
            costo_insumos: costosData.costo_insumos || 0,
            costo_energia: costosData.costo_energia || 0,
            otros_costos: costosData.otros_costos || 0,
            costo_total: costoTotal,
            cantidad_producida: loteData.cantidad,
            costo_unitario: costoUnitario,
            fecha_registro: new Date(),
            observaciones: 'Costos del lote inicial',
          },
        })
      }

      // 8. Registrar en auditoría
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
            es_produccion_propia: producto.es_produccion_propia,
            proveedor_id: productoData.proveedor_id,
            lote_inicial: {
              codigo_lote: loteData.codigo_lote,
              cantidad: loteData.cantidad
            },
            costos_registrados: costosData ? true : false
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // 9. Recargar producto con las relaciones completas
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

      // 10. Retornar producto completo con lote y costos
      return { producto: productoCompleto, lote }
    })

    return NextResponse.json(
      {
        success: true,
        message: `Producto "${result.producto!.nombre}" creado con lote inicial`,
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
