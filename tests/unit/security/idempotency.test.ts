import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getIdempotencyKey, checkIdempotency, saveIdempotencyResponse } from '@/lib/security/idempotency'

// Mock de Prisma
const mockFindUnique = vi.fn()
const mockDelete = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    idempotency_keys: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      delete: (...args: any[]) => mockDelete(...args),
      upsert: (...args: any[]) => mockUpsert(...args),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── getIdempotencyKey ────────────────────────────────────────

describe('getIdempotencyKey', () => {
  it('extrae la key del header X-Idempotency-Key', () => {
    const headers = new Headers({ 'x-idempotency-key': 'abc-123' })
    expect(getIdempotencyKey(headers)).toBe('abc-123')
  })

  it('retorna null si el header no está presente', () => {
    const headers = new Headers()
    expect(getIdempotencyKey(headers)).toBeNull()
  })

  it('retorna null para header vacío', () => {
    const headers = new Headers({ 'x-idempotency-key': '' })
    expect(getIdempotencyKey(headers)).toBeNull()
  })

  it('retorna null para header con solo espacios', () => {
    const headers = new Headers({ 'x-idempotency-key': '   ' })
    expect(getIdempotencyKey(headers)).toBeNull()
  })

  it('retorna null si la key excede 255 caracteres', () => {
    const longKey = 'a'.repeat(256)
    const headers = new Headers({ 'x-idempotency-key': longKey })
    expect(getIdempotencyKey(headers)).toBeNull()
  })

  it('acepta key de exactamente 255 caracteres', () => {
    const maxKey = 'b'.repeat(255)
    const headers = new Headers({ 'x-idempotency-key': maxKey })
    expect(getIdempotencyKey(headers)).toBe(maxKey)
  })

  it('elimina espacios del valor', () => {
    const headers = new Headers({ 'x-idempotency-key': '  key-with-spaces  ' })
    expect(getIdempotencyKey(headers)).toBe('key-with-spaces')
  })
})

// ─── checkIdempotency ─────────────────────────────────────────

describe('checkIdempotency', () => {
  it('retorna no-hit cuando key es null', async () => {
    const result = await checkIdempotency({
      key: null,
      endpoint: '/api/ventas',
      userId: 1,
    })
    expect(result.hit).toBe(false)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('retorna no-hit cuando no existe registro', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await checkIdempotency({
      key: 'test-key',
      endpoint: '/api/ventas',
      userId: 1,
    })
    expect(result.hit).toBe(false)
  })

  it('retorna hit con respuesta cacheada válida', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      idempotency_key: 'test-key',
      endpoint: '/api/ventas',
      usuario_id: 1,
      status_code: 201,
      response_body: { success: true, data: { id: 42 } },
      expires_at: new Date(Date.now() + 86400000), // futuro
    })

    const result = await checkIdempotency({
      key: 'test-key',
      endpoint: '/api/ventas',
      userId: 1,
    })

    expect(result.hit).toBe(true)
    if (result.hit) {
      expect(result.response.status).toBe(201)
    }
  })

  it('limpia y retorna no-hit para registros expirados', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      idempotency_key: 'old-key',
      endpoint: '/api/ventas',
      usuario_id: 1,
      status_code: 201,
      response_body: {},
      expires_at: new Date(Date.now() - 1000), // pasado
    })
    mockDelete.mockResolvedValue({})

    const result = await checkIdempotency({
      key: 'old-key',
      endpoint: '/api/ventas',
      userId: 1,
    })

    expect(result.hit).toBe(false)
    expect(mockDelete).toHaveBeenCalled()
  })

  it('retorna no-hit si Prisma lanza error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB error'))

    const result = await checkIdempotency({
      key: 'error-key',
      endpoint: '/api/ventas',
      userId: 1,
    })

    expect(result.hit).toBe(false)
  })
})

// ─── saveIdempotencyResponse ──────────────────────────────────

describe('saveIdempotencyResponse', () => {
  it('llama upsert con datos correctos', async () => {
    mockUpsert.mockResolvedValue({})

    await saveIdempotencyResponse({
      key: 'save-key',
      endpoint: '/api/ventas',
      userId: 1,
      statusCode: 201,
      responseBody: { id: 100 },
    })

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const call = mockUpsert.mock.calls[0][0]
    expect(call.where.idempotency_key_endpoint_usuario_id).toEqual({
      idempotency_key: 'save-key',
      endpoint: '/api/ventas',
      usuario_id: 1,
    })
    expect(call.create.status_code).toBe(201)
  })

  it('no lanza error si upsert falla', async () => {
    mockUpsert.mockRejectedValue(new Error('DB error'))

    // No debe lanzar
    await expect(
      saveIdempotencyResponse({
        key: 'fail-key',
        endpoint: '/api/ventas',
        userId: 1,
        statusCode: 201,
        responseBody: {},
      })
    ).resolves.toBeUndefined()
  })
})
