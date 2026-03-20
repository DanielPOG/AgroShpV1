import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  isAdmin,
  canUsePOS,
  canManageInventory,
  canViewReports,
  getRoleLabel,
  getRoleDescription,
  userHasPermission,
} from '@/lib/auth'
import type { UserRole } from '@/lib/auth'

// ─── hasPermission ────────────────────────────────────────────

describe('hasPermission', () => {
  it('Admin tiene permiso "all"', () => {
    expect(hasPermission('Admin', 'all')).toBe(true)
  })

  it('Admin tiene permiso de inventario', () => {
    expect(hasPermission('Admin', 'inventario')).toBe(true)
  })

  it('Admin tiene permiso de pos', () => {
    expect(hasPermission('Admin', 'pos')).toBe(true)
  })

  it('Cajero tiene permiso de pos', () => {
    expect(hasPermission('Cajero', 'pos')).toBe(true)
  })

  it('Cajero NO tiene permiso de inventario', () => {
    expect(hasPermission('Cajero', 'inventario')).toBe(false)
  })

  it('Cajero tiene permiso de ventas', () => {
    expect(hasPermission('Cajero', 'ventas')).toBe(true)
  })

  it('Inventarista tiene permiso de inventario', () => {
    expect(hasPermission('Inventarista', 'inventario')).toBe(true)
  })

  it('Inventarista NO tiene permiso de pos', () => {
    expect(hasPermission('Inventarista', 'pos')).toBe(false)
  })

  it('Inventarista tiene permiso de movimientos', () => {
    expect(hasPermission('Inventarista', 'movimientos')).toBe(true)
  })

  it('Consulta tiene permiso de reportes', () => {
    expect(hasPermission('Consulta', 'reportes')).toBe(true)
  })

  it('Consulta NO tiene permiso de pos', () => {
    expect(hasPermission('Consulta', 'pos')).toBe(false)
  })

  it('Consulta NO tiene permiso de usuarios', () => {
    expect(hasPermission('Consulta', 'usuarios')).toBe(false)
  })

  it('retorna false con rol no existente', () => {
    expect(hasPermission('RolFalso' as UserRole, 'dashboard')).toBe(false)
  })

  it('retorna false con permiso no existente', () => {
    expect(hasPermission('Cajero', 'permiso_ficticio')).toBe(false)
  })
})

// ─── isAdmin ──────────────────────────────────────────────────

describe('isAdmin', () => {
  it('reconoce sesión Admin', () => {
    expect(isAdmin({ user: { role: 'Admin' } })).toBe(true)
  })

  it('rechaza sesión Cajero', () => {
    expect(isAdmin({ user: { role: 'Cajero' } })).toBe(false)
  })

  it('rechaza sesión null', () => {
    expect(isAdmin(null)).toBe(false)
  })
})

// ─── canUsePOS ────────────────────────────────────────────────

describe('canUsePOS', () => {
  it('Admin puede usar POS', () => {
    expect(canUsePOS({ user: { role: 'Admin' } })).toBe(true)
  })

  it('Cajero puede usar POS', () => {
    expect(canUsePOS({ user: { role: 'Cajero' } })).toBe(true)
  })

  it('Inventarista NO puede usar POS', () => {
    expect(canUsePOS({ user: { role: 'Inventarista' } })).toBe(false)
  })

  it('Consulta NO puede usar POS', () => {
    expect(canUsePOS({ user: { role: 'Consulta' } })).toBe(false)
  })

  it('Sesión null no puede usar POS', () => {
    expect(canUsePOS(null)).toBe(false)
  })
})

// ─── canManageInventory ───────────────────────────────────────

describe('canManageInventory', () => {
  it('Admin puede gestionar inventario', () => {
    expect(canManageInventory({ user: { role: 'Admin' } })).toBe(true)
  })

  it('Inventarista puede gestionar inventario', () => {
    expect(canManageInventory({ user: { role: 'Inventarista' } })).toBe(true)
  })

  it('Cajero NO puede gestionar inventario', () => {
    expect(canManageInventory({ user: { role: 'Cajero' } })).toBe(false)
  })

  it('sesión null no puede gestionar inventario', () => {
    expect(canManageInventory(null)).toBe(false)
  })
})

// ─── canViewReports ───────────────────────────────────────────

describe('canViewReports', () => {
  it('Admin puede ver reportes', () => {
    expect(canViewReports({ user: { role: 'Admin' } })).toBe(true)
  })

  it('Consulta puede ver reportes', () => {
    expect(canViewReports({ user: { role: 'Consulta' } })).toBe(true)
  })

  it('Inventarista puede ver reportes', () => {
    expect(canViewReports({ user: { role: 'Inventarista' } })).toBe(true)
  })

  it('Cajero NO puede ver reportes', () => {
    expect(canViewReports({ user: { role: 'Cajero' } })).toBe(false)
  })

  it('sesión null retorna false', () => {
    expect(canViewReports(null)).toBe(false)
  })
})

// ─── userHasPermission ────────────────────────────────────────

describe('userHasPermission', () => {
  it('verifica permiso con sesión válida', () => {
    expect(userHasPermission({ user: { role: 'Admin' } }, 'pos')).toBe(true)
  })

  it('retorna false con sesión null', () => {
    expect(userHasPermission(null, 'pos')).toBe(false)
  })

  it('retorna false sin role', () => {
    expect(userHasPermission({ user: { role: '' } }, 'pos')).toBe(false)
  })
})

// ─── getRoleLabel ─────────────────────────────────────────────

describe('getRoleLabel', () => {
  it('Admin → Administrador', () => {
    expect(getRoleLabel('Admin')).toBe('Administrador')
  })

  it('Cajero → Cajero', () => {
    expect(getRoleLabel('Cajero')).toBe('Cajero')
  })
})

// ─── getRoleDescription ───────────────────────────────────────

describe('getRoleDescription', () => {
  it('Admin tiene descripción', () => {
    expect(getRoleDescription('Admin')).toBe('Acceso total al sistema')
  })

  it('Cajero tiene descripción', () => {
    expect(getRoleDescription('Cajero')).toBe('Punto de venta y operaciones')
  })
})
