import Redis from 'ioredis'

let redis: Redis | null = null

function getRedisUrl(): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return g.process?.env?.REDIS_URL
}

export function getRedis(): Redis | null {
  if (redis) return redis

  const url = getRedisUrl()
  if (!url) return null

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
    })

    redis.on('error', () => {
      // Silenciar errores de conexión — el fallback a memoria se activa automáticamente
    })

    redis.connect().catch(() => {
      redis = null
    })

    return redis
  } catch {
    return null
  }
}
