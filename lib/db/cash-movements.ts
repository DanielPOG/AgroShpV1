import { prisma } from '@/lib/prisma'

/**
 * Registrar un movimiento de caja (ingreso/egreso)
 * Se llama automáticamente al crear una venta
 */
export async function createCashMovement(data: {
  sesion_caja_id: number
  turno_caja_id?: number
  tipo_movimiento: 'ingreso' | 'egreso'
  descripcion: string
  monto: number
  metodo_pago?: string | null
  venta_id?: number | null
  usuario_id?: number
}) {
  console.log(`💰 Registrando movimiento de caja: ${data.tipo_movimiento} - $${data.monto}`)

  const movement = await prisma.movimientos_caja.create({
    data: {
      sesion_caja_id: data.sesion_caja_id,
      turno_caja_id: data.turno_caja_id,
      tipo_movimiento: data.tipo_movimiento,
      descripcion: data.descripcion,
      monto: data.monto,
      metodo_pago: data.metodo_pago,
      venta_id: data.venta_id,
      usuario_id: data.usuario_id,
      fecha_movimiento: new Date(),
      requiere_autorizacion: false,
    },
  })

  // Actualizar efectivo_esperado de la sesión
  await prisma.sesiones_caja.update({
    where: { id: data.sesion_caja_id },
    data: {
      efectivo_esperado: {
        [data.tipo_movimiento === 'ingreso' ? 'increment' : 'decrement']: data.monto,
      },
    },
  })

  console.log(`✅ Movimiento registrado: ID ${movement.id}`)
  return movement
}

/**
 * Obtener movimientos de una sesión
 */
export async function getCashMovements(sessionId: number, filters?: {
  tipo_movimiento?: 'ingreso' | 'egreso'
  metodo_pago?: string
  limit?: number
}) {
  const where: any = {
    sesion_caja_id: sessionId,
  }

  if (filters?.tipo_movimiento) {
    where.tipo_movimiento = filters.tipo_movimiento
  }

  if (filters?.metodo_pago) {
    where.metodo_pago = filters.metodo_pago
  }

  return prisma.movimientos_caja.findMany({
    where,
    include: {
      venta: {
        select: {
          codigo_venta: true,
          total: true,
        },
      },
    },
    orderBy: { fecha_movimiento: 'desc' },
    take: filters?.limit || 100,
  })
}
