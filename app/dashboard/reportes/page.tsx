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
import { ClientsReport } from "@/components/reports/clients-report"
import { ProfitabilityReport } from "@/components/reports/profitability-report"
import { TrendingUp, Package, CreditCard, Users, DollarSign, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  exportVentasPDF,
  exportVentasExcel,
  exportInventarioPDF,
  exportInventarioExcel,
  exportClientesPDF,
  exportClientesExcel,
  exportRentabilidadPDF,
  exportRentabilidadExcel,
  exportMetodosPagoPDF,
  exportMetodosPagoExcel,
} from "@/lib/export-utils"

export default function ReportesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth()
  
  // Estados para fechas por defecto
  const [fechasVentas, setFechasVentas] = useState({
    inicio: new Date(new Date().setDate(new Date().getDate() - 30)),
    fin: new Date()
  })

  useEffect(() => {
    // Si no está autenticado y ya terminó de cargar, redirigir a login
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?callbackUrl=/dashboard/reportes")
      return
    }
    
    // Verificar permisos solo si está autenticado
    if (!isLoading && isAuthenticated && !hasPermission('reportes') && !hasPermission('all')) {
      router.replace("/dashboard")
      return
    }
  }, [isAuthenticated, isLoading, hasPermission, router])

  const handleDownloadPDF = async (reportName: string) => {
    try {
      toast({
        title: "Generando PDF",
        description: `Exportando reporte ${reportName}...`,
      })
      
      switch (reportName) {
        case "Ventas":
          await exportVentasPDF(fechasVentas.inicio, fechasVentas.fin)
          break
        case "Inventario":
          await exportInventarioPDF(30)
          break
        case "Métodos de Pago":
          await exportMetodosPagoPDF(fechasVentas.inicio, fechasVentas.fin)
          break
        case "Clientes":
          await exportClientesPDF(fechasVentas.inicio, fechasVentas.fin)
          break
        case "Rentabilidad":
          await exportRentabilidadPDF(fechasVentas.inicio, fechasVentas.fin)
          break
      }
      
      toast({
        title: "PDF Descargado",
        description: `Reporte ${reportName} exportado exitosamente`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo exportar el reporte: ${error}`,
        variant: "destructive",
      })
    }
  }

  const handleDownloadExcel = async (reportName: string) => {
    try {
      toast({
        title: "Generando Excel",
        description: `Exportando reporte ${reportName}...`,
      })
      
      switch (reportName) {
        case "Ventas":
          await exportVentasExcel(fechasVentas.inicio, fechasVentas.fin)
          break
        case "Inventario":
          await exportInventarioExcel(30)
          break
        case "Métodos de Pago":
          await exportMetodosPagoExcel(fechasVentas.inicio, fechasVentas.fin)
          break
        case "Clientes":
          await exportClientesExcel(fechasVentas.inicio, fechasVentas.fin)
          break
        case "Rentabilidad":
          await exportRentabilidadExcel(fechasVentas.inicio, fechasVentas.fin)
          break
      }
      
      toast({
        title: "Excel Descargado",
        description: `Reporte ${reportName} exportado exitosamente`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo exportar el reporte: ${error}`,
        variant: "destructive",
      })
    }
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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-6">
      <DashboardHeader
        title="Reportes y Análisis"
        description="Genera y visualiza reportes del sistema AgroShop"
      />

          {/* Report Overview Cards - Responsive Grid */}
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mb-6 sm:mb-8">
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
            <ReportCard
              title="Top Clientes"
              description="Clientes más frecuentes"
              icon={Users}
              onDownloadPDF={() => handleDownloadPDF("Clientes")}
              onDownloadExcel={() => handleDownloadExcel("Clientes")}
            />
            <ReportCard
              title="Rentabilidad"
              description="Productos más rentables"
              icon={DollarSign}
              onDownloadPDF={() => handleDownloadPDF("Rentabilidad")}
              onDownloadExcel={() => handleDownloadExcel("Rentabilidad")}
            />
          </div>

          {/* Detailed Reports Tabs - Responsive */}
          <Tabs defaultValue="sales" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 h-auto p-1">
              <TabsTrigger value="sales" className="text-xs sm:text-sm py-2">Ventas</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm py-2">Inventario</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs sm:text-sm py-2">Pagos</TabsTrigger>
              <TabsTrigger value="clients" className="text-xs sm:text-sm py-2">Clientes</TabsTrigger>
              <TabsTrigger value="profitability" className="text-xs sm:text-sm py-2 col-span-2 sm:col-span-1">Rentabilidad</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4 sm:space-y-6">
              <SalesReport />
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
              <InventoryReport />
            </TabsContent>

            <TabsContent value="payments" className="space-y-4 sm:space-y-6">
              <PaymentMethodsReport />
            </TabsContent>

            <TabsContent value="clients" className="space-y-4 sm:space-y-6">
              <ClientsReport />
            </TabsContent>

            <TabsContent value="profitability" className="space-y-4 sm:space-y-6">
              <ProfitabilityReport />
            </TabsContent>
          </Tabs>
        </div>
  )
}
