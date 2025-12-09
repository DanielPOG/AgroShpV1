/**
 * API: POST /api/alertas/verificar
 * 
 * Ejecuta verificación completa de alertas del sistema:
 * - Stock bajo/agotado/exceso
 * - Lotes próximos a vencer
 * - Limpieza de alertas resueltas
 * 
 * Este endpoint se ejecuta:
 * - Manualmente cuando el usuario realiza acciones
 * - Automáticamente cada X minutos mediante polling
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { ejecutarVerificacionCompleta } from '@/lib/db/alertas'

export async function POST() {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Ejecutar verificación completa
    const resultado = await ejecutarVerificacionCompleta()

    return NextResponse.json({
      success: true,
      resultado: {
        agotado: resultado.agotado,
        bajo: resultado.bajo,
        exceso: resultado.exceso,
        lotesVencimiento: resultado.lotesVencimiento,
        alertasLimpiadas: resultado.alertasLimpiadas
      }
    })
  } catch (error) {
    console.error('Error al verificar alertas:', error)
    return NextResponse.json(
      { error: 'Error al verificar alertas' },
      { status: 500 }
    )
  }
}
