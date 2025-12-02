import { DashboardHeader } from "@/components/dashboard-header"
import { InventoryPageClient } from "@/components/inventory/inventory-page-client"

/**
 * Página de Inventario - Server Component
 * 
 * ✅ Autenticación manejada por layout.tsx
 * ✅ Permisos verificados en el Client Component
 * ✅ Delega la lógica interactiva al Client Component
 */
export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Gestión de Inventario"
        description="Administra productos, stock y unidades productivas"
      />
      
      {/* Componente de cliente con toda la lógica interactiva */}
      <InventoryPageClient />
    </div>
  )
}
