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
import { useProduct, useProductMutations } from "@/hooks/use-products"
import { useLotesByProducto } from "@/hooks/use-lotes"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { LotesList } from "./lotes-list"
import { EditLoteModal } from "./edit-lote-modal"
import { AdjustLoteStockModal } from "./adjust-lote-stock-modal"
import { RetireLoteModal } from "./retire-lote-modal"
import { ReactivateLoteModal } from "./reactivate-lote-modal"
import { LoteDetailModal } from "./lote-detail-modal"
import { DeactivateProductModal } from "./deactivate-product-modal"

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
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null)
  const [selectedLoteCodigo, setSelectedLoteCodigo] = useState<string>("")
  const [isEditLoteOpen, setIsEditLoteOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)
  const [isRetireLoteOpen, setIsRetireLoteOpen] = useState(false)
  const [isReactivateLoteOpen, setIsReactivateLoteOpen] = useState(false)
  const [isLoteDetailOpen, setIsLoteDetailOpen] = useState(false)
  
  // Solo llamar al hook si hay un productId válido
  const shouldFetch = isOpen && productId !== null
  const { product, isLoading, error, refetch } = useProduct(shouldFetch ? productId : null)
  const { lotes, estadisticas, isLoading: lotesLoading, refetch: refetchLotes } = useLotesByProducto(shouldFetch ? productId : null)
  const { deleteProduct, reactivateProduct, isDeleting, isUpdating } = useProductMutations()

  // Handlers para lotes
  const handleEditLote = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsEditLoteOpen(true)
  }

  const handleAdjustStock = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsAdjustStockOpen(true)
  }

  const handleRetireLote = (loteId: number, codigo: string) => {
    setSelectedLoteId(loteId)
    setSelectedLoteCodigo(codigo)
    setIsRetireLoteOpen(true)
  }
  const handleReactivateLote = (loteId: number, codigo: string) => {
    setSelectedLoteId(loteId)
    setSelectedLoteCodigo(codigo)
    setIsReactivateLoteOpen(true)
  }

  const handleViewLoteDetail = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsLoteDetailOpen(true)
  }

  const handleLoteSuccess = async () => {
    // Actualizar datos del modal
    await Promise.all([refetch(), refetchLotes()])
    // Notificar al padre para que actualice la lista (sin timeout)
    onUpdate()
  }

  const handleDeactivateSuccess = () => {
    refetch()
    refetchLotes()
    onDelete()
  }

  const handleReactivate = async () => {
    if (!productId) return

    try {
      await reactivateProduct(productId)
      toast({
        title: "Producto reactivado",
        description: "El producto ha sido reactivado exitosamente",
      })
      refetch()
      refetchLotes()
      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo reactivar el producto",
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
    // Convertir a números para asegurar comparaciones correctas
    const stockActual = Number(product.stock_actual)
    const stockMinimo = Number(product.stock_minimo)
    const stockMaximo = product.stock_maximo ? Number(product.stock_maximo) : null
    
    // 1. Agotado: stock_actual = 0
    if (stockActual === 0) {
      return {
        label: "Agotado",
        icon: <AlertCircle className="h-4 w-4" />,
        className: "bg-destructive text-destructive-foreground",
      }
    }
    
    // 2. Sobre Exceso: stock_actual >= stock_maximo (si existe)
    if (stockMaximo !== null && stockActual >= stockMaximo) {
      return {
        label: "Sobre Exceso",
        icon: <AlertCircle className="h-4 w-4" />,
        className: "bg-purple-500 text-white",
      }
    }
    
    // 3. Bajo Stock: 0 < stock_actual < stock_minimo
    if (stockActual < stockMinimo) {
      return {
        label: "Bajo Stock",
        icon: <AlertCircle className="h-4 w-4" />,
        className: "bg-orange-accent text-white",
      }
    }
    
    // 4. Disponible: stock_minimo <= stock_actual < stock_maximo (o sin máximo)
    return {
      label: "Disponible",
      icon: <CheckCircle className="h-4 w-4" />,
      className: "bg-primary text-primary-foreground",
    }
  }

  const stockStatus = getStockStatus()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl">Detalles del Producto</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Información completa y gestión del inventario</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-3 sm:space-y-4">{/* Product Image */}
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
              
              {/* Estadísticas de lotes - Grid responsivo */}
              {estadisticas && estadisticas.total > 0 && (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {/* Total y Disponibles - Siempre visibles */}
                  <div className="bg-muted/30 rounded-lg p-1.5 sm:p-2 text-center">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                    <p className="text-base sm:text-lg font-bold">{estadisticas.total}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-1.5 sm:p-2 text-center border border-green-200 dark:border-green-800">
                    <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-300">Disponibles</p>
                    <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-300">{estadisticas.disponibles}</p>
                  </div>
                  
                  {/* Stock total - Ocupa 2 columnas en móvil */}
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-1.5 sm:p-2 text-center border border-blue-200 dark:border-blue-800 col-span-2">
                    <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">Stock en Lotes</p>
                    <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">{estadisticas.cantidad_total} {product.unidad}</p>
                  </div>
                  
                  {/* Próximos a vencer y Vencidos - Solo si existen */}
                  {estadisticas.proximos_vencer > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-1.5 sm:p-2 text-center border border-orange-200 dark:border-orange-800">
                      <p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-300">Próximos</p>
                      <p className="text-base sm:text-lg font-bold text-orange-700 dark:text-orange-300">{estadisticas.proximos_vencer}</p>
                    </div>
                  )}
                  {estadisticas.vencidos > 0 && (
                    <div className="bg-destructive/10 rounded-lg p-1.5 sm:p-2 text-center border border-destructive/30">
                      <p className="text-[10px] sm:text-xs text-destructive">Vencidos</p>
                      <p className="text-base sm:text-lg font-bold text-destructive">{estadisticas.vencidos}</p>
                    </div>
                  )}
                </div>
              )}
              
              {lotesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : lotes && lotes.length > 0 ? (
                <div className="space-y-2">
                  {/* Contador de lotes */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>{lotes.length} lote{lotes.length !== 1 ? 's' : ''} encontrado{lotes.length !== 1 ? 's' : ''}</span>
                  </div>
                  
                  {/* Lista de lotes con scroll - Altura adaptable según cantidad */}
                  <div className={`overflow-y-auto pr-1 border rounded-lg ${
                    lotes.length <= 3 ? 'max-h-48' : lotes.length <= 5 ? 'max-h-64' : 'max-h-80'
                  }`}>
                    <LotesList 
                      lotes={lotes} 
                      showProductInfo={false}
                      onEdit={handleEditLote}
                      onAdjustStock={handleAdjustStock}
                      onRetire={handleRetireLote}
                      onReactivate={handleReactivateLote}
                      onViewDetail={handleViewLoteDetail}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground border rounded-lg bg-muted/20">
                  <Package className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs sm:text-sm font-medium mb-1">No hay lotes registrados</p>
                  {onCreateLote && (
                    <Button variant="link" size="sm" onClick={onCreateLote} className="mt-1 text-xs">
                      + Crear primer lote
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
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button className="flex-1 text-xs sm:text-sm" onClick={onClose}>
              Cerrar
            </Button>
            {product.activo ? (
              <Button variant="destructive" onClick={() => setShowDeactivateModal(true)} className="text-xs sm:text-sm" disabled={isDeleting}>
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Desactivar
              </Button>
            ) : (
              <Button variant="default" onClick={handleReactivate} className="text-xs sm:text-sm bg-green-600 hover:bg-green-700" disabled={isUpdating}>
                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Reactivar
              </Button>
            )}
          </div>
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

      <RetireLoteModal
        loteId={selectedLoteId}
        loteCodigo={selectedLoteCodigo}
        isOpen={isRetireLoteOpen}
        onClose={() => {
          setIsRetireLoteOpen(false)
          setSelectedLoteId(null)
          setSelectedLoteCodigo("")
        }}
        onSuccess={handleLoteSuccess}
      />

      <ReactivateLoteModal
        loteId={selectedLoteId}
        loteCodigo={selectedLoteCodigo}
        isOpen={isReactivateLoteOpen}
        onClose={() => {
          setIsReactivateLoteOpen(false)
          setSelectedLoteId(null)
          setSelectedLoteCodigo("")
        }}
        onSuccess={handleLoteSuccess}
      />

      <LoteDetailModal
        loteId={selectedLoteId}
        isOpen={isLoteDetailOpen}
        onClose={() => {
          setIsLoteDetailOpen(false)
          setSelectedLoteId(null)
        }}
      />

      <DeactivateProductModal
        productId={productId}
        productName={product?.nombre}
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onSuccess={handleDeactivateSuccess}
      />
    </Dialog>
  )
}
