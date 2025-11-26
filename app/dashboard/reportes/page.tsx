"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReportCard } from "@/components/reports/report-card"
import { SalesReport } from "@/components/reports/sales-report"
import { InventoryReport } from "@/components/reports/inventory-report"
import { PaymentMethodsReport } from "@/components/reports/payment-methods-report"
import { TrendingUp, Package, CreditCard } from "lucide-react"
import type { User } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function ReportesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("agroshop_user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("agroshop_user")
    router.push("/login")
  }

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

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} userName={user.name} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 xl:p-8">
          <DashboardHeader title="Reportes" description="Análisis de ventas, inventario y operaciones" />

          <Tabs defaultValue="ventas" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full max-w-full sm:max-w-2xl grid-cols-3 h-auto">
              <TabsTrigger
                value="ventas"
                className="flex flex-col xs:flex-row items-center gap-1 xs:gap-2 text-[10px] xs:text-xs sm:text-sm py-2"
              >
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Ventas</span>
              </TabsTrigger>
              <TabsTrigger
                value="inventario"
                className="flex flex-col xs:flex-row items-center gap-1 xs:gap-2 text-[10px] xs:text-xs sm:text-sm py-2"
              >
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Inventario</span>
              </TabsTrigger>
              <TabsTrigger
                value="pagos"
                className="flex flex-col xs:flex-row items-center gap-1 xs:gap-2 text-[10px] xs:text-xs sm:text-sm py-2"
              >
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Pagos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ventas" className="space-y-4 sm:space-y-6">
              <ReportCard
                title="Reporte de Ventas"
                description="Análisis detallado de ventas diarias, semanales y mensuales"
                icon={TrendingUp}
                onDownloadPDF={() => handleDownloadPDF("Ventas")}
                onDownloadExcel={() => handleDownloadExcel("Ventas")}
              >
                <SalesReport />
              </ReportCard>
            </TabsContent>

            <TabsContent value="inventario" className="space-y-4 sm:space-y-6">
              <ReportCard
                title="Reporte de Inventario"
                description="Estado actual del inventario y productos que requieren atención"
                icon={Package}
                onDownloadPDF={() => handleDownloadPDF("Inventario")}
                onDownloadExcel={() => handleDownloadExcel("Inventario")}
              >
                <InventoryReport />
              </ReportCard>
            </TabsContent>

            <TabsContent value="pagos" className="space-y-4 sm:space-y-6">
              <ReportCard
                title="Reporte de Métodos de Pago"
                description="Distribución y análisis de métodos de pago utilizados"
                icon={CreditCard}
                onDownloadPDF={() => handleDownloadPDF("Métodos de Pago")}
                onDownloadExcel={() => handleDownloadExcel("Métodos de Pago")}
              >
                <PaymentMethodsReport />
              </ReportCard>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
