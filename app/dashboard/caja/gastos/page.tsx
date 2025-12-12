import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { getActiveCashSession } from "@/lib/db/cash-sessions"
import { GastosPageClient } from "@/components/caja/gastos-page-client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function GastosPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar roles permitidos
  const rolesPermitidos = ["Admin", "Cajero", "Supervisor"]
  if (!rolesPermitidos.includes(session.user.role)) {
    redirect("/dashboard")
  }

  // Obtener sesión activa
  const sesionActiva = await getActiveCashSession(parseInt(session.user.id))

  // Si no hay sesión activa, mostrar alerta
  if (!sesionActiva) {
    return (
      <div className="container py-8">
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Sin Sesión Activa
              </AlertDialogTitle>
              <AlertDialogDescription>
                Para registrar gastos de caja, primero debes abrir una sesión de caja.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction asChild>
                <a href="/dashboard/caja">Ir a Sesiones de Caja</a>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ✅ Serializar la sesión para componentes cliente (convertir Decimals a strings)
  const sesionSerializada = {
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
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <GastosPageClient sesionCaja={sesionSerializada} userId={parseInt(session.user.id)} userRole={session.user.role} />
    </Suspense>
  )
}
