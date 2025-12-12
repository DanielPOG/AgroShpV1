import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { getActiveCashSession } from "@/lib/db/cash-sessions"
import { TurnosPageClient } from "@/components/caja/turnos-page-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function TurnosPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar roles permitidos
  const rolesPermitidos = ["Admin", "Cajero", "Supervisor"]
  if (!rolesPermitidos.includes(session.user.role)) {
    redirect("/dashboard")
  }

  // Obtener sesión activa (puede ser null)
  const sesionActiva = await getActiveCashSession(parseInt(session.user.id))

  // ✅ Serializar la sesión si existe
  const sesionSerializada = sesionActiva ? {
    ...sesionActiva,
    fondo_inicial: sesionActiva.fondo_inicial.toString(),
    total_ventas_efectivo: sesionActiva.total_ventas_efectivo?.toString() || "0",
    total_ventas_nequi: sesionActiva.total_ventas_nequi?.toString() || "0",
    total_ventas_tarjeta: sesionActiva.total_ventas_tarjeta?.toString() || "0",
    total_ventas_transferencia: sesionActiva.total_ventas_transferencia?.toString() || "0",
    total_ingresos_adicionales: sesionActiva.total_ingresos_adicionales?.toString() || "0",
    total_retiros: sesionActiva.total_retiros?.toString() || "0",
    total_gastos: sesionActiva.total_gastos?.toString() || "0",
    efectivo_esperado: sesionActiva.efectivo_esperado?.toString() || "0",
    efectivo_contado: sesionActiva.efectivo_contado?.toString() || null,
    diferencia: sesionActiva.diferencia?.toString() || null,
  } : null

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <TurnosPageClient 
        sesionCaja={sesionSerializada} 
        userId={parseInt(session.user.id)} 
        userRole={session.user.role} 
      />
    </Suspense>
  )
}
