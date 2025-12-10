import { CashSessionReport } from "@/components/reports/cash-session-report"

export const metadata = {
  title: "Reportes de Caja | AgroShop",
  description: "Reportes y análisis de control de caja",
}

export default function CashReportPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes de Control de Caja</h1>
        <p className="text-muted-foreground mt-2">
          Análisis detallado de sesiones de caja, ventas y cuadres
        </p>
      </div>

      <CashSessionReport />
    </div>
  )
}
