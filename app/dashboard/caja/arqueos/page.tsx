import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { ArqueosPageClient } from "@/components/caja/arqueos-page-client"

export const dynamic = "force-dynamic"

export default async function ArqueosPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar roles permitidos (Admin y Supervisor para ver historial)
  const rolesPermitidos = ["Admin", "Supervisor"]
  if (!rolesPermitidos.includes(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ArqueosPageClient userId={parseInt(session.user.id)} userRole={session.user.role} />
    </Suspense>
  )
}
