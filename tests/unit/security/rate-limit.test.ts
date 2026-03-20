import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEnvNumber, getClientIpAddress, checkRateLimit } from '@/lib/security/rate-limit'

// Mock Redis para forzar fallback a memoria
vi.mock('@/lib/redis', () => ({
  getRedis: () => null,
}))

// ─── getEnvNumber ─────────────────────────────────────────────

describe('getEnvNumber', () => {
  const originalProcess = globalThis.process

  beforeEach(() => {
    // Limpiar env entre tests
    if (globalThis.process?.env) {
      delete globalThis.process.env.TEST_VAR
    }
  })

  it('retorna el fallback cuando la variable no existe', () => {
    expect(getEnvNumber('VARIABLE_QUE_NO_EXISTE_12345', 42)).toBe(42)
  })

  it('parsea un valor numérico válido', () => {
    globalThis.process = { ...originalProcess, env: { ...originalProcess.env, TEST_VAR: '100' } } as any
    expect(getEnvNumber('TEST_VAR', 42)).toBe(100)
  })

  it('retorna fallback para valor no numérico', () => {
    globalThis.process = { ...originalProcess, env: { ...originalProcess.env, TEST_VAR: 'abc' } } as any
    expect(getEnvNumber('TEST_VAR', 42)).toBe(42)
  })

  it('retorna fallback para valor 0 (no positivo)', () => {
    globalThis.process = { ...originalProcess, env: { ...originalProcess.env, TEST_VAR: '0' } } as any
    expect(getEnvNumber('TEST_VAR', 42)).toBe(42)
  })

  it('retorna fallback para valor negativo', () => {
    globalThis.process = { ...originalProcess, env: { ...originalProcess.env, TEST_VAR: '-5' } } as any
    expect(getEnvNumber('TEST_VAR', 42)).toBe(42)
  })
})

// ─── getClientIpAddress ───────────────────────────────────────

describe('getClientIpAddress', () => {
  it('extrae primera IP de x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIpAddress(headers)).toBe('1.2.3.4')
  })

  it('extrae IP de x-forwarded-for con un solo valor', () => {
    const headers = new Headers({ 'x-forwarded-for': '10.0.0.1' })
    expect(getClientIpAddress(headers)).toBe('10.0.0.1')
  })

  it('usa x-real-ip como fallback', () => {
    const headers = new Headers({ 'x-real-ip': '192.168.1.1' })
    expect(getClientIpAddress(headers)).toBe('192.168.1.1')
  })

  it('retorna "unknown-ip" sin headers de IP', () => {
    const headers = new Headers()
    expect(getClientIpAddress(headers)).toBe('unknown-ip')
  })

  it('prefiere x-forwarded-for sobre x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
    })
    expect(getClientIpAddress(headers)).toBe('1.1.1.1')
  })

  it('elimina espacios en blanco de la IP', () => {
    const headers = new Headers({ 'x-forwarded-for': '  3.3.3.3  , 4.4.4.4' })
    expect(getClientIpAddress(headers)).toBe('3.3.3.3')
  })
})

// ─── checkRateLimit (memory fallback) ─────────────────────────

describe('checkRateLimit (memory fallback)', () => {
  it('permite la primera petición', async () => {
    const result = await checkRateLimit({
      key: 'test-rl-first-' + Date.now(),
      limit: 5,
      windowMs: 60_000,
    })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('bloquea cuando se excede el límite', async () => {
    const key = 'test-rl-exceed-' + Date.now()
    const input = { key, limit: 3, windowMs: 60_000 }

    await checkRateLimit(input) // 1
    await checkRateLimit(input) // 2
    await checkRateLimit(input) // 3

    const result = await checkRateLimit(input) // 4 → bloqueado
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('decrementa remaining correctamente', async () => {
    const key = 'test-rl-dec-' + Date.now()
    const input = { key, limit: 5, windowMs: 60_000 }

    const r1 = await checkRateLimit(input)
    expect(r1.remaining).toBe(4)

    const r2 = await checkRateLimit(input)
    expect(r2.remaining).toBe(3)
  })

  it('tiene resetAt en el futuro', async () => {
    const now = Date.now()
    const result = await checkRateLimit({
      key: 'test-rl-reset-' + now,
      limit: 10,
      windowMs: 60_000,
    })
    expect(result.resetAt).toBeGreaterThan(now)
  })

  it('claves diferentes no interfieren entre sí', async () => {
    const ts = Date.now()
    const input1 = { key: `test-rl-isolated-a-${ts}`, limit: 1, windowMs: 60_000 }
    const input2 = { key: `test-rl-isolated-b-${ts}`, limit: 1, windowMs: 60_000 }

    await checkRateLimit(input1) // consume el único slot de key A

    const result = await checkRateLimit(input2) // key B debe tener su propio slot
    expect(result.allowed).toBe(true)
  })
})
