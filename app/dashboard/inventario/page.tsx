import { redirect } from "next/navigation"
import { auth } from "@/lib/auth.server"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { InventoryPageClient } from "@/components/inventory/inventory-page-client"

/**
 * Página de Inventario - Server Component
 * 
 * ✅ Verifica autenticación en servidor
 * ✅ Verifica permisos (solo Admin e Inventarista)
 * ✅ Delega la lógica interactiva al Client Component
 */
export default async function InventarioPage() {
  // Verificar sesión en el servidor
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  // Verificar permisos (solo Admin e Inventarista pueden gestionar inventario)
  const canManage = session.user.role === 'Admin' || session.user.role === 'Inventarista'
  
  if (!canManage) {
    // Redirigir al dashboard si no tiene permisos
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        userRole={session.user.role as any} 
        userName={session.user.name || "Usuario"} 
      />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-6 lg:p-8">
          <DashboardHeader
            title="Gestión de Inventario"
            description="Administra productos, stock y unidades productivas"
          />
          
          {/* Componente de cliente con toda la lógica interactiva */}
          <InventoryPageClient />
        </div>
      </main>
    </div>
  )
}
