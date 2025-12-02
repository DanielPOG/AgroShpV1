import { z } from 'zod'

/**
 * Schemas de validación para Categorías
 * 
 * Mapea la tabla: categorias
 * Campos: id, nombre, descripcion, icono, color, created_at
 */

// =====================================================
// CREAR/ACTUALIZAR CATEGORÍA
// =====================================================

export const categorySchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  
  descripcion: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  icono: z
    .string()
    .max(50, 'El icono no puede exceder 50 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código hexadecimal válido (#RRGGBB)')
    .optional()
    .nullable(),
})

export const createCategorySchema = categorySchema

export const updateCategorySchema = categorySchema.partial()

// =====================================================
// FILTROS DE CATEGORÍAS
// =====================================================

export const categoryFiltersSchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// =====================================================
// TYPES
// =====================================================

export type CategoryFormData = z.infer<typeof categorySchema>
export type CreateCategoryData = z.infer<typeof createCategorySchema>
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>
export type CategoryFilters = z.infer<typeof categoryFiltersSchema>

// =====================================================
// CATEGORÍAS PREDEFINIDAS (para seed o referencia)
// =====================================================

export const DEFAULT_CATEGORIES = [
  { nombre: 'Hortalizas', icono: '🥬', color: '#059669', descripcion: 'Vegetales y verduras frescas' },
  { nombre: 'Lácteos', icono: '🥛', color: '#3B82F6', descripcion: 'Productos lácteos y derivados' },
  { nombre: 'Panadería', icono: '🍞', color: '#F59E0B', descripcion: 'Pan y productos horneados' },
  { nombre: 'Cárnicos', icono: '🥩', color: '#EF4444', descripcion: 'Carnes y embutidos' },
  { nombre: 'Huevos', icono: '🥚', color: '#FBBF24', descripcion: 'Huevos y productos avícolas' },
  { nombre: 'Frutas', icono: '🍎', color: '#EC4899', descripcion: 'Frutas frescas y procesadas' },
  { nombre: 'Insumos', icono: '📦', color: '#6B7280', descripcion: 'Insumos agrícolas y herramientas' },
  { nombre: 'Otros', icono: '🛒', color: '#8B5CF6', descripcion: 'Otros productos' },
] as const
