import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * Schema de validación para costos de producción
 */
const costosSchema = z.object({
  costo_materia_prima: z.number().min(0, 'El costo de materia prima no puede ser negativo').default(0),
  costo_mano_obra: z.number().min(0, 'El costo de mano de obra no puede ser negativo').default(0),
  costo_insumos: z.number().min(0, 'El costo de insumos no puede ser negativo').default(0),
  costo_energia: z.number().min(0, 'El costo de energía no puede ser negativo').default(0),
  otros_costos: z.number().min(0, 'Otros costos no pueden ser negativos').default(0),
  observaciones: z.string().max(500, 'Las observaciones no pueden exceder 500 caracteres').optional().nullable(),
})

type CostosData = z.infer<typeof costosSchema>

/**
 * GET /api/lotes/[id]/costos
 * Obtiene los costos de producción de un lote específico
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

    // Await params (Next.js 15 requirement)
    const { id } = await params
    const loteId = parseInt(id)

    if (isNaN(loteId)) {
      return NextResponse.json(
        { error: 'ID de lote inválido' },
        { status: 400 }
      )
    }

    // Verificar que el lote existe
    const lote = await prisma.lotes_productos.findUnique({
      where: { id: loteId },
      select: { 
        id: true, 
        codigo_lote: true, 
        cantidad: true,
        estado: true  // ✅ AGREGAR ESTADO
      },
    })

    if (!lote) {
      return NextResponse.json(
        { error: 'Lote no encontrado' },
        { status: 404 }
      )
    }

    // Obtener costos del lote
    const costos = await prisma.costos_produccion.findFirst({
      where: { lote_id: loteId },
      select: {
        id: true,
        costo_materia_prima: true,
        costo_mano_obra: true,
        costo_insumos: true,
        costo_energia: true,
        otros_costos: true,
        costo_total: true,
        cantidad_producida: true,
        costo_unitario: true,
        observaciones: true,
        fecha_registro: true,
        created_at: true,
      },
    })

    return NextResponse.json({
      lote,
      costos: costos || null,
    }, { status: 200 })

  } catch (error) {
    console.error('Error en GET /api/lotes/[id]/costos:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/lotes/[id]/costos
 * Actualiza o crea los costos de producción de un lote
 * 
 * Si ya existen costos: UPDATE
 * Si no existen costos: CREATE
 * 
 * Body: CostosData (ver costosSchema)
 * 
 * Roles permitidos: Admin, Inventarista
 */
