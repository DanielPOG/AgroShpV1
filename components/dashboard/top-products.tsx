import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp } from "lucide-react"

const topProducts = [
  { name: "Miel de Abeja", sales: 45, revenue: 675000, trend: 12 },
  { name: "Queso Campesino", sales: 38, revenue: 456000, trend: 8 },
  { name: "Tomate Chonto", sales: 120, revenue: 420000, trend: -3 },
  { name: "Leche Entera", sales: 95, revenue: 427500, trend: 15 },
  { name: "Pan Integral", sales: 67, revenue: 201000, trend: 5 },
]

export function TopProducts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos Más Vendidos</CardTitle>
        <CardDescription>Top 5 de la semana</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topProducts.map((product, index) => (
            <div key={product.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sales} unidades vendidas</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <p className="font-semibold text-sm">${product.revenue.toLocaleString("es-CO")}</p>
                <Badge variant={product.trend > 0 ? "default" : "secondary"} className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {product.trend > 0 ? "+" : ""}
                  {product.trend}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
