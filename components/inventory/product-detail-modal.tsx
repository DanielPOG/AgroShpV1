import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { type Product, productiveUnits } from "@/lib/mock-data"
import Image from "next/image"
import { Barcode, Package, DollarSign, AlertTriangle, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ProductDetailModalProps {
  product: Product | null
  open: boolean
  onClose: () => void
}

const statusConfig = {
  disponible: { label: "Disponible", className: "bg-primary text-primary-foreground" },
  "bajo-stock": { label: "Bajo Stock", className: "bg-orange-accent text-white" },
  agotado: { label: "Agotado", className: "bg-destructive text-destructive-foreground" },
  "proximo-vencer": { label: "Próximo a Vencer", className: "bg-chart-2 text-white" },
}

export function ProductDetailModal({ product, open, onClose }: ProductDetailModalProps) {
  if (!product) return null

  const unit = productiveUnits.find((u) => u.id === product.productiveUnit)
  const statusInfo = statusConfig[product.status]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalles del Producto</DialogTitle>
          <DialogDescription>Información completa y gestión del inventario</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Image */}
          <div className="relative h-64 rounded-lg overflow-hidden bg-muted">
            <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
            <Badge className={`absolute top-3 right-3 ${statusInfo.className}`}>{statusInfo.label}</Badge>
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-2">{product.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{product.category}</Badge>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {unit?.icon} {unit?.name}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Stock Actual
              </div>
              <p className="text-2xl font-bold text-foreground">
                {product.stock} {product.unit}
              </p>
              <p className="text-xs text-muted-foreground">
                Umbral mínimo: {product.lowStockThreshold} {product.unit}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Precio
              </div>
              <p className="text-2xl font-bold text-primary">${product.price.toLocaleString("es-CO")}</p>
              <p className="text-xs text-muted-foreground">por {product.unit}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Barcode className="h-4 w-4" />
                Código de Barras
              </div>
              <p className="text-lg font-mono font-semibold text-foreground">{product.barcode}</p>
              <Button variant="outline" size="sm" className="mt-1 bg-transparent">
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerar
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Tipo de Producto
              </div>
              <p className="text-lg font-semibold text-foreground capitalize">{product.type}</p>
            </div>
          </div>

          {product.expirationDate && (
            <>
              <Separator />
              <div className="bg-orange-accent/10 border border-orange-accent/20 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-accent mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-1">Fecha de Vencimiento</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(product.expirationDate), "dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button className="flex-1">Mover a Otra Unidad</Button>
            <Button variant="outline" className="flex-1 bg-transparent">
              Ajustar Stock
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
