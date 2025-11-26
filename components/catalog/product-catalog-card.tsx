"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type Product, productiveUnits } from "@/lib/mock-data"
import Image from "next/image"
import { MapPin, ShoppingBag } from "lucide-react"

interface ProductCatalogCardProps {
  product: Product
  onInquire: (product: Product) => void
}

export function ProductCatalogCard({ product, onInquire }: ProductCatalogCardProps) {
  const unit = productiveUnits.find((u) => u.id === product.productiveUnit)
  const isAvailable = product.stock > 0

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-primary/30 hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative h-48 sm:h-56 bg-muted overflow-hidden">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-125 group-hover:rotate-2 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Badge className="bg-destructive text-destructive-foreground text-base sm:text-lg px-4 py-2 animate-pulse">
                No Disponible
              </Badge>
            </div>
          )}
          {isAvailable && (
            <Badge className="absolute top-3 right-3 bg-gradient-to-r from-primary to-chart-4 text-white border-0 shadow-lg animate-pulse-glow">
              Disponible
            </Badge>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div>
            <h3 className="font-bold text-lg sm:text-xl text-foreground mb-1 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{product.category}</p>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 group-hover:bg-primary/10 transition-colors">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              <span className="mr-1">{unit?.icon}</span>
              {unit?.name}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="text-xl sm:text-2xl font-bold gradient-text">${product.price.toLocaleString("es-CO")}</p>
              <p className="text-xs text-muted-foreground">por {product.unit}</p>
            </div>
            <Button
              onClick={() => onInquire(product)}
              disabled={!isAvailable}
              className="bg-gradient-to-r from-primary to-chart-4 hover:from-primary/90 hover:to-chart-4/90 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-300"
              size="sm"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Consultar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
