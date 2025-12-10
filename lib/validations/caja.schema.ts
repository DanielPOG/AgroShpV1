import { z } from 'zod'

export const cajaSchema = z.object({
  codigo: z.string().min(3, 'El código debe tener al menos 3 caracteres').max(50),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  ubicacion: z.string().min(2, 'La ubicación debe tener al menos 2 caracteres').max(150),
  tipo: z.enum(['principal', 'secundaria', 'movil'], {
    errorMap: () => ({ message: 'Tipo de caja inválido' }),
  }),
  activa: z.boolean().default(true),
})

export const updateCajaSchema = cajaSchema.partial()

export type CajaFormData = z.infer<typeof cajaSchema>
export type UpdateCajaData = z.infer<typeof updateCajaSchema>
