import { z } from 'zod'

export const rolePermissionsSchema = z.record(z.boolean()).default({})

export const createRoleSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del rol es requerido' })
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  descripcion: z
    .string()
    .max(255, 'La descripcion no puede exceder 255 caracteres')
    .trim()
    .optional()
    .nullable(),
  permisos: rolePermissionsSchema.optional(),
})

export const updateRoleSchema = createRoleSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'Debe enviar al menos un campo para actualizar',
  }
)

export type CreateRoleData = z.infer<typeof createRoleSchema>
export type UpdateRoleData = z.infer<typeof updateRoleSchema>
