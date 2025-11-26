"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Package, TrendingDown } from "lucide-react"
import { mockProducts, productiveUnits } from "@/lib/mock-data"

export function InventoryReport() {
  const lowStockProducts = mockProducts.filter((p) => p.stock <= p.lowStockThreshold)
  const outOfStockProducts = mockProducts.filter((p) => p.stock === 0)
  const expiringProducts = mockProducts.filter((p) => p.status === "proximo-vencer")

  const unitStock = productiveUnits.map((unit) => {
    const products = mockProducts.filter((p) => p.productiveUnit === unit.id)
    const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0)
    return {
      ...unit,
      productCount: products.length,
      totalValue,
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Alerts */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
        <Alert className="border-orange-accent bg-orange-accent/10 p-3 sm:p-4">
          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-accent" />
          <AlertDescription className="text-xs sm:text-sm">
            <span className="font-semibold">{lowStockProducts.length}</span> productos bajo stock
          </AlertDescription>
        </Alert>
        <Alert className="border-destructive bg-destructive/10 p-3 sm:p-4">
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          <AlertDescription className="text-xs sm:text-sm">
            <span className="font-semibold">{outOfStockProducts.length}</span> productos agotados
          </AlertDescription>
        </Alert>
        <Alert className="border-chart-2 bg-chart-2/10 p-3 sm:p-4">
          <Package className="h-3 w-3 sm:h-4 sm:w-4 text-chart-2" />
          <AlertDescription className="text-xs sm:text-sm">
            <span className="font-semibold">{expiringProducts.length}</span> próximos a vencer
          </AlertDescription>
        </Alert>
      </div>

      {/* Products requiring attention */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Productos que Requieren Atención</h3>
          <div className="space-y-2 sm:space-y-3">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress
                      value={(product.stock / product.lowStockThreshold) * 100}
                      className="w-20 xs:w-32 h-1.5 sm:h-2"
                    />
                    <span className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap">
                      {product.stock} / {product.lowStockThreshold} {product.unit}
                    </span>
                  </div>
                </div>
                <Badge
                  className={`${product.stock === 0 ? "bg-destructive" : "bg-orange-accent"} text-[10px] sm:text-xs shrink-0`}
                >
                  {product.stock === 0 ? "Agotado" : "Bajo Stock"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock by productive unit */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Inventario por Unidad Productiva</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {unitStock.map((unit) => (
              <Card key={unit.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xl sm:text-2xl shrink-0">{unit.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm truncate">{unit.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{unit.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Productos</span>
                      <span className="font-medium">{unit.productCount}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Valor Total</span>
                      <span className="font-semibold text-primary">${unit.totalValue.toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expiring products */}
      {expiringProducts.length > 0 && (
        <Card className="border-chart-2">
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2" />
              Productos Próximos a Vencer
            </h3>
            <div className="space-y-2">
              {expiringProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-2 sm:p-3 rounded-lg bg-chart-2/10"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{product.name}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Vence: {product.expirationDate}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-chart-2 text-chart-2 text-[10px] sm:text-xs shrink-0 self-start xs:self-center"
                  >
                    {product.stock} {product.unit} disponibles
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
