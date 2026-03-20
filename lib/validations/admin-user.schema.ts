import { z } from 'zod'

const passwordSchema = z
  .string({ required_error: 'La contrasena es requerida' })
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(100, 'La contrasena no puede exceder 100 caracteres')

export const createAdminUserSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  apellido: z
    .string({ required_error: 'El apellido es requerido' })
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .trim(),
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Email invalido')
    .max(150, 'El email no puede exceder 150 caracteres')
    .trim()
    .toLowerCase(),
  password: passwordSchema,
  rol_id: z
    .number({ invalid_type_error: 'El rol_id debe ser numerico' })
    .int('El rol_id debe ser entero')
    .positive('El rol_id debe ser positivo'),
  activo: z.boolean().optional().default(true),
})

export const updateAdminUserSchema = z
  .object({
    nombre: z.string().min(2).max(100).trim().optional(),
    apellido: z.string().min(2).max(100).trim().optional(),
    email: z.string().email('Email invalido').max(150).trim().toLowerCase().optional(),
    password: passwordSchema.optional(),
    rol_id: z.number().int().positive().optional(),
    activo: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  })

export type CreateAdminUserData = z.infer<typeof createAdminUserSchema>
export type UpdateAdminUserData = z.infer<typeof updateAdminUserSchema>
