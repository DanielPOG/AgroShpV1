/**
 * API: POST /api/alertas/limpiar-duplicados
 * 
 * Limpia alertas duplicadas del sistema
 * Mantiene solo la alerta más reciente de cada tipo+referencia
 * 
 * Útil para limpiar duplicados históricos
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { limpiarAlertasDuplicadas } from '@/lib/db/alertas'

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

    // Verificar que sea administrador
    if (session.user.role !== 'Administrador') {
      return NextResponse.json(
        { error: 'Solo administradores pueden ejecutar esta acción' },
        { status: 403 }
      )
    }

    // Ejecutar limpieza
    const resultado = await limpiarAlertasDuplicadas()

    return NextResponse.json({
      success: true,
      resultado
    })
  } catch (error) {
    console.error('Error al limpiar alertas duplicadas:', error)
    return NextResponse.json(
      { error: 'Error al limpiar alertas duplicadas' },
      { status: 500 }
    )
  }
}
