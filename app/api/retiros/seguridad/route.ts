import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import {
  crearRetiroSeguridad,
  getRetirosSeguridad,
  getEfectivoDisponibleTurno,
  validarRetiroSeguridad,
} from '@/lib/db/retiros-seguridad'
import { z } from 'zod'

/**
 * Schema de validación para retiro de seguridad
 */
const retiroSeguridadSchema = z.object({
  turno_caja_id: z.number().int().positive(),
  sesion_caja_id: z.number().int().positive(),
  monto: z.number().positive().min(10000, 'Monto mínimo: $10,000').max(1000000, 'Monto máximo: $1,000,000'),
  motivo: z.string().min(10, 'Especifique el motivo (mínimo 10 caracteres)').max(200),
  destino_fondos: z.string().max(200).optional(),
  observaciones: z.string().max(500).optional(),
})

/**
 * GET /api/retiros/seguridad
 * Obtiene retiros de seguridad de un turno o el efectivo disponible
 * 
 * Query params:
 * - turno_id: ID del turno (requerido)
 * - accion: 'historial' | 'disponible' | 'validar'
 * - monto: monto para validar (si accion=validar)
 * 
 * Roles permitidos: Admin, Supervisor, Cajero (solo su turno)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    const userRole = session.user.role
    const userId = Number(session.user.id)

    // Extraer parámetros
    const { searchParams } = new URL(request.url)
    const turnoId = searchParams.get('turno_id')
    const accion = searchParams.get('accion') as 'historial' | 'disponible' | 'validar' || 'historial'
    const monto = searchParams.get('monto')

    if (!turnoId) {
      return NextResponse.json(
        { error: 'Debe especificar turno_id' },
        { status: 400 }
      )
    }

    // Validar permisos: Cajero solo ve su turno
    if (userRole === 'Cajero') {
      const { default: prisma } = await import('@/lib/prisma')
      const turno = await prisma.prisma.turnos_caja.findUnique({
        where: { id: Number(turnoId) },
        select: { cajero_id: true },
      })

      if (turno && turno.cajero_id !== userId) {
        return NextResponse.json(
          { error: 'No tienes permiso para ver retiros de este turno' },
          { status: 403 }
        )
      }
    }

    let data

    switch (accion) {
      case 'historial':
        data = await getRetirosSeguridad(Number(turnoId))
        break

      case 'disponible':
        const efectivo = await getEfectivoDisponibleTurno(Number(turnoId))
        data = { efectivo_disponible: efectivo }
        break

      case 'validar':
        if (!monto) {
          return NextResponse.json(
            { error: 'Debe especificar monto para validar' },
            { status: 400 }
          )
        }
        data = await validarRetiroSeguridad(Number(turnoId), Number(monto))
        break

      default:
        return NextResponse.json(
          { error: 'Acción inválida. Use: historial, disponible o validar' },
          { status: 400 }
        )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error en GET /api/retiros/seguridad:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/retiros/seguridad
 * Crea un retiro de seguridad durante el turno
 * 
 * Body:
 * {
 *   turno_caja_id: number,
 *   sesion_caja_id: number,
 *   monto: number,
 *   motivo: string,
 *   destino_fondos?: string,
 *   observaciones?: string
 * }
 * 
 * Roles permitidos: Admin, Supervisor, Cajero (solo su turno)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      )
    }

    const userRole = session.user.role
    const userId = Number(session.user.id)

    // Parsear body
    const body = await request.json()

    // Validar datos
    const validatedData = retiroSeguridadSchema.parse(body)

    // Validar permisos: Cajero solo puede hacer retiros de su propio turno
    if (userRole === 'Cajero') {
      const { default: prisma } = await import('@/lib/prisma')
      const turno = await prisma.prisma.turnos_caja.findUnique({
        where: { id: validatedData.turno_caja_id },
        select: { cajero_id: true, estado: true },
      })

      if (!turno || turno.cajero_id !== userId) {
        return NextResponse.json(
          { error: 'No tienes permiso para hacer retiros de este turno' },
          { status: 403 }
        )
      }

      if (turno.estado !== 'activo') {
        return NextResponse.json(
          { error: 'Solo puedes hacer retiros de tu turno activo' },
          { status: 400 }
        )
      }
    }

    // Crear retiro
    const retiro = await crearRetiroSeguridad({
      ...validatedData,
      solicitado_por: userId,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Retiro de seguridad registrado exitosamente',
        retiro: {
          id: retiro.id,
          monto: Number(retiro.monto),
          motivo: retiro.motivo,
          estado: retiro.estado,
          fecha: retiro.fecha_solicitud,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/retiros/seguridad:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
