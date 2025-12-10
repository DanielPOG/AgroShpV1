import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { getActiveCashSession } from "@/lib/db/cash-sessions"
import { ArqueosPageClient } from "@/components/caja/arqueos-page-client"
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

export default async function ArqueosPage() {
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

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ArqueosPageClient 
        sesionCaja={sesionActiva} 
        userId={parseInt(session.user.id)} 
        userRole={session.user.role} 
      />
    </Suspense>
  )
}
