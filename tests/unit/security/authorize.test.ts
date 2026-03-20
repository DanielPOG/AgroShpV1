import { describe, it, expect } from 'vitest'
import {
  normalizeRole,
  isAdminRole,
  isAdminOrSupervisor,
  canAccessFinancialReports,
} from '@/lib/security/authorize'

// ─── normalizeRole ────────────────────────────────────────────

describe('normalizeRole', () => {
  it('devuelve string vacío para null', () => {
    expect(normalizeRole(null)).toBe('')
  })

  it('devuelve string vacío para undefined', () => {
    expect(normalizeRole(undefined)).toBe('')
  })

  it('devuelve string vacío para cadena vacía', () => {
    expect(normalizeRole('')).toBe('')
  })

  it('elimina espacios en blanco', () => {
    expect(normalizeRole('  Admin  ')).toBe('Admin')
  })

  it('preserva el valor original cuando no hay espacios', () => {
    expect(normalizeRole('Cajero')).toBe('Cajero')
  })
})

// ─── isAdminRole ──────────────────────────────────────────────

describe('isAdminRole', () => {
  it('reconoce "Admin" como rol admin', () => {
    expect(isAdminRole('Admin')).toBe(true)
  })

  it('reconoce "Administrador" como rol admin', () => {
    expect(isAdminRole('Administrador')).toBe(true)
  })

  it('rechaza "Cajero" como rol admin', () => {
    expect(isAdminRole('Cajero')).toBe(false)
  })

  it('rechaza "Inventarista" como rol admin', () => {
    expect(isAdminRole('Inventarista')).toBe(false)
  })

  it('rechaza "Supervisor" como rol admin', () => {
    expect(isAdminRole('Supervisor')).toBe(false)
  })

  it('rechaza null', () => {
    expect(isAdminRole(null)).toBe(false)
  })

  it('rechaza undefined', () => {
    expect(isAdminRole(undefined)).toBe(false)
  })

  it('rechaza cadena vacía', () => {
    expect(isAdminRole('')).toBe(false)
  })

  it('rechaza "admin" en minúsculas (case-sensitive)', () => {
    expect(isAdminRole('admin')).toBe(false)
  })

  it('reconoce " Admin " con espacios', () => {
    expect(isAdminRole(' Admin ')).toBe(true)
  })
})

// ─── isAdminOrSupervisor ──────────────────────────────────────

describe('isAdminOrSupervisor', () => {
  it('acepta "Admin"', () => {
    expect(isAdminOrSupervisor('Admin')).toBe(true)
  })

  it('acepta "Administrador"', () => {
    expect(isAdminOrSupervisor('Administrador')).toBe(true)
  })

  it('acepta "Supervisor"', () => {
    expect(isAdminOrSupervisor('Supervisor')).toBe(true)
  })

  it('rechaza "Cajero"', () => {
    expect(isAdminOrSupervisor('Cajero')).toBe(false)
  })

  it('rechaza "Inventarista"', () => {
    expect(isAdminOrSupervisor('Inventarista')).toBe(false)
  })

  it('rechaza "Consulta"', () => {
    expect(isAdminOrSupervisor('Consulta')).toBe(false)
  })

  it('rechaza null', () => {
    expect(isAdminOrSupervisor(null)).toBe(false)
  })

  it('rechaza cadena vacía', () => {
    expect(isAdminOrSupervisor('')).toBe(false)
  })
})

// ─── canAccessFinancialReports ────────────────────────────────

describe('canAccessFinancialReports', () => {
  it('permite acceso a Admin', () => {
    expect(canAccessFinancialReports('Admin')).toBe(true)
  })

  it('permite acceso a Administrador', () => {
    expect(canAccessFinancialReports('Administrador')).toBe(true)
  })

  it('permite acceso a Supervisor', () => {
    expect(canAccessFinancialReports('Supervisor')).toBe(true)
  })

  it('deniega acceso a Cajero', () => {
    expect(canAccessFinancialReports('Cajero')).toBe(false)
  })

  it('deniega acceso a Inventarista', () => {
    expect(canAccessFinancialReports('Inventarista')).toBe(false)
  })

  it('deniega acceso a Consulta', () => {
    expect(canAccessFinancialReports('Consulta')).toBe(false)
  })

  it('deniega acceso con null', () => {
    expect(canAccessFinancialReports(null)).toBe(false)
  })

  it('deniega acceso con undefined', () => {
    expect(canAccessFinancialReports(undefined)).toBe(false)
  })
})
