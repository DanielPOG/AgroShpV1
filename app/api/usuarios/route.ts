import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { ZodError } from 'zod'
import { createAdminUserSchema } from '@/lib/validations/admin-user.schema'
import { isAdminRole } from '@/lib/security/authorize'
import { checkRateLimit, getClientIpAddress, getEnvNumber } from '@/lib/security/rate-limit'
import { logAudit } from '@/lib/security/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json(
        { error: 'No autorizado para consultar usuarios' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activoParam = searchParams.get('activo')
    const rolIdParam = searchParams.get('rol_id')
    const search = searchParams.get('search')?.trim()

    const where: {
      activo?: boolean
      rol_id?: number
      OR?: Array<{
        nombre?: { contains: string; mode: 'insensitive' }
        apellido?: { contains: string; mode: 'insensitive' }
        email?: { contains: string; mode: 'insensitive' }
      }>
    } = {}

    if (activoParam === 'true' || activoParam === 'false') {
      where.activo = activoParam === 'true'
    }

    if (rolIdParam) {
      const rolId = Number.parseInt(rolIdParam, 10)
      if (!Number.isNaN(rolId)) {
        where.rol_id = rolId
      }
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const usuarios = await prisma.usuarios.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        rol: {
          select: {
            id: true,
            nombre: true,
          },
        },
        created_at: true,
        updated_at: true,
        ultimo_acceso: true,
      },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: usuarios,
    })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json(
        { error: 'No autorizado para crear usuarios' },
        { status: 403 }
      )
    }

    const usersWriteLimit = getEnvNumber('RATE_LIMIT_ADMIN_USERS_WRITE_MAX', 20)
    const usersWriteWindowMs = getEnvNumber('RATE_LIMIT_ADMIN_USERS_WRITE_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(request.headers)
    const limitKey = `admin:usuarios:post:${session.user.id}:${clientIp}`
    const limitResult = await checkRateLimit({
      key: limitKey,
      limit: usersWriteLimit,
      windowMs: usersWriteWindowMs,
    })

    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente nuevamente en unos segundos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(limitResult.retryAfterSeconds),
          },
        }
      )
    }

    const body = await request.json()
    const validated = createAdminUserSchema.parse(body)

    const rol = await prisma.roles.findUnique({
      where: { id: validated.rol_id },
      select: { id: true },
    })

    if (!rol) {
      return NextResponse.json(
        { error: 'El rol seleccionado no existe' },
        { status: 400 }
      )
    }

    const emailExists = await prisma.usuarios.findUnique({
      where: { email: validated.email },
      select: { id: true },
    })

    if (emailExists) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(validated.password, 10)

    const created = await prisma.usuarios.create({
      data: {
        nombre: validated.nombre,
        apellido: validated.apellido,
        email: validated.email,
        password_hash: passwordHash,
        rol_id: validated.rol_id,
        activo: validated.activo,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        rol_id: true,
        created_at: true,
        rol: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    await logAudit({
      tabla: 'usuarios',
      registro_id: created.id,
      accion: 'CREATE',
      usuario_id: Number(session.user.id),
      datos_nuevos: {
        id: created.id,
        nombre: created.nombre,
        apellido: created.apellido,
        email: created.email,
        rol_id: created.rol_id,
        activo: created.activo,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error al crear usuario:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Datos invalidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
