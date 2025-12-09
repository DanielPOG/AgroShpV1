/**
 * API: POST /api/notificaciones/verificar
 * 
 * Ejecuta manualmente todas las verificaciones de alertas:
 * - Stock agotado, bajo y exceso
 * - Lotes próximos a vencer
 * - Limpieza de alertas resueltas
 * 
 * Útil para:
 * - Testing
 * - Forzar verificación después de operaciones
 * - Debugging
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

    console.log('🔍 Ejecutando verificación manual de alertas...')

    // Ejecutar todas las verificaciones
    const resultado = await ejecutarVerificacionCompleta()

    console.log('✅ Verificación completada:', resultado)

    return NextResponse.json({
      success: true,
      message: 'Verificación de alertas completada',
      resultado
    })
  } catch (error) {
    console.error('Error al verificar alertas:', error)
    return NextResponse.json(
      { error: 'Error al verificar alertas' },
      { status: 500 }
    )
  }
}
