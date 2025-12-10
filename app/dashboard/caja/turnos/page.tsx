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

  // Obtener sesión activa
  const sesionActiva = await getActiveCashSession(parseInt(session.user.id))

  // Si no hay sesión activa, mostrar alerta
  if (!sesionActiva) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Turnos de Caja</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes una sesión de caja activa. Para gestionar turnos, primero debes abrir una sesión.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <a href="/dashboard/caja">Ir a Sesiones de Caja</a>
        </Button>
      </div>
    )
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <TurnosPageClient 
        sesionCaja={sesionActiva} 
        userId={parseInt(session.user.id)} 
        userRole={session.user.role} 
      />
    </Suspense>
  )
}
