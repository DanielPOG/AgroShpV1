"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReportCard } from "@/components/reports/report-card"
import { SalesReport } from "@/components/reports/sales-report"
import { InventoryReport } from "@/components/reports/inventory-report"
import { PaymentMethodsReport } from "@/components/reports/payment-methods-report"
import { TrendingUp, Package, CreditCard, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ReportesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    
    // Verificar que tenga permisos de reportes
    if (!isLoading && isAuthenticated && !hasPermission('reportes') && !hasPermission('all')) {
      router.push("/dashboard")
      return
    }
  }, [isAuthenticated, isLoading, hasPermission, router])

  const handleDownloadPDF = (reportName: string) => {
    toast({
      title: "Descargando PDF",
      description: `Generando reporte ${reportName}...`,
    })
    console.log("[v0] Downloading PDF report:", reportName)
  }

  const handleDownloadExcel = (reportName: string) => {
    toast({
      title: "Descargando Excel",
      description: `Generando reporte ${reportName}...`,
    })
    console.log("[v0] Downloading Excel report:", reportName)
  }

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Reportes y Análisis"
        description="Genera y visualiza reportes del sistema AgroShop"
      />

          {/* Report Overview Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <ReportCard
              title="Reporte de Ventas"
              description="Análisis de ventas por período"
              icon={TrendingUp}
              onDownloadPDF={() => handleDownloadPDF("Ventas")}
              onDownloadExcel={() => handleDownloadExcel("Ventas")}
            />
            <ReportCard
              title="Reporte de Inventario"
              description="Estado actual del inventario"
              icon={Package}
              onDownloadPDF={() => handleDownloadPDF("Inventario")}
              onDownloadExcel={() => handleDownloadExcel("Inventario")}
            />
            <ReportCard
              title="Métodos de Pago"
              description="Distribución de métodos de pago"
              icon={CreditCard}
              onDownloadPDF={() => handleDownloadPDF("Métodos de Pago")}
              onDownloadExcel={() => handleDownloadExcel("Métodos de Pago")}
            />
          </div>

          {/* Detailed Reports Tabs */}
          <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="inventory">Inventario</TabsTrigger>
              <TabsTrigger value="payments">Métodos de Pago</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-6">
              <SalesReport />
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <InventoryReport />
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <PaymentMethodsReport />
            </TabsContent>
          </Tabs>
        </div>
  )
}
