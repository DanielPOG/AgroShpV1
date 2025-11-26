"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreVertical, Eye, Edit, Trash2, Barcode } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { type Product, productiveUnits } from "@/lib/mock-data"
import Image from "next/image"

interface ProductCardProps {
  product: Product
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (productId: string) => void
}

const statusConfig = {
  disponible: { label: "Disponible", className: "bg-primary text-primary-foreground" },
  "bajo-stock": { label: "Bajo Stock", className: "bg-orange-accent text-white" },
  agotado: { label: "Agotado", className: "bg-destructive text-destructive-foreground" },
  "proximo-vencer": { label: "Próximo a Vencer", className: "bg-chart-2 text-white" },
}

const typeLabels = {
  liquido: "Líquido",
  solido: "Sólido",
  lote: "Lote",
}

export function ProductCard({ product, onView, onEdit, onDelete }: ProductCardProps) {
  const unit = productiveUnits.find((u) => u.id === product.productiveUnit)
  const statusInfo = statusConfig[product.status]

  return (
    <Card className="group hover:shadow-lg transition-all overflow-hidden">
      <CardContent className="p-0">
        <div className="relative h-48 bg-muted overflow-hidden">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="secondary" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(product)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Badge className="absolute bottom-2 left-2 bg-background/90 text-foreground">
            {unit?.icon} {unit?.name}
          </Badge>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.category}</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Stock</p>
              <p className="text-lg font-bold text-foreground">
                {product.stock} {product.unit}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="text-lg font-bold text-primary">${product.price.toLocaleString("es-CO")}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Badge variant="outline" className="text-xs">
              {typeLabels[product.type]}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => onView(product)} className="text-xs">
              <Barcode className="h-3 w-3 mr-1" />
              {product.barcode}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
