import { z } from 'zod'

/**
 * Schemas comunes para paginación, filtros y búsqueda
 * Usados en todas las APIs para mantener consistencia
 */

// =====================================================
// PAGINACIÓN
// =====================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type PaginationParams = z.infer<typeof paginationSchema>

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// =====================================================
// BÚSQUEDA Y FILTROS
// =====================================================

export const searchSchema = z.object({
  search: z.string().trim().optional(),
})

export const dateRangeSchema = z.object({
  fecha_inicio: z.coerce.date().optional(),
  fecha_fin: z.coerce.date().optional(),
})

// =====================================================
// ORDENAMIENTO
// =====================================================

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// =====================================================
// ID PARAMETER
// =====================================================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type IdParam = z.infer<typeof idParamSchema>

// =====================================================
// RESPUESTAS API
// =====================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Crea metadata de paginación
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Valida y sanitiza parámetros de búsqueda
 */
export function sanitizeSearchParams(params: URLSearchParams) {
  return {
    search: params.get('search')?.trim() || undefined,
    page: parseInt(params.get('page') || '1'),
    limit: Math.min(parseInt(params.get('limit') || '20'), 100),
  }
}
