import { prisma } from '@/lib/prisma'
import type { CashWithdrawalData, AuthorizeCashWithdrawalData } from '@/lib/validations/cash-withdrawal.schema'

/**
 * Solicitar un retiro de efectivo
 */
export async function requestCashWithdrawal(
  sessionId: number,
  userId: number,
  data: CashWithdrawalData
) {
  console.log(`💸 Solicitud de retiro: $${data.monto}`)

  const withdrawal = await prisma.retiros_caja.create({
    data: {
      sesion_caja_id: sessionId,
      monto: data.monto,
      motivo: data.motivo,
      solicitado_por: userId,
      fecha_solicitud: new Date(),
      estado: data.requiere_autorizacion ? 'pendiente' : 'autorizado',
    },
  })

  console.log(`✅ Retiro creado: ID ${withdrawal.id}`)
  return withdrawal
}

/**
 * Autorizar o rechazar un retiro
 */
export async function authorizeCashWithdrawal(
  withdrawalId: number,
  authorizerId: number,
  data: AuthorizeCashWithdrawalData
) {
  console.log(`🔐 Autorizando retiro ${withdrawalId}`)

  return await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.retiros_caja.findUnique({
      where: { id: withdrawalId },
      include: {
        sesion_caja: true,
      },
    })

    if (!withdrawal) {
      throw new Error('Retiro no encontrado')
    }

    if (withdrawal.estado !== 'pendiente') {
      throw new Error('El retiro ya fue procesado')
    }

    // Actualizar retiro
    const updatedWithdrawal = await tx.retiros_caja.update({
      where: { id: withdrawalId },
      data: {
        estado: data.autorizado ? 'autorizado' : 'rechazado',
        autorizado_por: authorizerId,
        fecha_respuesta: new Date(),
        observaciones: data.observaciones_autorizacion,
      },
    })

    // Si fue aprobado, descontar del efectivo_esperado
    if (data.autorizado) {
      await tx.sesiones_caja.update({
        where: { id: withdrawal.sesion_caja_id },
        data: {
          efectivo_esperado: {
            decrement: withdrawal.monto,
          },
        },
      })
    }

    return updatedWithdrawal
  })
}

/**
 * Obtener retiros pendientes de autorización
 */
export async function getPendingWithdrawals(cajaId?: number) {
  return prisma.retiros_caja.findMany({
    where: {
      estado: 'pendiente',
      ...(cajaId && {
        sesion_caja: {
          caja_id: cajaId,
        },
      }),
    },
    include: {
      solicitante: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
      sesion_caja: {
        include: {
          caja: true,
        },
      },
    },
    orderBy: { fecha_solicitud: 'asc' },
  })
}

/**
 * Obtener retiros de una sesión
 */
export async function getSessionWithdrawals(sessionId: number) {
  return prisma.retiros_caja.findMany({
    where: { sesion_caja_id: sessionId },
    include: {
      solicitante: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
      autorizador: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
    },
    orderBy: { fecha_solicitud: 'desc' },
  })
}
