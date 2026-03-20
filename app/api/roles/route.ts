import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { createRoleSchema } from '@/lib/validations/admin-role.schema'
import { isAdminRole } from '@/lib/security/authorize'
import { checkRateLimit, getClientIpAddress, getEnvNumber } from '@/lib/security/rate-limit'
import { logAudit } from '@/lib/security/audit'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const roles = await prisma.roles.findMany({
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        permisos: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            usuarios: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ success: true, data: roles })
  } catch (error) {
    console.error('Error al obtener roles:', error)
    return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const rolesWriteLimit = getEnvNumber('RATE_LIMIT_ADMIN_ROLES_WRITE_MAX', 15)
    const rolesWriteWindowMs = getEnvNumber('RATE_LIMIT_ADMIN_ROLES_WRITE_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(request.headers)
    const limitKey = `admin:roles:post:${session.user.id}:${clientIp}`
    const limitResult = await checkRateLimit({
      key: limitKey,
      limit: rolesWriteLimit,
      windowMs: rolesWriteWindowMs,
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
    const validated = createRoleSchema.parse(body)

    const existing = await prisma.roles.findFirst({
      where: {
        nombre: {
          equals: validated.nombre,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 409 })
    }

    const createdRole = await prisma.roles.create({
      data: {
        nombre: validated.nombre,
        descripcion: validated.descripcion,
        permisos: validated.permisos ?? {},
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        permisos: true,
        created_at: true,
      },
    })

    await logAudit({
      tabla: 'roles',
      registro_id: createdRole.id,
      accion: 'CREATE',
      usuario_id: Number(session.user.id),
      datos_nuevos: createdRole,
    })

    return NextResponse.json({ success: true, data: createdRole }, { status: 201 })
  } catch (error) {
    console.error('Error al crear rol:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Error al crear rol' }, { status: 500 })
  }
}
