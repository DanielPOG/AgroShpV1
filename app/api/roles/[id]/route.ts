import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { updateRoleSchema } from '@/lib/validations/admin-role.schema'
import { isAdminRole } from '@/lib/security/authorize'
import { canDeleteRole } from '@/lib/security/admin-management'
import { checkRateLimit, getClientIpAddress, getEnvNumber } from '@/lib/security/rate-limit'
import { logAudit } from '@/lib/security/audit'

function parseId(idParam: string): number | null {
  const id = Number.parseInt(idParam, 10)
  return Number.isNaN(id) ? null : id
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id: idParam } = await params
    const id = parseId(idParam)

    if (!id) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const role = await prisma.roles.findUnique({
      where: { id },
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
    })

    if (!role) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: role })
  } catch (error) {
    console.error('Error al obtener rol:', error)
    return NextResponse.json({ error: 'Error al obtener rol' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const limitKey = `admin:roles:put:${session.user.id}:${clientIp}`
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

    const { id: idParam } = await params
    const id = parseId(idParam)

    if (!id) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const validated = updateRoleSchema.parse(body)

    const existingRole = await prisma.roles.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        permisos: true,
      },
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    if (validated.nombre && validated.nombre !== existingRole.nombre) {
      const nameExists = await prisma.roles.findFirst({
        where: {
          nombre: {
            equals: validated.nombre,
            mode: 'insensitive',
          },
          id: { not: id },
        },
        select: { id: true },
      })

      if (nameExists) {
        return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 409 })
      }
    }

    const updatedRole = await prisma.roles.update({
      where: { id },
      data: {
        ...(validated.nombre !== undefined && { nombre: validated.nombre }),
        ...(validated.descripcion !== undefined && { descripcion: validated.descripcion }),
        ...(validated.permisos !== undefined && { permisos: validated.permisos }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        permisos: true,
        updated_at: true,
      },
    })

    await logAudit({
      tabla: 'roles',
      registro_id: id,
      accion: 'UPDATE',
      usuario_id: Number(session.user.id),
      datos_anteriores: existingRole,
      datos_nuevos: updatedRole,
    })

    return NextResponse.json({ success: true, data: updatedRole })
  } catch (error) {
    console.error('Error al actualizar rol:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Error al actualizar rol' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const limitKey = `admin:roles:delete:${session.user.id}:${clientIp}`
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

    const { id: idParam } = await params
    const id = parseId(idParam)

    if (!id) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const role = await prisma.roles.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            usuarios: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    const decision = canDeleteRole(role.nombre, role._count.usuarios)
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.reason }, { status: 400 })
    }

    await prisma.roles.delete({ where: { id } })

    await logAudit({
      tabla: 'roles',
      registro_id: id,
      accion: 'DELETE',
      usuario_id: Number(session.user.id),
      datos_anteriores: role,
    })

    return NextResponse.json({
      success: true,
      message: 'Rol eliminado exitosamente',
    })
  } catch (error) {
    console.error('Error al eliminar rol:', error)
    return NextResponse.json({ error: 'Error al eliminar rol' }, { status: 500 })
  }
}