export async function PUT(
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

    // Verificar rol
    const userRole = session.user.role
    if (userRole !== 'Admin' && userRole !== 'Inventarista') {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Solo Admin e Inventarista pueden editar costos.',
        },
        { status: 403 }
      )
    }

    // Await params (Next.js 15 requirement)
    const { id } = await params
    const loteId = parseInt(id)

    if (isNaN(loteId)) {
      return NextResponse.json(
        { error: 'ID de lote inválido' },
        { status: 400 }
      )
    }

    // Parsear y validar body
    const body = await request.json()
    const validatedData = costosSchema.parse(body)

    // Verificar que el lote existe y obtener su información
    const lote = await prisma.lotes_productos.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        codigo_lote: true,
        cantidad: true,
        estado: true,
        producto_id: true,
        producto: {
          select: {
            nombre: true,
          },
        },
      },
    })

    if (!lote) {
      return NextResponse.json(
        { error: 'Lote no encontrado' },
        { status: 404 }
      )
    }

    // 🔒 VALIDACIÓN: No permitir editar costos de lotes vencidos o retirados
    if (lote.estado === 'vencido') {
      return NextResponse.json(
        {
          error: 'No se pueden editar costos de un lote vencido',
          detalle: `El lote ${lote.codigo_lote} está vencido y no puede modificarse`,
        },
        { status: 400 }
      )
    }

    if (lote.estado === 'retirado') {
      return NextResponse.json(
        {
          error: 'No se pueden editar costos de un lote retirado',
          detalle: `El lote ${lote.codigo_lote} está retirado y no puede modificarse`,
        },
        { status: 400 }
      )
    }

    // Calcular costo total y unitario
    const costoTotal =
      validatedData.costo_materia_prima +
      validatedData.costo_mano_obra +
      validatedData.costo_insumos +
      validatedData.costo_energia +
      validatedData.otros_costos

    const costoUnitario = Number(lote.cantidad) > 0 ? costoTotal / Number(lote.cantidad) : 0

    // Verificar si ya existen costos para este lote
    const existingCostos = await prisma.costos_produccion.findFirst({
      where: { lote_id: loteId },
    })

    let result

    if (existingCostos) {
      // ✅ UPDATE: Actualizar costos existentes

      // Guardar datos anteriores para auditoría
      const datosAnteriores = {
        costo_materia_prima: existingCostos.costo_materia_prima,
        costo_mano_obra: existingCostos.costo_mano_obra,
        costo_insumos: existingCostos.costo_insumos,
        costo_energia: existingCostos.costo_energia,
        otros_costos: existingCostos.otros_costos,
        costo_total: existingCostos.costo_total,
        costo_unitario: existingCostos.costo_unitario,
        observaciones: existingCostos.observaciones,
      }

      // Actualizar costos
      result = await prisma.costos_produccion.update({
        where: { id: existingCostos.id },
        data: {
          costo_materia_prima: validatedData.costo_materia_prima,
          costo_mano_obra: validatedData.costo_mano_obra,
          costo_insumos: validatedData.costo_insumos,
          costo_energia: validatedData.costo_energia,
          otros_costos: validatedData.otros_costos,
          costo_total: costoTotal,
          cantidad_producida: lote.cantidad,
          costo_unitario: costoUnitario,
          observaciones: validatedData.observaciones || null,
        },
      })

      // 📝 Registrar en auditoría
      await prisma.auditoria.create({
        data: {
          tabla: 'costos_produccion',
          registro_id: existingCostos.id,
          accion: 'UPDATE',
          usuario_id: Number(session.user.id),
          datos_anteriores: datosAnteriores,
          datos_nuevos: {
            costo_materia_prima: validatedData.costo_materia_prima,
            costo_mano_obra: validatedData.costo_mano_obra,
            costo_insumos: validatedData.costo_insumos,
            costo_energia: validatedData.costo_energia,
            otros_costos: validatedData.otros_costos,
            costo_total: costoTotal,
            costo_unitario: costoUnitario,
            observaciones: validatedData.observaciones,
          },
        },
      })

      return NextResponse.json(
        {
          message: 'Costos actualizados exitosamente',
          costos: result,
          accion: 'UPDATE',
        },
        { status: 200 }
      )
    } else {
      // ✅ CREATE: Crear nuevos costos

      result = await prisma.costos_produccion.create({
        data: {
          producto_id: lote.producto_id,
          lote_id: loteId,
          costo_materia_prima: validatedData.costo_materia_prima,
          costo_mano_obra: validatedData.costo_mano_obra,
          costo_insumos: validatedData.costo_insumos,
          costo_energia: validatedData.costo_energia,
          otros_costos: validatedData.otros_costos,
          costo_total: costoTotal,
          cantidad_producida: lote.cantidad,
          costo_unitario: costoUnitario,
          observaciones: validatedData.observaciones || null,
          fecha_registro: new Date(),
        },
      })

      // 📝 Registrar en auditoría
      await prisma.auditoria.create({
        data: {
          tabla: 'costos_produccion',
          registro_id: result.id,
          accion: 'INSERT',
          usuario_id: Number(session.user.id),
          datos_nuevos: {
            lote_id: loteId,
            codigo_lote: lote.codigo_lote,
            producto: lote.producto?.nombre,
            costo_materia_prima: validatedData.costo_materia_prima,
            costo_mano_obra: validatedData.costo_mano_obra,
            costo_insumos: validatedData.costo_insumos,
            costo_energia: validatedData.costo_energia,
            otros_costos: validatedData.otros_costos,
            costo_total: costoTotal,
            costo_unitario: costoUnitario,
            observaciones: validatedData.observaciones,
          },
        },
      })

      return NextResponse.json(
        {
          message: 'Costos creados exitosamente',
          costos: result,
          accion: 'CREATE',
        },
        { status: 201 }
      )
    }

  } catch (error) {
    console.error('Error en PUT /api/lotes/[id]/costos:', error)

    if (error instanceof z.ZodError) {
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
