"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/lib/mock-data"
import Image from "next/image"

interface ProductGridProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
}

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      {products.map((product) => (
        <Card
          key={product.id}
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
          onClick={() => onSelectProduct(product)}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="relative h-20 sm:h-24 bg-muted rounded-lg overflow-hidden mb-2">
              <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
              {product.stock <= product.lowStockThreshold && (
                <Badge className="absolute top-1 right-1 text-[10px] sm:text-xs bg-orange-accent px-1 sm:px-2">
                  Bajo Stock
                </Badge>
              )}
            </div>
            <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{product.name}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {product.stock} {product.unit}
              </span>
              <span className="text-xs sm:text-sm font-bold text-primary">
                ${product.price.toLocaleString("es-CO")}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
