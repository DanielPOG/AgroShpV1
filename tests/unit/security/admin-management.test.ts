import { describe, it, expect } from 'vitest'
import { canDeactivateUser, canDeleteRole, isProtectedRoleName } from '@/lib/security/admin-management'

describe('canDeactivateUser', () => {
  it('permite deshabilitar a otro usuario', () => {
    expect(canDeactivateUser(1, 2)).toBe(true)
  })

  it('bloquea deshabilitarse a si mismo', () => {
    expect(canDeactivateUser(3, 3)).toBe(false)
  })
})

describe('isProtectedRoleName', () => {
  it('marca Admin como protegido', () => {
    expect(isProtectedRoleName('Admin')).toBe(true)
  })

  it('no marca rol personalizado', () => {
    expect(isProtectedRoleName('Gestor Turnos')).toBe(false)
  })
})

describe('canDeleteRole', () => {
  it('bloquea eliminar rol con usuarios asignados', () => {
    const result = canDeleteRole('Operador', 1)
    expect(result.allowed).toBe(false)
  })

  it('bloquea eliminar rol base', () => {
    const result = canDeleteRole('Cajero', 0)
    expect(result.allowed).toBe(false)
  })

  it('permite eliminar rol personalizado sin usuarios', () => {
    const result = canDeleteRole('Gestor Turnos', 0)
    expect(result.allowed).toBe(true)
  })
})
