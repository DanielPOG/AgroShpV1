"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TopProducts } from "@/components/dashboard/top-products"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart"
import { DollarSign, Package, TrendingDown, ShoppingCart } from "lucide-react"
import type { User } from "@/lib/auth"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("agroshop_user")
    if (!storedUser) {
      router.push("/")
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("agroshop_user")
    router.push("/")
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} userName={user.name} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-6 lg:p-8">
          <DashboardHeader title="Dashboard Principal" description="Vista general del sistema AgroShop" />

          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
          <div className="grid gap-6 lg:grid-cols-3 mb-6">
            <SalesChart />
            <PaymentMethodsChart />
          </div>

          {/* Activity Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TopProducts />
            <RecentActivity />
          </div>
        </div>
      </main>
    </div>
  )
}
