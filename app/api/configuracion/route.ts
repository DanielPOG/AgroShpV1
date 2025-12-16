import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { invalidateConfigCache } from "@/lib/config-cache"

/**
 * GET /api/configuracion
 * Obtener la configuración global del sistema
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener configuración desde la tabla de configuración
    const config = await prisma.configuracion.findMany({
      select: {
        clave: true,
        valor: true,
        tipo: true,
      },
    })

    // Convertir array de config a objeto con tipos correctos
    const configuracion: Record<string, any> = {}
    config.forEach((item) => {
      if (item.tipo === "number") {
        configuracion[item.clave] = parseFloat(item.valor)
      } else {
        configuracion[item.clave] = item.valor
      }
    })

    return NextResponse.json(configuracion)
  } catch (error) {
    console.error("Error obteniendo configuración:", error)
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/configuracion
 * Actualizar la configuración global
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo Admin puede modificar configuración
    if (session.user.role !== "Admin") {
      return NextResponse.json(
        { error: "Solo administradores pueden modificar la configuración" },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Actualizar cada campo de configuración
    const updates = Object.entries(body).map(([clave, valor]) => {
      const tipo = typeof valor === "number" ? "number" : "string"
      return prisma.configuracion.upsert({
        where: { clave },
        update: {
          valor: String(valor),
          tipo,
          updated_at: new Date(),
        },
        create: {
          clave,
          valor: String(valor),
          tipo,
          descripcion: getDescripcion(clave),
        },
      })
    })

    await prisma.$transaction(updates)

    // Invalidar caché después de actualizar
    invalidateConfigCache()

    return NextResponse.json({
      message: "Configuración actualizada exitosamente",
    })
  } catch (error) {
    console.error("Error actualizando configuración:", error)
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    )
  }
}

/**
 * Helper para obtener descripciones de las claves de configuración
 */
function getDescripcion(clave: string): string {
  const descripciones: Record<string, string> = {
    nombre_tienda: "Nombre de la tienda",
    email_tienda: "Email de contacto",
    telefono_tienda: "Teléfono de contacto",
    direccion_tienda: "Dirección física",
    ciudad_tienda: "Ciudad",
    iva_porcentaje: "Porcentaje de IVA aplicado",
    stock_minimo_default: "Stock mínimo por defecto",
    dias_alerta_vencimiento: "Días antes del vencimiento para alertar",
    version_sistema: "Versión actual del sistema",
  }
  return descripciones[clave] || clave
}
