import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { getColombiaDate } from '@/lib/date-utils'

/**
 * DELETE /api/productos/[id]/eliminar-permanente
 * Elimina PERMANENTEMENTE un producto de la base de datos
 * 
 * CONDICIONES:
 * 1. El producto debe estar inactivo (activo = false)
 * 2. No debe tener lotes asociados
 * 3. No debe tener ventas asociadas
 * 4. Se registra en auditoría antes de eliminar
 * 
 * Roles permitidos: Solo Admin
 */
export async function DELETE(
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

    // Verificar rol - SOLO ADMIN puede eliminar permanentemente
    const userRole = session.user.role
    if (userRole !== 'Admin') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin puede eliminar productos permanentemente.',
        },
        { status: 403 }
      )
    }

    // Await params en Next.js 15+
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      )
    }

    // TRANSACCIÓN ATÓMICA: Validar y eliminar
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el producto existe
      const producto = await tx.productos.findUnique({
        where: { id },
        include: {
          lotes_productos: true,
          detalle_ventas: true,
          detalle_movimientos: true,
          costos_produccion: true,
        },
      })

      if (!producto) {
        throw new Error('Producto no encontrado')
      }

      // 2. Verificar que el producto está inactivo
      if (producto.activo) {
        throw new Error(
          'Solo se pueden eliminar productos inactivos. Primero desactiva el producto.'
        )
      }

      // 3. Verificar que no tenga lotes
      if (producto.lotes_productos && producto.lotes_productos.length > 0) {
        throw new Error(
          `El producto tiene ${producto.lotes_productos.length} lote(s) asociado(s). No se puede eliminar.`
        )
      }

      // 4. Verificar que no tenga ventas
      if (producto.detalle_ventas && producto.detalle_ventas.length > 0) {
        throw new Error(
          `El producto tiene ${producto.detalle_ventas.length} venta(s) asociada(s). No se puede eliminar.`
        )
      }

      // 5. Verificar que no tenga movimientos
      if (producto.detalle_movimientos && producto.detalle_movimientos.length > 0) {
        throw new Error(
          `El producto tiene ${producto.detalle_movimientos.length} movimiento(s) asociado(s). No se puede eliminar.`
        )
      }

      // 6. Registrar en auditoría ANTES de eliminar
      await tx.historial_inventario.create({
        data: {
          producto: {
            connect: { id }
          },
          tipo_movimiento: 'eliminacion_permanente',
          cantidad_anterior: producto.stock_actual,
          cantidad_movimiento: producto.stock_actual,
          cantidad_nueva: 0,
          usuario_id: Number(session.user.id),
          referencia_tipo: 'eliminacion_bd',
          observaciones: JSON.stringify({
            accion: 'ELIMINACIÓN PERMANENTE DE BASE DE DATOS',
            codigo: producto.codigo,
            nombre: producto.nombre,
            categoria_id: producto.categoria_id,
            unidad_productiva_id: producto.unidad_productiva_id,
            stock_final: producto.stock_actual,
            unidad: producto.unidad,
            precio_unitario: producto.precio_unitario.toString(),
            es_perecedero: producto.es_perecedero,
            fecha_eliminacion: getColombiaDate().toISOString(),
            motivo: 'Eliminación administrativa por usuario Admin'
          }),
          fecha_movimiento: getColombiaDate(),
        },
      })

      // 7. Eliminar costos de producción si existen (opcional, pero mejor limpieza)
      if (producto.costos_produccion && producto.costos_produccion.length > 0) {
        await tx.costos_produccion.deleteMany({
          where: { producto_id: id },
        })
      }

      // 8. Eliminar el producto PERMANENTEMENTE
      await tx.productos.delete({
        where: { id },
      })

      return {
        codigo: producto.codigo,
        nombre: producto.nombre,
        stock_eliminado: producto.stock_actual,
        unidad: producto.unidad,
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: `Producto "${result.nombre}" eliminado permanentemente de la base de datos`,
        data: result,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error en DELETE /api/productos/[id]/eliminar-permanente:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
