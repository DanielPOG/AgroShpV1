import { SalesAudit } from "@/components/reports/sales-audit"

export const metadata = {
  title: "Auditoría de Ventas | AgroShop",
  description: "Auditoría y seguimiento detallado de todas las ventas",
}

export default function SalesAuditPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoría de Ventas</h1>
        <p className="text-muted-foreground mt-2">
          Consulta detallada de todas las ventas realizadas con información completa
        </p>
      </div>

      <SalesAudit />
    </div>
  )
}
