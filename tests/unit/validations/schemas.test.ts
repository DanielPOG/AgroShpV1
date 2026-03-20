import { describe, it, expect } from 'vitest'
import { createSaleSchema, saleItemSchema, paymentMethodSchema } from '@/lib/validations/sale.schema'
import { retiroCajaSchema, autorizarRetiroSchema } from '@/lib/validations/retiro-caja.schema'

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES ZOD — ESQUEMAS DE VENTA
// ═══════════════════════════════════════════════════════════════

describe('saleItemSchema', () => {
  it('acepta item válido', () => {
    const result = saleItemSchema.safeParse({
      producto_id: 1,
      cantidad: 2,
      precio_unitario: 10000,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza producto_id = 0', () => {
    const result = saleItemSchema.safeParse({
      producto_id: 0,
      cantidad: 1,
      precio_unitario: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza cantidad negativa', () => {
    const result = saleItemSchema.safeParse({
      producto_id: 1,
      cantidad: -1,
      precio_unitario: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza precio_unitario = 0', () => {
    const result = saleItemSchema.safeParse({
      producto_id: 1,
      cantidad: 1,
      precio_unitario: 0,
    })
    expect(result.success).toBe(false)
  })

  it('acepta producto_id negativo (producto ficticio)', () => {
    const result = saleItemSchema.safeParse({
      producto_id: -1,
      cantidad: 1,
      precio_unitario: 5000,
    })
    expect(result.success).toBe(true)
  })

  it('acepta descuento_porcentaje entre 0 y 100', () => {
    const result = saleItemSchema.safeParse({
      producto_id: 1,
      cantidad: 1,
      precio_unitario: 1000,
      descuento_porcentaje: 50,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza descuento_porcentaje > 100', () => {
    const result = saleItemSchema.safeParse({
      producto_id: 1,
      cantidad: 1,
      precio_unitario: 1000,
      descuento_porcentaje: 150,
    })
    expect(result.success).toBe(false)
  })
})

describe('paymentMethodSchema', () => {
  it('acepta pago válido', () => {
    const result = paymentMethodSchema.safeParse({
      metodo_pago_id: 1,
      monto: 50000,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza monto 0', () => {
    const result = paymentMethodSchema.safeParse({
      metodo_pago_id: 1,
      monto: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza monto negativo', () => {
    const result = paymentMethodSchema.safeParse({
      metodo_pago_id: 1,
      monto: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza metodo_pago_id = 0', () => {
    const result = paymentMethodSchema.safeParse({
      metodo_pago_id: 0,
      monto: 1000,
    })
    expect(result.success).toBe(false)
  })

  it('acepta referencia opcional', () => {
    const result = paymentMethodSchema.safeParse({
      metodo_pago_id: 2,
      monto: 30000,
      referencia: 'TXN-12345',
    })
    expect(result.success).toBe(true)
  })
})

describe('createSaleSchema', () => {
  const validSale = {
    items: [{ producto_id: 1, cantidad: 2, precio_unitario: 25000 }],
    pagos: [{ metodo_pago_id: 1, monto: 50000 }],
  }

  it('acepta venta mínima válida', () => {
    const result = createSaleSchema.safeParse(validSale)
    expect(result.success).toBe(true)
  })

  it('rechaza venta sin items', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      items: [],
    })
    expect(result.success).toBe(false)
  })

  it('rechaza venta sin pagos', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      pagos: [],
    })
    expect(result.success).toBe(false)
  })

  it('acepta pago mixto (múltiples pagos)', () => {
    const result = createSaleSchema.safeParse({
      items: [{ producto_id: 1, cantidad: 1, precio_unitario: 100000 }],
      pagos: [
        { metodo_pago_id: 1, monto: 60000 },
        { metodo_pago_id: 2, monto: 40000 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('acepta campos opcionales de cliente', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      cliente_nombre: 'Juan Pérez',
      cliente_email: 'juan@test.com',
      cliente_telefono: '3001234567',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      cliente_email: 'no-es-email',
    })
    expect(result.success).toBe(false)
  })

  it('acepta descuento_global', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      descuento_global: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza descuento_global > 100', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      descuento_global: 150,
    })
    expect(result.success).toBe(false)
  })

  it('observaciones max 500 caracteres', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      observaciones: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES ZOD — ESQUEMA RETIRO CAJA
// ═══════════════════════════════════════════════════════════════

describe('retiroCajaSchema', () => {
  const validRetiro = {
    sesion_caja_id: 1,
    monto: 100000,
    motivo: 'Pago a proveedor de insumos',
    solicitado_por: 5,
  }

  it('acepta retiro válido', () => {
    const result = retiroCajaSchema.safeParse(validRetiro)
    expect(result.success).toBe(true)
  })

  it('rechaza monto 0', () => {
    const result = retiroCajaSchema.safeParse({
      ...validRetiro,
      monto: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza monto negativo', () => {
    const result = retiroCajaSchema.safeParse({
      ...validRetiro,
      monto: -50000,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza monto > 50 millones', () => {
    const result = retiroCajaSchema.safeParse({
      ...validRetiro,
      monto: 50000001,
    })
    expect(result.success).toBe(false)
  })

  it('acepta monto = 50 millones (límite)', () => {
    const result = retiroCajaSchema.safeParse({
      ...validRetiro,
      monto: 50000000,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza motivo < 10 caracteres', () => {
    const result = retiroCajaSchema.safeParse({
      ...validRetiro,
      motivo: 'Corto',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza motivo > 200 caracteres', () => {
    const result = retiroCajaSchema.safeParse({
      ...validRetiro,
      motivo: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('requiere sesion_caja_id', () => {
    const { sesion_caja_id, ...sinSesion } = validRetiro
    const result = retiroCajaSchema.safeParse(sinSesion)
    expect(result.success).toBe(false)
  })

  it('requiere solicitado_por', () => {
    const { solicitado_por, ...sinUsuario } = validRetiro
    const result = retiroCajaSchema.safeParse(sinUsuario)
    expect(result.success).toBe(false)
  })
})

describe('autorizarRetiroSchema', () => {
  it('acepta autorización válida', () => {
    const result = autorizarRetiroSchema.safeParse({
      retiro_id: 1,
      autorizado_por: 2,
      estado: 'autorizado',
    })
    expect(result.success).toBe(true)
  })

  it('acepta rechazo válido', () => {
    const result = autorizarRetiroSchema.safeParse({
      retiro_id: 1,
      autorizado_por: 2,
      estado: 'rechazado',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza estado inválido', () => {
    const result = autorizarRetiroSchema.safeParse({
      retiro_id: 1,
      autorizado_por: 2,
      estado: 'completado', // solo autorizado/rechazado permitidos
    })
    expect(result.success).toBe(false)
  })
})
