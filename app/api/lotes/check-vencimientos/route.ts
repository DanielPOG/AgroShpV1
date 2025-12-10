import { NextRequest, NextResponse } from 'next/server'
import { checkLotesProximosVencer } from '@/lib/db/lotes-vencimiento'

/**
 * GET /api/lotes/check-vencimientos
 * Verifica y actualiza el estado de lotes vencidos
 * Actualiza el stock de productos afectados
 * 
 * Puede ser llamado por:
 * 1. Vercel Cron (automático cada 6 horas)
 * 2. Usuario autenticado (manual desde POS/Lotes)
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el origen de la petición
    const authHeader = request.headers.get('authorization')
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    const userAgent = request.headers.get('user-agent') || ''
    
    console.log('🔍 Iniciando verificación de lotes vencidos...')
    console.log('📍 Origen:', isVercelCron ? 'Vercel Cron (automático)' : `Usuario (${userAgent.substring(0, 50)})`)
    
    const result = await checkLotesProximosVencer()
    
    console.log('✅ Verificación completada:', {
      proximosVencer: result.proximosVencer,
      vencidos: result.vencidos,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Verificación de lotes completada',
      proximosVencer: result.proximosVencer,
      vencidos: result.vencidos,
      ejecutadoPor: isVercelCron ? 'cron' : 'usuario',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error al verificar lotes:', error)
    return NextResponse.json(
      { 
        error: 'Error al verificar lotes vencidos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
