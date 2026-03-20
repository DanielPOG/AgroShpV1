import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

type IdempotencyCheck = {
  key: string | null
  endpoint: string
  userId: number
}

type CachedResponse = {
  hit: true
  response: NextResponse
}

type NoHit = {
  hit: false
}

/**
 * Extrae el header X-Idempotency-Key de un request.
 * Retorna null si no está presente (el endpoint decide si es obligatorio).
 */
export function getIdempotencyKey(headers: Headers): string | null {
  const key = headers.get('x-idempotency-key')?.trim()
  if (!key || key.length === 0) return null
  if (key.length > 255) return null
  return key
}

/**
 * Busca si ya existe una respuesta para esta key.
 * Si la encuentra, retorna la respuesta cacheada.
 */
export async function checkIdempotency(
  input: IdempotencyCheck
): Promise<CachedResponse | NoHit> {
  if (!input.key) return { hit: false }

  try {
    const existing = await prisma.idempotency_keys.findUnique({
      where: {
        idempotency_key_endpoint_usuario_id: {
          idempotency_key: input.key,
          endpoint: input.endpoint,
          usuario_id: input.userId,
        },
      },
    })

    if (!existing) return { hit: false }

    // Expirado → limpiar y tratar como nuevo
    if (existing.expires_at < new Date()) {
      await prisma.idempotency_keys.delete({ where: { id: existing.id } }).catch(() => {})
      return { hit: false }
    }

    // Retornar la respuesta original
    return {
      hit: true,
      response: NextResponse.json(existing.response_body, {
        status: existing.status_code,
        headers: { 'X-Idempotency-Replayed': 'true' },
      }),
    }
  } catch {
    // Si falla la consulta, dejar pasar (no bloquear la operación)
    return { hit: false }
  }
}

/**
 * Guarda la respuesta para futuras consultas con la misma key.
 */
export async function saveIdempotencyResponse(input: {
  key: string
  endpoint: string
  userId: number
  statusCode: number
  responseBody: unknown
}): Promise<void> {
  try {
    await prisma.idempotency_keys.upsert({
      where: {
        idempotency_key_endpoint_usuario_id: {
          idempotency_key: input.key,
          endpoint: input.endpoint,
          usuario_id: input.userId,
        },
      },
      update: {
        status_code: input.statusCode,
        response_body: input.responseBody as object,
        expires_at: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
      create: {
        idempotency_key: input.key,
        endpoint: input.endpoint,
        usuario_id: input.userId,
        status_code: input.statusCode,
        response_body: input.responseBody as object,
        expires_at: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    })
  } catch {
    // No bloquear si falla el guardado
  }
}
