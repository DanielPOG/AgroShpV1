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

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <GastosPageClient sesionCaja={sesionActiva} userId={parseInt(session.user.id)} userRole={session.user.role} />
    </Suspense>
  )
}
