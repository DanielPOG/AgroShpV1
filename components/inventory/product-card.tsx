"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Package, AlertCircle, CheckCircle, Clock, MoreVertical, Eye, Edit, Trash2, History, RotateCcw } from "lucide-react"
import Image from "next/image"

interface Product {
  id: number
  codigo: string
  nombre: string
  descripcion?: string | null
  precio_unitario: number
  stock_actual: number
  stock_minimo: number
  unidad: string
  tipo_medida: string
  imagen_url?: string | null
  activo?: boolean | null
  categoria?: {
    id: number
    nombre: string
    icono?: string | null
    color?: string | null
  } | null
  unidad_productiva?: {
    id: number
    codigo: string
    nombre: string
  } | null
}

interface ProductCardProps {
  product: Product
  viewMode: "grid" | "list"
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
  onHistory?: () => void
  onAdjustStock?: () => void
  onReactivate?: () => void
  onPermanentDelete?: () => void
  showInactive?: boolean
  // Selección múltiple
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  selectionMode?: boolean
}

export function ProductCard({ 
  product, 
  viewMode, 
  onClick, 
  onEdit, 
  onDelete, 
  onHistory, 
  onAdjustStock, 
  onReactivate, 
  onPermanentDelete, 
  showInactive,
  isSelected = false,
  onSelect,
  selectionMode = false
}: ProductCardProps) {
  // Determinar estado del stock
  const getStockStatus = () => {
    // Convertir a números para asegurar comparaciones correctas
    const stockActual = Number(product.stock_actual)
    const stockMinimo = Number(product.stock_minimo)
    const stockMaximo = product.stock_maximo ? Number(product.stock_maximo) : null
    
    // 1. Agotado: stock_actual = 0
    if (stockActual === 0) {
      return {
        label: "Agotado",
        icon: <AlertCircle className="h-3 w-3" />,
        className: "bg-destructive text-destructive-foreground",
      }
    }
    
    // 2. Sobre Exceso: stock_actual >= stock_maximo (si existe)
    if (stockMaximo !== null && stockActual >= stockMaximo) {
      return {
        label: "Sobre Exceso",
        icon: <AlertCircle className="h-3 w-3" />,
        className: "bg-purple-500 text-white",
      }
    }
    
    // 3. Bajo Stock: 0 < stock_actual < stock_minimo
    if (stockActual < stockMinimo) {
      return {
        label: "Bajo Stock",
        icon: <AlertCircle className="h-3 w-3" />,
        className: "bg-orange-accent text-white",
      }
    }
    
    // 4. Disponible: stock_minimo <= stock_actual < stock_maximo (o sin máximo)
    return {
      label: "Disponible",
      icon: <CheckCircle className="h-3 w-3" />,
      className: "bg-primary text-primary-foreground",
    }
  }

  const stockStatus = getStockStatus()

  const typeLabels: Record<string, string> = {
    unidad: "Unidad",
    peso: "Peso",
    volumen: "Volumen",
    lote: "Lote",
  }

  if (viewMode === "list") {
    return (
      <Card className={`group hover:shadow-lg transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {selectionMode && onSelect && (
              <div className="flex items-center pt-1">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div 
              className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={onClick}
            >
              <Image
                src={product.imagen_url || "/placeholder.svg"}
                alt={product.nombre}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground truncate">{product.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{product.categoria?.nombre || "Sin categoría"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={stockStatus.className}>
                    {stockStatus.icon}
                    <span className="ml-1">{stockStatus.label}</span>
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onClick}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </DropdownMenuItem>
                      {!showInactive && onEdit && (
                        <DropdownMenuItem onClick={onEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      {!showInactive && onHistory && (
                        <DropdownMenuItem onClick={onHistory}>
                          <History className="mr-2 h-4 w-4" />
                          Ver Historial
                        </DropdownMenuItem>
                      )}
                      {showInactive && onReactivate && (
                        <DropdownMenuItem onClick={onReactivate} className="text-green-600">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reactivar
                        </DropdownMenuItem>
                      )}
                      {showInactive && onPermanentDelete && (
                        <DropdownMenuItem onClick={onPermanentDelete} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar de BD
                        </DropdownMenuItem>
                      )}
                      {!showInactive && onDelete && (
                        <DropdownMenuItem onClick={onDelete} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Desactivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Stock: </span>
                  <span className="font-semibold text-foreground">
                    {product.stock_actual} {product.unidad}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Precio: </span>
                  <span className="font-semibold text-primary">
                    ${product.precio_unitario.toLocaleString("es-CO")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Código: </span>
                  <span className="font-mono text-xs">{product.codigo}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`group hover:shadow-lg transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-0">
        <div className="relative h-48 bg-muted overflow-hidden">
          {selectionMode && onSelect && (
            <div className="absolute top-2 left-2 z-20">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                className="bg-background"
              />
            </div>
          )}
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={onClick}
          >
            <Image
              src={product.imagen_url || "/placeholder.svg"}
              alt={product.nombre}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
            <Badge className={stockStatus.className}>
              {stockStatus.icon}
              <span className="ml-1">{stockStatus.label}</span>
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/90 hover:bg-background">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onClick}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalles
                </DropdownMenuItem>
                {!showInactive && onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {!showInactive && onHistory && (
                  <DropdownMenuItem onClick={onHistory}>
                    <History className="mr-2 h-4 w-4" />
                    Ver Historial
                  </DropdownMenuItem>
                )}
                {showInactive && onReactivate && (
                  <DropdownMenuItem onClick={onReactivate} className="text-green-600">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reactivar
                  </DropdownMenuItem>
                )}
                {showInactive && onPermanentDelete && (
                  <DropdownMenuItem onClick={onPermanentDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar de BD
                  </DropdownMenuItem>
                )}
                {!showInactive && onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desactivar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {product.unidad_productiva && (
            <Badge className="absolute bottom-2 left-2 bg-background/90 text-foreground">
              {product.unidad_productiva.nombre}
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground line-clamp-1">{product.nombre}</h3>
            <p className="text-sm text-muted-foreground">{product.categoria?.nombre || "Sin categoría"}</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Stock</p>
              <p className="text-lg font-bold text-foreground">
                {product.stock_actual} {product.unidad}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="text-lg font-bold text-primary">${product.precio_unitario.toLocaleString("es-CO")}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Badge variant="outline" className="text-xs">
              {typeLabels[product.tipo_medida] || product.tipo_medida}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">{product.codigo}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
