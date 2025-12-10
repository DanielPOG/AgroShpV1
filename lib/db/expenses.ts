import { prisma } from '@/lib/prisma'
import type { ExpenseData } from '@/lib/validations/expense.schema'

/**
 * Registrar un gasto de caja chica
 */
export async function createExpense(sessionId: number, userId: number, data: ExpenseData) {
  console.log(`🧾 Registrando gasto: ${data.concepto} - $${data.monto}`)

  return await prisma.$transaction(async (tx) => {
    // Crear gasto
    const expense = await tx.gastos_caja.create({
      data: {
        sesion_caja_id: sessionId,
        descripcion: data.concepto,
        monto: data.monto,
        categoria_gasto: data.categoria,
        numero_factura: data.comprobante_numero,
        observaciones: data.observaciones,
        registrado_por: userId,
        fecha_gasto: new Date(),
      },
    })

    // Descontar del efectivo_esperado de la sesión
    await tx.sesiones_caja.update({
      where: { id: sessionId },
      data: {
        efectivo_esperado: {
          decrement: data.monto,
        },
      },
    })

    console.log(`✅ Gasto registrado: ID ${expense.id}`)
    return expense
  })
}

/**
 * Obtener gastos de una sesión
 */
export async function getSessionExpenses(sessionId: number) {
  return prisma.gastos_caja.findMany({
    where: { sesion_caja_id: sessionId },
    include: {
      registrado_por: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
    },
    orderBy: { fecha_gasto: 'desc' },
  })
}

/**
 * Obtener gastos por categoría en un rango de fechas
 */
export async function getExpensesByCategory(filters: {
  fecha_desde: Date
  fecha_hasta: Date
  categoria?: string
}) {
  const where: any = {
    fecha_gasto: {
      gte: filters.fecha_desde,
      lte: filters.fecha_hasta,
    },
  }

  if (filters.categoria) {
    where.categoria_gasto = filters.categoria
  }

  const expenses = await prisma.gastos_caja.findMany({
    where,
    orderBy: { fecha_gasto: 'desc' },
  })

  // Agrupar por categoría
  const byCategory = expenses.reduce((acc, expense) => {
    const cat = expense.categoria_gasto
    if (!acc[cat]) {
      acc[cat] = {
        total: 0,
        count: 0,
        items: [],
      }
    }
    acc[cat].total += Number(expense.monto)
    acc[cat].count += 1
    acc[cat].items.push(expense)
    return acc
  }, {} as Record<string, { total: number; count: number; items: any[] }>)

  return byCategory
}
