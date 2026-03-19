import { getRedis } from '@/lib/redis'

type RateLimitInput = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  resetAt: number
}

// ── Helpers públicos ──────────────────────────────────────────

export function getEnvNumber(name: string, fallback: number): number {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } }
  const value = g.process?.env?.[name]
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getClientIpAddress(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown-ip'
}

// ── Redis sliding-window (sorted set) ────────────────────────
// Cada request se guarda como miembro con score = timestamp.
// Se eliminan miembros fuera de la ventana y se cuenta el resto.

const REDIS_RATE_LIMIT_SCRIPT = `
  local key     = KEYS[1]
  local now     = tonumber(ARGV[1])
  local window  = tonumber(ARGV[2])
  local limit   = tonumber(ARGV[3])
  local member  = ARGV[4]

  local windowStart = now - window

  redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

  local count = redis.call('ZCARD', key)

  if count < limit then
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, window)
    return { 1, limit - count - 1 }
  end

  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfter = 0
  if #oldest >= 2 then
    retryAfter = tonumber(oldest[2]) + window - now
  end
  return { 0, retryAfter }
`

let redisScriptSha: string | null = null

async function checkRateLimitRedis(input: RateLimitInput): Promise<RateLimitResult | null> {
  const redis = getRedis()
  if (!redis || redis.status !== 'ready') return null

  try {
    const now = Date.now()
    const redisKey = `rl:${input.key}`
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`

    // Cargar script en Redis (se cachea con SHA)
    if (!redisScriptSha) {
      redisScriptSha = await redis.script('LOAD', REDIS_RATE_LIMIT_SCRIPT) as string
    }

    const result = await redis.evalsha(
      redisScriptSha,
      1,
      redisKey,
      now.toString(),
      input.windowMs.toString(),
      input.limit.toString(),
      member,
    ) as [number, number]

    const allowed = result[0] === 1

    if (allowed) {
      return {
        allowed: true,
        remaining: result[1],
        retryAfterSeconds: Math.ceil(input.windowMs / 1000),
        resetAt: now + input.windowMs,
      }
    }

    const retryAfterMs = Math.max(result[1], 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil(retryAfterMs / 1000), 1),
      resetAt: now + retryAfterMs,
    }
  } catch {
    // Script pudo haber sido purgado (NOSCRIPT), resetear SHA para recargar
    redisScriptSha = null
    return null // fallback a memoria
  }
}

// ── Fallback en memoria (para desarrollo local sin Redis) ────

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function cleanupExpiredBuckets(now: number): void {
  if (buckets.size < 5000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

function checkRateLimitMemory(input: RateLimitInput): RateLimitResult {
  const now = Date.now()
  cleanupExpiredBuckets(now)

  const existing = buckets.get(input.key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + input.windowMs
    buckets.set(input.key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: Math.max(input.limit - 1, 0),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      resetAt,
    }
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
      resetAt: existing.resetAt,
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: Math.max(input.limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    resetAt: existing.resetAt,
  }
}

// ── API pública ──────────────────────────────────────────────
// Intenta Redis → si no está disponible cae a memoria de forma transparente.

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const redisResult = await checkRateLimitRedis(input)
  if (redisResult) return redisResult
  return checkRateLimitMemory(input)
}
