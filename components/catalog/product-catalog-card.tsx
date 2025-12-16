"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MapPin, ShoppingBag, AlertTriangle, Package } from "lucide-react"

interface ProductoCatalogo {
  id: string
  nombre: string
  descripcion: string
  codigo: string
  categoria: string
  categoriaId: number | null
  categoriaIcono: string | null
  categoriaColor: string | null
  unidadProductiva: string
  unidadProductivaId: number | null
  unidadProductivaDescripcion: string | null
  unidadProductivaTipo: string | null
  tipoMedida: string
  unidad: string
  precio: number
  precioMayorista: number | null
  stock: number
  stockMinimo: number
  imagen: string
  esPerecedero: boolean
  diasVencimiento: number | null
  estado: "disponible" | "bajo-stock" | "agotado" | "proximo-vencer"
  loteProximo: {
    id: number
    numeroLote: string
    fechaVencimiento: string | null
    cantidadDisponible: number
  } | null
}

interface ProductCatalogCardProps {
  product: ProductoCatalogo
  onInquire: (product: ProductoCatalogo) => void
}

export function ProductCatalogCard({ product, onInquire }: ProductCatalogCardProps) {
  const isAvailable = product.stock > 0 && product.estado !== "agotado"

  // Obtener icono emoji según el tipo de unidad productiva
  const getUnidadIcon = () => {
    const tipo = product.unidadProductivaTipo?.toLowerCase()
    const iconos: Record<string, string> = {
      huerta: "🥬",
      hortalizas: "🥬",
      lacteos: "🥛",
      lácteos: "🥛",
      panificacion: "🍞",
      panificación: "🍞",
      avicultura: "🥚",
      apicultura: "🍯",
      porcicultura: "🐷",
      ganaderia: "🐄",
      ganadería: "🐄",
      piscicultura: "🐟",
      cunicultura: "🐰",
    }
    return tipo ? iconos[tipo] || "🌾" : "🌾"
  }

  // Obtener badge de estado
  const getEstadoBadge = () => {
    switch (product.estado) {
      case "agotado":
        return (
          <Badge className="bg-destructive text-destructive-foreground animate-pulse">
            <Package className="h-3 w-3 mr-1" />
            Agotado
          </Badge>
        )
      case "bajo-stock":
        return (
          <Badge className="bg-orange-500 text-white animate-pulse-glow">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Bajo Stock
          </Badge>
        )
      case "proximo-vencer":
        return (
          <Badge className="bg-yellow-500 text-white animate-pulse-glow">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Próximo a Vencer
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gradient-to-r from-primary to-chart-4 text-white border-0 shadow-lg animate-pulse-glow">
            Disponible
          </Badge>
        )
    }
  }

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-primary/30 hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative h-48 sm:h-56 bg-muted overflow-hidden">
          <Image
            src={product.imagen || "/placeholder.svg"}
            alt={product.nombre}
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
          {isAvailable && <div className="absolute top-3 right-3">{getEstadoBadge()}</div>}
        </div>

        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div>
            <h3 className="font-bold text-lg sm:text-xl text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
              {product.nombre}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{product.categoria}</p>
            {product.descripcion && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.descripcion}</p>
            )}
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 group-hover:bg-primary/10 transition-colors">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              <span className="mr-1">{getUnidadIcon()}</span>
              {product.unidadProductiva}
            </span>
          </div>

          {isAvailable && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Stock: <span className="font-semibold text-foreground">{product.stock}</span> {product.unidad}
              </span>
              {product.esPerecedero && product.loteProximo?.fechaVencimiento && (
                <span className="text-orange-500">
                  Vence:{" "}
                  {new Date(product.loteProximo.fechaVencimiento).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="text-xl sm:text-2xl font-bold gradient-text">${product.precio.toLocaleString("es-CO")}</p>
              <p className="text-xs text-muted-foreground">por {product.unidad}</p>
              {product.precioMayorista && (
                <p className="text-xs text-primary">Mayorista: ${product.precioMayorista.toLocaleString("es-CO")}</p>
              )}
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
