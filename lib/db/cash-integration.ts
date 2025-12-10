import { prisma } from '@/lib/prisma'
import { getActiveCashSession } from './cash-sessions'
import { createCashMovement } from './cash-movements'

/**
 * Validar que el cajero tenga una sesión de caja abierta
 * Esta función DEBE llamarse antes de permitir cualquier venta
 */
export async function validateCashSessionForSale(userId: number) {
  console.log(`🔍 Validando sesión de caja para usuario ${userId}`)

  const activeSession = await getActiveCashSession(userId)

  if (!activeSession) {
    throw new Error(
      'No tienes una sesión de caja abierta. Debes abrir caja antes de realizar ventas.'
    )
  }

  console.log(`✅ Sesión de caja activa: ID ${activeSession.id}`)
  return activeSession
}

/**
 * Registrar una venta en los movimientos de caja
 * Se llama automáticamente después de crear una venta exitosa
 */
export async function registerSaleInCashMovements(data: {
  sessionId: number
  ventaId: number
  codigoVenta: string
  total: number
  metodoPagoId: number
  metodoPagoNombre: string
}) {
  console.log(`💰 Registrando venta en movimientos de caja: ${data.codigoVenta}`)

  const movement = await createCashMovement({
    sesion_caja_id: data.sessionId,
    tipo_movimiento: 'ingreso',
    descripcion: `Venta ${data.codigoVenta}`,
    monto: data.total,
    metodo_pago: data.metodoPagoNombre,
    venta_id: data.ventaId,
  })

  // ✅ NUEVO: Actualizar totales por método de pago en sesiones_caja
  const metodoPagoLower = data.metodoPagoNombre.toLowerCase()
  
  let campoActualizar: 
    | 'total_ventas_efectivo' 
    | 'total_ventas_nequi' 
    | 'total_ventas_tarjeta' 
    | 'total_ventas_transferencia'
    | null = null

  if (metodoPagoLower.includes('efectivo') || metodoPagoLower.includes('cash')) {
    campoActualizar = 'total_ventas_efectivo'
  } else if (metodoPagoLower.includes('nequi')) {
    campoActualizar = 'total_ventas_nequi'
  } else if (metodoPagoLower.includes('tarjeta') || metodoPagoLower.includes('card')) {
    campoActualizar = 'total_ventas_tarjeta'
  } else if (metodoPagoLower.includes('transferencia') || metodoPagoLower.includes('bancolombia')) {
    campoActualizar = 'total_ventas_transferencia'
  }

  if (campoActualizar) {
    await prisma.sesiones_caja.update({
      where: { id: data.sessionId },
      data: {
        [campoActualizar]: {
          increment: data.total
        }
      }
    })
    console.log(`✅ Actualizado ${campoActualizar}: +$${data.total}`)
  }

  console.log(`✅ Venta registrada en movimientos de caja: ID ${movement.id}`)
  return movement
}
