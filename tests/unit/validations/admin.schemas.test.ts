import { describe, it, expect } from 'vitest'
import { createAdminUserSchema, updateAdminUserSchema } from '@/lib/validations/admin-user.schema'
import { createRoleSchema, updateRoleSchema } from '@/lib/validations/admin-role.schema'

describe('createAdminUserSchema', () => {
  it('acepta un usuario valido', () => {
    const result = createAdminUserSchema.safeParse({
      nombre: 'Ana',
      apellido: 'Lopez',
      email: 'ana@test.com',
      password: 'ClaveSegura123',
      rol_id: 1,
      activo: true,
    })

    expect(result.success).toBe(true)
  })

  it('rechaza password corta', () => {
    const result = createAdminUserSchema.safeParse({
      nombre: 'Ana',
      apellido: 'Lopez',
      email: 'ana@test.com',
      password: '123',
      rol_id: 1,
    })

    expect(result.success).toBe(false)
  })

  it('rechaza rol_id no positivo', () => {
    const result = createAdminUserSchema.safeParse({
      nombre: 'Ana',
      apellido: 'Lopez',
      email: 'ana@test.com',
      password: 'ClaveSegura123',
      rol_id: 0,
    })

    expect(result.success).toBe(false)
  })
})

describe('updateAdminUserSchema', () => {
  it('acepta update parcial', () => {
    const result = updateAdminUserSchema.safeParse({
      nombre: 'NuevoNombre',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza update vacio', () => {
    const result = updateAdminUserSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('createRoleSchema', () => {
  it('acepta rol valido', () => {
    const result = createRoleSchema.safeParse({
      nombre: 'Supervisor Caja',
      descripcion: 'Puede autorizar cierres',
      permisos: {
        dashboard: true,
      },
    })

    expect(result.success).toBe(true)
  })

  it('rechaza nombre corto', () => {
    const result = createRoleSchema.safeParse({
      nombre: 'Ad',
      descripcion: 'Rol invalido',
    })

    expect(result.success).toBe(false)
  })
})

describe('updateRoleSchema', () => {
  it('acepta update parcial', () => {
    const result = updateRoleSchema.safeParse({
      descripcion: 'Nueva descripcion',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza payload vacio', () => {
    const result = updateRoleSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
