import { z } from 'zod'

/**
 * Schemas de validación para Unidades Productivas
 * 
 * Mapea la tabla: unidades_productivas
 * Campos: id, codigo, nombre, descripcion, tipo, responsable_id, ubicacion, activa, created_at, updated_at
 */

// =====================================================
// CREAR/ACTUALIZAR UNIDAD PRODUCTIVA
// =====================================================

export const unitSchema = z.object({
  codigo: z
    .string({ required_error: 'El código es requerido' })
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(20, 'El código no puede exceder 20 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'El código solo puede contener letras mayúsculas, números y guiones')
    .trim(),
  
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  
  descripcion: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  tipo: z
    .string()
    .max(50, 'El tipo no puede exceder 50 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  responsable_id: z
    .number({ invalid_type_error: 'El responsable debe ser un número' })
    .int()
    .positive('El responsable debe ser un ID válido')
    .optional()
    .nullable(),
  
  ubicacion: z
    .string()
    .max(200, 'La ubicación no puede exceder 200 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  activa: z
    .boolean()
    .default(true),
})

export const createUnitSchema = unitSchema

export const updateUnitSchema = unitSchema.partial().extend({
  // El código no se debe poder cambiar después de crear
  codigo: z.string().optional(),
})

// =====================================================
// FILTROS DE UNIDADES
// =====================================================

export const unitFiltersSchema = z.object({
  search: z.string().trim().optional(),
  tipo: z.string().trim().optional(),
  activa: z.coerce.boolean().optional(),
  responsable_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// =====================================================
// TYPES
// =====================================================

export type UnitFormData = z.infer<typeof unitSchema>
export type CreateUnitData = z.infer<typeof createUnitSchema>
export type UpdateUnitData = z.infer<typeof updateUnitSchema>
export type UnitFilters = z.infer<typeof unitFiltersSchema>

// =====================================================
// UNIDADES PREDEFINIDAS (para seed o referencia)
// =====================================================

export const DEFAULT_UNITS = [
  { 
    codigo: 'UP-HUERTA', 
    nombre: 'Huerta Orgánica', 
    descripcion: 'Producción de hortalizas y vegetales orgánicos',
    tipo: 'Agrícola',
    ubicacion: 'Lote A - Zona Norte'
  },
  { 
    codigo: 'UP-BOVINOS', 
    nombre: 'Granja Bovina', 
    descripcion: 'Producción de leche y derivados lácteos',
    tipo: 'Pecuaria',
    ubicacion: 'Establo Principal'
  },
  { 
    codigo: 'UP-AVICOLA', 
    nombre: 'Granja Avícola', 
    descripcion: 'Producción de huevos y carne de pollo',
    tipo: 'Pecuaria',
    ubicacion: 'Galpón B'
  },
  { 
    codigo: 'UP-PORCINOS', 
    nombre: 'Granja Porcina', 
    descripcion: 'Cría y producción porcina',
    tipo: 'Pecuaria',
    ubicacion: 'Porqueriza Central'
  },
  { 
    codigo: 'UP-PANADERIA', 
    nombre: 'Panadería SENA', 
    descripcion: 'Elaboración de pan y productos de panadería',
    tipo: 'Transformación',
    ubicacion: 'Planta de Alimentos'
  },
  { 
    codigo: 'UP-LACTEOS', 
    nombre: 'Planta de Lácteos', 
    descripcion: 'Procesamiento de leche, quesos y derivados',
    tipo: 'Transformación',
    ubicacion: 'Planta de Procesamiento'
  },
] as const
