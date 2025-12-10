import { InventoryHistory } from "@/components/inventory/inventory-history"

export const metadata = {
  title: "Historial de Inventario | AgroShop",
  description: "Historial completo de movimientos de inventario",
}

export default function InventoryHistoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historial de Inventario</h1>
        <p className="text-muted-foreground mt-2">
          Consulta todos los movimientos de entrada, salida y ajustes de inventario
        </p>
      </div>

      <InventoryHistory />
    </div>
  )
}
