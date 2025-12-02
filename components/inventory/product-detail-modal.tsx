"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { Package, DollarSign, AlertCircle, CheckCircle, Loader2, Trash2, RotateCcw, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useProduct } from "@/hooks/use-products"
import { useProductMutations } from "@/hooks/use-products"
import { useLotesByProducto } from "@/hooks/use-lotes"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { LotesList } from "./lotes-list"
import { EditLoteModal } from "./edit-lote-modal"
import { AdjustLoteStockModal } from "./adjust-lote-stock-modal"

interface ProductDetailModalProps {
  productId: number | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
  onAdjustStock?: () => void
  onCreateLote?: () => void
}

export function ProductDetailModal({ productId, isOpen, onClose, onUpdate, onDelete, onAdjustStock, onCreateLote }: ProductDetailModalProps) {
  const { toast } = useToast()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null)
  const [isEditLoteOpen, setIsEditLoteOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)
  
  // Solo llamar al hook si hay un productId válido
  const shouldFetch = isOpen && productId !== null
  const { product, isLoading, error, refetch } = useProduct(shouldFetch ? productId : null)
  const { lotes, isLoading: lotesLoading, refetch: refetchLotes } = useLotesByProducto(shouldFetch ? productId : null)
  const { deleteProduct, isDeleting } = useProductMutations()

  // Handlers para lotes
  const handleEditLote = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsEditLoteOpen(true)
  }

  const handleAdjustStock = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsAdjustStockOpen(true)
  }

  const handleLoteSuccess = () => {
    refetch()
    refetchLotes()
  }

  const handleDelete = async () => {
    if (!productId) return

    try {
      console.log('🗑️ Iniciando eliminación del producto:', productId)
      const result = await deleteProduct(productId)
      console.log('✅ Producto eliminado exitosamente:', result)
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido desactivado correctamente",
        variant: "destructive",
      })
      onDelete()
    } catch (error) {
      console.error('❌ Error al eliminar producto:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el producto",
        variant: "destructive",
      })
    }
  }

  // No renderizar el modal si no hay ID o no está abierto
  if (!isOpen || !productId) return null

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando...</DialogTitle>
            <DialogDescription>Obteniendo información del producto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !product) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>No se pudo cargar el producto</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "No se pudo cargar el producto"}</AlertDescription>
          </Alert>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogContent>
      </Dialog>
    )
  }

  const getStockStatus = () => {
    if (product.stock_actual === 0) {
      return {
        label: "Agotado",
        icon: <AlertCircle className="h-4 w-4" />,
        className: "bg-destructive text-destructive-foreground",
      }
    }
    if (product.stock_actual <= product.stock_minimo) {
      return {
        label: "Bajo Stock",
        icon: <AlertCircle className="h-4 w-4" />,
        className: "bg-orange-accent text-white",
      }
    }
    return {
      label: "Disponible",
      icon: <CheckCircle className="h-4 w-4" />,
      className: "bg-primary text-primary-foreground",
    }
  }

  const stockStatus = getStockStatus()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-10xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl">Detalles del Producto</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Información completa y gestión del inventario</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 space-y-3 sm:space-y-4">
          {/* Product Image */}
          <div className="relative w-full h-40 sm:h-48 md:h-64 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={product.imagen_url || "/placeholder.svg"}
              alt={product.nombre}
              fill
              className="object-cover"
            />
            <Badge className={`absolute top-2 right-2 text-xs ${stockStatus.className}`}>
              {stockStatus.icon}
              <span className="ml-1">{stockStatus.label}</span>
            </Badge>
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-2 break-words">{product.nombre}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {product.categoria && (
                <Badge variant="secondary" className="text-xs">
                  {product.categoria.icono && `${product.categoria.icono} `}
                  {product.categoria.nombre}
                </Badge>
              )}
              {product.unidad_productiva && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {product.unidad_productiva.nombre}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">Código: {product.codigo}</Badge>
            </div>
            {product.descripcion && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-words">{product.descripcion}</p>
            )}
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Stock Actual</span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground break-words">
                {product.stock_actual} {product.unidad}
              </p>
              <p className="text-xs text-muted-foreground">
                Mínimo: {product.stock_minimo} {product.unidad}
              </p>
              {product.stock_maximo && (
                <p className="text-xs text-muted-foreground">
                  Máximo: {product.stock_maximo} {product.unidad}
                </p>
              )}
            </div>

            <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Precio</span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary break-words">
                ${product.precio_unitario.toLocaleString("es-CO")}
              </p>
              <p className="text-xs text-muted-foreground">por {product.unidad}</p>
              {product.precio_mayorista && (
                <p className="text-xs text-muted-foreground">
                  Mayorista: ${product.precio_mayorista.toLocaleString("es-CO")}
                </p>
              )}
            </div>

            <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">Tipo de Medida</p>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-foreground capitalize">{product.tipo_medida}</p>
            </div>

            <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">Estado</p>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
                {product.activo ? "Activo" : "Inactivo"}
              </p>
            </div>
          </div>

          {product.es_perecedero && (
            <>
              <Separator />
              <div className="bg-orange-accent/10 border border-orange-accent/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground mb-1 text-xs sm:text-sm">Producto Perecedero</p>
                  {product.dias_vencimiento && (
                    <p className="text-xs text-muted-foreground">
                      Días hasta vencimiento: {product.dias_vencimiento}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Sección de Lotes */}
          {product && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold">Lotes del Producto</h3>
                {onCreateLote && (
                  <Button variant="outline" size="sm" onClick={onCreateLote} className="text-xs">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Crear Lote
                  </Button>
                )}
              </div>
              
              {lotesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : lotes && lotes.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <LotesList 
                    lotes={lotes} 
                    showProductInfo={false}
                    onEdit={handleEditLote}
                    onAdjustStock={handleAdjustStock}
                  />
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay lotes registrados para este producto</p>
                  {onCreateLote && (
                    <Button variant="link" size="sm" onClick={onCreateLote} className="mt-2 text-xs">
                      Crear primer lote
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <Separator className="flex-shrink-0" />

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0">
          {!showDeleteConfirm ? (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button className="flex-1 text-xs sm:text-sm" onClick={onClose}>
                Cerrar
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="text-xs sm:text-sm">
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Eliminar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  ¿Estás seguro de que deseas eliminar este producto? Esta acción lo marcará como inactivo.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 sm:gap-3">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 text-xs sm:text-sm">
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="flex-1 text-xs sm:text-sm">
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Confirmar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Modales para gestión de lotes */}
      <EditLoteModal
        loteId={selectedLoteId}
        isOpen={isEditLoteOpen}
        onClose={() => {
          setIsEditLoteOpen(false)
          setSelectedLoteId(null)
        }}
        onSuccess={handleLoteSuccess}
      />
      
      <AdjustLoteStockModal
        loteId={selectedLoteId}
        isOpen={isAdjustStockOpen}
        onClose={() => {
          setIsAdjustStockOpen(false)
          setSelectedLoteId(null)
        }}
        onSuccess={handleLoteSuccess}
      />
    </Dialog>
  )
}
