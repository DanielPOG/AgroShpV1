import { prisma } from './prisma'

let cachedConfig: Record<string, any> | null = null
let cacheTime: number = 0
// 10 segundos en desarrollo, 60 en producción
const CACHE_DURATION = process.env.NODE_ENV === 'development' ? 10000 : 60000

/**
 * Obtiene la configuración con caché para evitar queries repetitivas
 */
export async function getCachedConfig(): Promise<Record<string, any>> {
  const now = Date.now()
  
  if (cachedConfig && (now - cacheTime) < CACHE_DURATION) {
    return cachedConfig
  }
  
  try {
    const configs = await prisma.configuracion.findMany()
    
    const result: Record<string, any> = {}
    configs.forEach(config => {
      switch (config.tipo) {
        case 'number':
          result[config.clave] = Number(config.valor)
          break
        case 'boolean':
          result[config.clave] = config.valor === 'true'
          break
        default:
          result[config.clave] = config.valor
      }
    })
    
    cachedConfig = result
    cacheTime = now
    return result
  } catch (error) {
    console.error('Error al obtener configuraciones:', error)
    return cachedConfig || {}
  }
}

/**
 * Invalida el caché de configuración (llamar después de actualizar config)
 */
export function invalidateConfigCache() {
  cachedConfig = null
  cacheTime = 0
}
