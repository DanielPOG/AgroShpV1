import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { ZodError } from 'zod'
import { updateAdminUserSchema } from '@/lib/validations/admin-user.schema'
import { isAdminRole } from '@/lib/security/authorize'
import { canDeactivateUser } from '@/lib/security/admin-management'
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

    const usuario = await prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        rol_id: true,
        created_at: true,
        updated_at: true,
        ultimo_acceso: true,
        rol: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: usuario })
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 })
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

    const usersWriteLimit = getEnvNumber('RATE_LIMIT_ADMIN_USERS_WRITE_MAX', 20)
    const usersWriteWindowMs = getEnvNumber('RATE_LIMIT_ADMIN_USERS_WRITE_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(request.headers)
    const limitKey = `admin:usuarios:put:${session.user.id}:${clientIp}`
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

    const { id: idParam } = await params
    const id = parseId(idParam)

    if (!id) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const validated = updateAdminUserSchema.parse(body)

    const actorId = Number(session.user.id)

    if (validated.activo === false && !canDeactivateUser(actorId, id)) {
      return NextResponse.json(
        { error: 'No puedes deshabilitar tu propio usuario' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        rol_id: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (validated.email) {
      const emailExists = await prisma.usuarios.findFirst({
        where: {
          email: validated.email,
          id: { not: id },
        },
        select: { id: true },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Ya existe un usuario con ese email' },
          { status: 409 }
        )
      }
    }

    if (validated.rol_id) {
      const roleExists = await prisma.roles.findUnique({
        where: { id: validated.rol_id },
        select: { id: true },
      })

      if (!roleExists) {
        return NextResponse.json(
          { error: 'El rol seleccionado no existe' },
          { status: 400 }
        )
      }
    }

    const password_hash = validated.password
      ? await bcrypt.hash(validated.password, 10)
      : undefined

    const updated = await prisma.usuarios.update({
      where: { id },
      data: {
        ...(validated.nombre !== undefined && { nombre: validated.nombre }),
        ...(validated.apellido !== undefined && { apellido: validated.apellido }),
        ...(validated.email !== undefined && { email: validated.email }),
        ...(validated.rol_id !== undefined && { rol_id: validated.rol_id }),
        ...(validated.activo !== undefined && { activo: validated.activo }),
        ...(password_hash && { password_hash }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        rol_id: true,
        updated_at: true,
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
      registro_id: updated.id,
      accion: 'UPDATE',
      usuario_id: actorId,
      datos_anteriores: existingUser,
      datos_nuevos: {
        ...updated,
        password_actualizada: Boolean(password_hash),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error al actualizar usuario:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
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

    const usersWriteLimit = getEnvNumber('RATE_LIMIT_ADMIN_USERS_WRITE_MAX', 20)
    const usersWriteWindowMs = getEnvNumber('RATE_LIMIT_ADMIN_USERS_WRITE_WINDOW_MS', 60_000)
    const clientIp = getClientIpAddress(request.headers)
    const limitKey = `admin:usuarios:delete:${session.user.id}:${clientIp}`
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

    const { id: idParam } = await params
    const id = parseId(idParam)

    if (!id) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const actorId = Number(session.user.id)
    if (!canDeactivateUser(actorId, id)) {
      return NextResponse.json(
        { error: 'No puedes deshabilitar tu propio usuario' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (!existingUser.activo) {
      return NextResponse.json({
        success: true,
        data: existingUser,
        message: 'El usuario ya estaba deshabilitado',
      })
    }

    const deactivatedUser = await prisma.usuarios.update({
      where: { id },
      data: {
        activo: false,
        updated_at: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        rol_id: true,
      },
    })

    await logAudit({
      tabla: 'usuarios',
      registro_id: id,
      accion: 'UPDATE',
      usuario_id: actorId,
      datos_anteriores: existingUser,
      datos_nuevos: deactivatedUser,
    })

    return NextResponse.json({
      success: true,
      data: deactivatedUser,
      message: 'Usuario deshabilitado exitosamente',
    })
  } catch (error) {
    console.error('Error al deshabilitar usuario:', error)
    return NextResponse.json({ error: 'Error al deshabilitar usuario' }, { status: 500 })
  }
}
