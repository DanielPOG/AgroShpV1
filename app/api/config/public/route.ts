import { NextResponse } from "next/server"
import { getCachedConfig } from "@/lib/config-cache"

/**
 * GET /api/config/public
 * Obtener configuraciones públicas (sin autenticación)
 */
export async function GET() {
  try {
    const config = await getCachedConfig()
    
    // Solo devolver configuraciones que pueden ser públicas
    const response = NextResponse.json({
      iva_porcentaje: config.iva_porcentaje ?? 19,
      nombre_tienda: config.nombre_tienda ?? "AgroShop SENA",
      stock_minimo_default: config.stock_minimo_default ?? 10,
      dias_alerta_vencimiento: config.dias_alerta_vencimiento ?? 7,
    })

    // ✅ CRÍTICO: Deshabilitar caché del navegador
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error("Error obteniendo configuración pública:", error)
    // Devolver valores por defecto en caso de error
    const response = NextResponse.json({
      iva_porcentaje: 19,
      nombre_tienda: "AgroShop SENA",
      stock_minimo_default: 10,
      dias_alerta_vencimiento: 7,
    })

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  }
}
