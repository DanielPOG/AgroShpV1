"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TopProducts } from "@/components/dashboard/top-products"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart"
import { MetaVentas } from "@/components/dashboard/meta-ventas"
import { DollarSign, Package, TrendingDown, ShoppingCart, Loader2 } from "lucide-react"

interface DashboardStats {
  ventas_hoy: {
    total: number
    cantidad: number
    tendencia: number
  }
  inventario: {
    total_items: number
    valor_total: number
  }
  productos_activos: number
  productos_bajo_stock: number
  ventas_semana: Array<{ dia: Date; total: number }>
  metodos_pago: Array<{ nombre: string; total: number; cantidad: number }>
  productos_mas_vendidos: Array<{ id: number; nombre: string; cantidad: number; ingresos: number }>
  actividades_recientes: Array<{ tipo: string; mensaje: string; fecha: Date; usuario: string }>
  meta_ventas: {
    id: number
    nombre: string
    monto_objetivo: number
    anio: number
    monto_actual: number
    porcentaje: number
  } | null
}

/**
 * Dashboard Principal - Client Component
 * 
 * ✅ La autenticación se maneja en layout.tsx
 * ✅ Muestra resumen general del sistema con datos reales
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  const cargarEstadisticas = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const { data } = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No se pudieron cargar las estadísticas</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Dashboard Principal" 
        description="Vista general del sistema AgroShop" 
      />

      {/* KPI Cards */}
      <div className="grid gap-4 xs:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas del Día"
          value={`$${stats.ventas_hoy.total.toLocaleString('es-CO')}`}
          description={`${stats.ventas_hoy.cantidad} transacciones`}
          icon={DollarSign}
          trend={{ 
            value: Math.abs(stats.ventas_hoy.tendencia), 
            isPositive: stats.ventas_hoy.tendencia >= 0 
          }}
        />
        <StatsCard
          title="Inventario Total"
          value={stats.inventario.total_items.toString()}
          description={`$${stats.inventario.valor_total.toLocaleString('es-CO')} en valor`}
          icon={Package}
          iconColor="bg-chart-4"
        />
        <StatsCard
          title="Bajo Stock"
          value={stats.productos_bajo_stock.toString()}
          description="Productos requieren atención"
          icon={TrendingDown}
          iconColor="bg-orange-accent"
        />
        <StatsCard
          title="Productos Activos"
          value={stats.productos_activos.toString()}
          description="Disponibles para venta"
          icon={ShoppingCart}
          iconColor="bg-chart-3"
        />
      </div>

      {/* Meta de Ventas */}
      <MetaVentas meta={stats.meta_ventas} />

      {/* Charts Section */}
      <div className="grid gap-4 xs:gap-6 grid-cols-1 lg:grid-cols-3">
        <SalesChart ventas={stats.ventas_semana} />
        <PaymentMethodsChart metodos={stats.metodos_pago} />
      </div>

      {/* Activity Section */}
      <div className="grid gap-4 xs:gap-6 grid-cols-1 lg:grid-cols-2">
        <TopProducts productos={stats.productos_mas_vendidos} />
        <RecentActivity actividades={stats.actividades_recientes} />
      </div>
    </div>
  )
}
