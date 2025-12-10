"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface Product {
  id: number
  nombre: string
  codigo: string
  precio_unitario: number
  stock_actual: number
  stock_minimo: number
  imagen_url?: string | null
  unidad: string
  es_perecedero: boolean
  activo: boolean
  categoria?: {
    id: number
    nombre: string
    color: string
    icono: string
  }
}

interface ProductGridProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
}

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      {products.map((product) => {
        const stock = Number(product.stock_actual)
        const stockMinimo = Number(product.stock_minimo)
        const precio = Number(product.precio_unitario)
        const bajoStock = stock <= stockMinimo

        return (
          <Card
            key={product.id}
            className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
            onClick={() => onSelectProduct(product)}
          >
            <CardContent className="p-2 sm:p-3">
              <div className="relative h-20 sm:h-24 bg-muted rounded-lg overflow-hidden mb-2">
                <Image 
                  src={product.imagen_url || "/placeholder.svg"} 
                  alt={product.nombre} 
                  fill 
                  className="object-cover" 
                />
                {bajoStock && (
                  <Badge className="absolute top-1 right-1 text-[10px] sm:text-xs bg-orange-accent px-1 sm:px-2">
                    Bajo Stock
                  </Badge>
                )}
                {product.es_perecedero && (
                  <Badge className="absolute top-1 left-1 text-[10px] sm:text-xs bg-yellow-500 px-1 sm:px-2">
                    Perecedero
                  </Badge>
                )}
              </div>
              <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{product.nombre}</p>
              {product.categoria && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {product.categoria.nombre}
                </p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {stock} {product.unidad}
                </span>
                <span className="text-xs sm:text-sm font-bold text-primary">
                  ${precio.toLocaleString("es-CO")}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
