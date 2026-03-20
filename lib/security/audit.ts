import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "AUTHORIZE" | "REJECT"

interface AuditEntry {
  tabla: string
  registro_id: number
  accion: AuditAction
  usuario_id: number | null
  datos_anteriores?: unknown
  datos_nuevos?: unknown
}

/**
 * Extrae IP y User-Agent de los headers de la request actual.
 */
export async function getRequestMeta(): Promise<{
  ip_address: string | null
  user_agent: string | null
}> {
  try {
    const h = await headers()
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null
    const ua = h.get("user-agent") ?? null
    return { ip_address: ip, user_agent: ua }
  } catch {
    return { ip_address: null, user_agent: null }
  }
}

/**
 * Registra un evento de auditoría en la tabla `auditoria`.
 * Nunca lanza — falla en silencio para no romper la operación principal.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const meta = await getRequestMeta()
    await prisma.auditoria.create({
      data: {
        tabla: entry.tabla,
        registro_id: entry.registro_id,
        accion: entry.accion,
        usuario_id: entry.usuario_id,
        datos_anteriores: entry.datos_anteriores
          ? JSON.parse(JSON.stringify(entry.datos_anteriores))
          : undefined,
        datos_nuevos: entry.datos_nuevos
          ? JSON.parse(JSON.stringify(entry.datos_nuevos))
          : undefined,
        ip_address: meta.ip_address,
        user_agent: meta.user_agent,
      },
    })
  } catch (err) {
    console.error("[audit] Error registrando auditoría:", err)
  }
}

/**
 * Registra una auditoría dentro de una transacción Prisma existente.
 * Útil cuando necesitas que la auditoría sea atómica con la operación.
 */
export async function logAuditTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  entry: AuditEntry & { ip_address?: string | null; user_agent?: string | null }
): Promise<void> {
  await tx.auditoria.create({
    data: {
      tabla: entry.tabla,
      registro_id: entry.registro_id,
      accion: entry.accion,
      usuario_id: entry.usuario_id,
      datos_anteriores: entry.datos_anteriores
        ? JSON.parse(JSON.stringify(entry.datos_anteriores))
        : undefined,
      datos_nuevos: entry.datos_nuevos
        ? JSON.parse(JSON.stringify(entry.datos_nuevos))
        : undefined,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
    },
  })
}

/**
 * Crea un resumen seguro de la venta para almacenar en auditoría.
 */
export function summarizeSale(venta: {
  id: number
  codigo_venta?: string | null
  total?: number | unknown
  estado?: string | null
  detalle_ventas?: { cantidad: unknown; precio_unitario: unknown; producto_id?: number | null; [key: string]: unknown }[]
  pagos_venta?: { monto: unknown; metodo_pago_id?: number | null; [key: string]: unknown }[]
}): Record<string, unknown> {
  return {
    id: venta.id,
    codigo_venta: venta.codigo_venta,
    total: venta.total,
    estado: venta.estado,
    items: venta.detalle_ventas?.length ?? 0,
    pagos: venta.pagos_venta?.length ?? 0,
  }
}

/**
 * Crea un resumen seguro de un movimiento de caja.
 */
export function summarizeMovimiento(mov: {
  id: number
  tipo_movimiento?: string | null
  monto?: unknown
  metodo_pago?: string | null
  descripcion?: string | null
}): Record<string, unknown> {
  return {
    id: mov.id,
    tipo_movimiento: mov.tipo_movimiento,
    monto: mov.monto,
    metodo_pago: mov.metodo_pago,
    descripcion: mov.descripcion,
  }
}

/**
 * Crea un resumen seguro de un retiro de caja.
 */
export function summarizeRetiro(retiro: {
  id: number
  monto?: unknown
  motivo?: string | null
  estado?: string | null
  destino_fondos?: string | null
}): Record<string, unknown> {
  return {
    id: retiro.id,
    monto: retiro.monto,
    motivo: retiro.motivo,
    estado: retiro.estado,
    destino_fondos: retiro.destino_fondos,
  }
}

/**
 * Crea un resumen seguro de un turno de caja.
 */
export function summarizeTurno(turno: {
  id: number
  cajero_id?: number | null
  sesion_caja_id?: number | null
  efectivo_inicial?: unknown
  tipo_relevo?: string | null
}): Record<string, unknown> {
  return {
    id: turno.id,
    cajero_id: turno.cajero_id,
    sesion_caja_id: turno.sesion_caja_id,
    efectivo_inicial: turno.efectivo_inicial,
    tipo_relevo: turno.tipo_relevo,
  }
}
