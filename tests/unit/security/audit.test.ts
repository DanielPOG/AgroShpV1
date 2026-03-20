import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  summarizeSale,
  summarizeMovimiento,
  summarizeRetiro,
  summarizeTurno,
  logAudit,
} from '@/lib/security/audit'

// Mock de Prisma
const mockCreate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditoria: {
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}))

// Mock de next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ['x-forwarded-for', '127.0.0.1'],
      ['user-agent', 'test-agent'],
    ])
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── summarizeSale ────────────────────────────────────────────

describe('summarizeSale', () => {
  it('genera resumen con todos los campos', () => {
    const result = summarizeSale({
      id: 1,
      codigo_venta: 'VTA-001',
      total: 50000,
      estado: 'completada',
      detalle_ventas: [
        { cantidad: 2, precio_unitario: 10000, producto_id: 1 },
        { cantidad: 1, precio_unitario: 30000, producto_id: 2 },
      ],
      pagos_venta: [
        { monto: 50000, metodo_pago_id: 1 },
      ],
    })

    expect(result).toEqual({
      id: 1,
      codigo_venta: 'VTA-001',
      total: 50000,
      estado: 'completada',
      items: 2,
      pagos: 1,
    })
  })

  it('maneja campos opcionales ausentes', () => {
    const result = summarizeSale({ id: 5 })

    expect(result.id).toBe(5)
    expect(result.items).toBe(0)
    expect(result.pagos).toBe(0)
    expect(result.codigo_venta).toBeUndefined()
  })
})

// ─── summarizeMovimiento ──────────────────────────────────────

describe('summarizeMovimiento', () => {
  it('genera resumen completo', () => {
    const result = summarizeMovimiento({
      id: 10,
      tipo_movimiento: 'ingreso',
      monto: 25000,
      metodo_pago: 'Efectivo',
      descripcion: 'Venta #123',
    })

    expect(result).toEqual({
      id: 10,
      tipo_movimiento: 'ingreso',
      monto: 25000,
      metodo_pago: 'Efectivo',
      descripcion: 'Venta #123',
    })
  })

  it('maneja campos nulos', () => {
    const result = summarizeMovimiento({
      id: 11,
      tipo_movimiento: null,
      monto: undefined,
      metodo_pago: null,
      descripcion: null,
    })

    expect(result.id).toBe(11)
    expect(result.tipo_movimiento).toBeNull()
  })
})

// ─── summarizeRetiro ──────────────────────────────────────────

describe('summarizeRetiro', () => {
  it('genera resumen de retiro', () => {
    const result = summarizeRetiro({
      id: 20,
      monto: 100000,
      motivo: 'Pago proveedor',
      estado: 'pendiente',
      destino_fondos: 'Banco',
    })

    expect(result).toEqual({
      id: 20,
      monto: 100000,
      motivo: 'Pago proveedor',
      estado: 'pendiente',
      destino_fondos: 'Banco',
    })
  })
})

// ─── summarizeTurno ───────────────────────────────────────────

describe('summarizeTurno', () => {
  it('genera resumen de turno', () => {
    const result = summarizeTurno({
      id: 30,
      cajero_id: 5,
      sesion_caja_id: 100,
      efectivo_inicial: 200000,
      tipo_relevo: 'normal',
    })

    expect(result).toEqual({
      id: 30,
      cajero_id: 5,
      sesion_caja_id: 100,
      efectivo_inicial: 200000,
      tipo_relevo: 'normal',
    })
  })

  it('maneja campos opcionales null', () => {
    const result = summarizeTurno({
      id: 31,
      cajero_id: null,
      sesion_caja_id: null,
    })

    expect(result.id).toBe(31)
    expect(result.cajero_id).toBeNull()
  })
})

// ─── logAudit ─────────────────────────────────────────────────

describe('logAudit', () => {
  it('crea registro de auditoría en Prisma', async () => {
    mockCreate.mockResolvedValue({ id: 1 })

    await logAudit({
      tabla: 'ventas',
      registro_id: 42,
      accion: 'CREATE',
      usuario_id: 1,
      datos_nuevos: { total: 50000 },
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const data = mockCreate.mock.calls[0][0].data
    expect(data.tabla).toBe('ventas')
    expect(data.registro_id).toBe(42)
    expect(data.accion).toBe('CREATE')
    expect(data.usuario_id).toBe(1)
  })

  it('nunca lanza error aunque Prisma falle', async () => {
    mockCreate.mockRejectedValue(new Error('DB down'))

    // No debe lanzar
    await expect(
      logAudit({
        tabla: 'ventas',
        registro_id: 1,
        accion: 'CREATE',
        usuario_id: 1,
      })
    ).resolves.toBeUndefined()
  })
})
