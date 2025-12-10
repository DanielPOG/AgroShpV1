import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Obtener todas las cajas con filtros opcionales
 */
export async function getCajas(filters?: {
  activa?: boolean
  tipo?: string
  search?: string
}) {
  const where: Prisma.cajasWhereInput = {}

  if (filters?.activa !== undefined) {
    where.activa = filters.activa
  }

  if (filters?.tipo) {
    where.tipo = filters.tipo
  }

  if (filters?.search) {
    where.OR = [
      { codigo: { contains: filters.search, mode: 'insensitive' } },
      { nombre: { contains: filters.search, mode: 'insensitive' } },
      { ubicacion: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const cajas = await prisma.cajas.findMany({
    where,
    orderBy: [
      { tipo: 'asc' }, // principales primero
      { nombre: 'asc' },
    ],
    include: {
      _count: {
        select: {
          sesiones_caja: true,
        },
      },
    },
  })

  return cajas
}

/**
 * Obtener una caja por ID
 */
export async function getCajaById(id: number) {
  const caja = await prisma.cajas.findUnique({
    where: { id },
    include: {
      sesiones_caja: {
        take: 10,
        orderBy: { fecha_apertura: 'desc' },
        select: {
          id: true,
          codigo_sesion: true,
          fecha_apertura: true,
          fecha_cierre: true,
          estado: true,
          cajero: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
        },
      },
      _count: {
        select: {
          sesiones_caja: true,
        },
      },
    },
  })

  return caja
}

/**
 * Crear una nueva caja
 */
export async function createCaja(data: {
  codigo: string
  nombre: string
  ubicacion: string
  tipo: string
  activa?: boolean
}) {
  // Validar que el código no exista
  const existingCaja = await prisma.cajas.findFirst({
    where: { codigo: data.codigo },
  })

  if (existingCaja) {
    throw new Error(`Ya existe una caja con el código ${data.codigo}`)
  }

  const caja = await prisma.cajas.create({
    data: {
      codigo: data.codigo,
      nombre: data.nombre,
      ubicacion: data.ubicacion,
      tipo: data.tipo,
      activa: data.activa ?? true,
    },
  })

  console.log(`✅ Caja creada: ${caja.nombre} (${caja.codigo})`)

  return caja
}

/**
 * Actualizar una caja existente
 */
export async function updateCaja(
  id: number,
  data: {
    codigo?: string
    nombre?: string
    ubicacion?: string
    tipo?: string
    activa?: boolean
  }
) {
  // Si se actualiza el código, validar que no exista
  if (data.codigo) {
    const existingCaja = await prisma.cajas.findFirst({
      where: {
        codigo: data.codigo,
        NOT: { id },
      },
    })

    if (existingCaja) {
      throw new Error(`Ya existe una caja con el código ${data.codigo}`)
    }
  }

  // No permitir desactivar si hay sesiones abiertas
  if (data.activa === false) {
    const sesionesAbiertas = await prisma.sesiones_caja.count({
      where: {
        caja_id: id,
        estado: 'abierta',
      },
    })

    if (sesionesAbiertas > 0) {
      throw new Error('No se puede desactivar una caja con sesiones abiertas')
    }
  }

  const caja = await prisma.cajas.update({
    where: { id },
    data,
  })

  console.log(`✅ Caja actualizada: ${caja.nombre}`)

  return caja
}

/**
 * Eliminar una caja (soft delete - solo desactivar)
 */
export async function deleteCaja(id: number) {
  // Verificar que no tenga sesiones abiertas
  const sesionesAbiertas = await prisma.sesiones_caja.count({
    where: {
      caja_id: id,
      estado: 'abierta',
    },
  })

  if (sesionesAbiertas > 0) {
    throw new Error('No se puede eliminar una caja con sesiones abiertas')
  }

  // Solo desactivar
  const caja = await prisma.cajas.update({
    where: { id },
    data: { activa: false },
  })

  console.log(`❌ Caja desactivada: ${caja.nombre}`)

  return caja
}

/**
 * Verificar si una caja está en uso
 */
export async function isCajaEnUso(id: number): Promise<boolean> {
  const count = await prisma.sesiones_caja.count({
    where: {
      caja_id: id,
      estado: 'abierta',
    },
  })

  return count > 0
}
