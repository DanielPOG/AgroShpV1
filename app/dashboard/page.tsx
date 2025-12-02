import { DashboardHeader } from "@/components/dashboard-header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TopProducts } from "@/components/dashboard/top-products"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart"
import { DollarSign, Package, TrendingDown, ShoppingCart } from "lucide-react"

/**
 * Dashboard Principal - Server Component
 * 
 * ✅ La autenticación se maneja en layout.tsx
 * ✅ Muestra resumen general del sistema
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Dashboard Principal" 
        description="Vista general del sistema AgroShop" 
      />

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas del Día"
          value="$890,000"
          description="126 transacciones"
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatsCard
          title="Inventario Total"
          value="346"
          description="8 unidades productivas"
          icon={Package}
          iconColor="bg-chart-4"
        />
        <StatsCard
          title="Bajo Stock"
          value="12"
          description="Productos requieren atención"
          icon={TrendingDown}
          iconColor="bg-orange-accent"
        />
        <StatsCard
          title="Productos Activos"
          value="89"
          description="Disponibles para venta"
          icon={ShoppingCart}
          iconColor="bg-chart-3"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SalesChart />
        <PaymentMethodsChart />
      </div>

      {/* Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopProducts />
        <RecentActivity />
      </div>
    </div>
  )
}
