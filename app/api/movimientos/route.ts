/**
 * @fileoverview API para gestión de movimientos entre unidades productivas
 * @description Endpoints para crear, listar y consultar movimientos
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import {
  crearMovimiento,
  getMovimientos,
  getEstadisticasMovimientos
} from '@/lib/db/movimientos'
import {
  crearMovimientoSchema,
  filtrosMovimientosSchema
} from '@/lib/validations/movimientos.schema'
import { ZodError } from 'zod'

/**
 * GET /api/movimientos
 * Obtener lista de movimientos con filtros opcionales
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Extraer parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams
    const queryParams: any = {}

    if (searchParams.get('page')) queryParams.page = searchParams.get('page')
    if (searchParams.get('limit')) queryParams.limit = searchParams.get('limit')
    if (searchParams.get('unidad_origen_id')) queryParams.unidad_origen_id = searchParams.get('unidad_origen_id')
    if (searchParams.get('unidad_destino_id')) queryParams.unidad_destino_id = searchParams.get('unidad_destino_id')
    if (searchParams.get('estado')) queryParams.estado = searchParams.get('estado')
    if (searchParams.get('fecha_desde')) queryParams.fecha_desde = searchParams.get('fecha_desde')
    if (searchParams.get('fecha_hasta')) queryParams.fecha_hasta = searchParams.get('fecha_hasta')

    // Validar parámetros
    const filtros = filtrosMovimientosSchema.parse(queryParams)

    // Obtener movimientos
    const resultado = await getMovimientos({
      page: filtros.page,
      limit: filtros.limit,
      unidad_origen_id: filtros.unidad_origen_id,
      unidad_destino_id: filtros.unidad_destino_id,
      estado: filtros.estado,
      fecha_desde: filtros.fecha_desde,
      fecha_hasta: filtros.fecha_hasta
    })

    return NextResponse.json({
      success: true,
      data: resultado.movimientos,
      pagination: {
        page: resultado.page,
        limit: resultado.limit,
        total: resultado.total,
        totalPages: resultado.totalPages
      }
    })

  } catch (error) {
    console.error('❌ Error en GET /api/movimientos:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Error al obtener movimientos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/movimientos
 * Crear un nuevo movimiento entre unidades productivas
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Buscar usuario completo con rol de BD
    const usuario = await prisma.usuarios.findUnique({
      where: { email: session.user.email! },
      include: {
        rol: true
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos desde rol (permisos es un JSON)
    const permisos = usuario.rol?.permisos as any || {}
    const tienePermiso = permisos.movimientos === true || permisos.all === true
    
    console.log('👤 Usuario:', usuario.email, 'Rol:', usuario.rol?.nombre, 'Permisos movimientos:', permisos.movimientos, 'All:', permisos.all)

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear movimientos' },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()

    // Agregar usuario_id de la sesión
    body.usuario_id = usuario.id

    // Validar datos
    const datosValidados = crearMovimientoSchema.parse(body)

    // Crear movimiento
    const movimiento = await crearMovimiento({
      unidad_origen_id: datosValidados.unidad_origen_id,
      unidad_destino_id: datosValidados.unidad_destino_id,
      usuario_id: usuario.id,
      motivo: datosValidados.motivo,
      observaciones: datosValidados.observaciones,
      detalles: datosValidados.detalles
    })

    console.log('✅ Movimiento creado:', movimiento?.codigo_movimiento || 'N/A')

    return NextResponse.json({
      success: true,
      message: 'Movimiento registrado exitosamente',
      data: movimiento
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error en POST /api/movimientos:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    // Errores de negocio (validaciones de lotes, stock, etc.)
    if (error instanceof Error) {
      // Si el mensaje contiene palabras clave de validación de negocio
      if (
        error.message.includes('insuficiente') ||
        error.message.includes('no existe') ||
        error.message.includes('inactiva') ||
        error.message.includes('no pertenece') ||
        error.message.includes('no está disponible') ||
        error.message.includes('no pueden ser la misma')
      ) {
        return NextResponse.json(
          {
            error: 'Error de validación',
            details: error.message
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Error al crear movimiento',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
