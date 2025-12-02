import { DashboardHeader } from "@/components/dashboard-header"
import { LotesPageClient } from "@/components/inventory/lotes-page-client"

/**
 * Página de Gestión de Lotes - Server Component
 * 
 * ✅ Autenticación manejada por layout.tsx
 * ✅ Permisos verificados en el Client Component
 * ✅ Vista centralizada de todos los lotes
 */
export default function LotesPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Gestión de Lotes"
        description="Trazabilidad y control de vencimientos de productos"
      />
      
      {/* Componente de cliente con toda la lógica de lotes */}
      <LotesPageClient />
    </div>
  )
}
