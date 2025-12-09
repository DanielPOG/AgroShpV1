"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Package, Loader2, AlertTriangle, XCircle, CheckCircle } from "lucide-react"

interface ProductWithLotes {
  id: number
  nombre: string
  lotes_disponibles: number
  cantidad_total: number
}

interface BulkDeactivateModalProps {
  productIds: number[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BulkDeactivateModal({ 
  productIds, 
  isOpen, 
  onClose, 
  onSuccess 
}: BulkDeactivateModalProps) {
  const { toast } = useToast()
  const [productsWithLotes, setProductsWithLotes] = useState<ProductWithLotes[]>([])
  const [productsWithoutLotes, setProductsWithoutLotes] = useState<ProductWithLotes[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'retire-lotes' | 'keep-lotes' | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Cargar información de lotes de todos los productos seleccionados
  useEffect(() => {
    if (isOpen && productIds.length > 0) {
      loadAllLotesInfo()
    } else {
      // Reset al cerrar
      setProductsWithLotes([])
      setProductsWithoutLotes([])
      setSelectedAction(null)
      setShowConfirm(false)
    }
  }, [isOpen, productIds])

  const loadAllLotesInfo = async () => {
    setIsLoading(true)
    try {
      // Consultar información de lotes para cada producto
      const promises = productIds.map(async (productId) => {
        try {
          const response = await fetch(`/api/productos/${productId}/lotes-info`)
          if (!response.ok) return null
          const data = await response.json()
          return {
            id: data.producto.id,
            nombre: data.producto.nombre,
            lotes_disponibles: data.lotes_disponibles,
            cantidad_total: data.cantidad_total
          }
        } catch (error) {
          console.error(`Error loading lotes for product ${productId}:`, error)
          return null
        }
      })

      const results = await Promise.all(promises)
      const validResults = results.filter((r): r is ProductWithLotes => r !== null)

      // Separar productos con y sin lotes disponibles
      const withLotes = validResults.filter(p => p.lotes_disponibles > 0)
      const withoutLotes = validResults.filter(p => p.lotes_disponibles === 0)

      setProductsWithLotes(withLotes)
      setProductsWithoutLotes(withoutLotes)

      // Si ningún producto tiene lotes, ir directo a confirmación
      if (withLotes.length === 0) {
        setShowConfirm(true)
        setSelectedAction('keep-lotes') // No importa, no hay lotes
      }
    } catch (error) {
      console.error('Error loading lotes info:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información de lotes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAction = (action: 'retire-lotes' | 'keep-lotes') => {
    setSelectedAction(action)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!selectedAction) return

    setIsDeactivating(true)
    let successCount = 0
    let errorCount = 0

    try {
      const retireLotes = selectedAction === 'retire-lotes'

      // Desactivar cada producto con o sin retiro de lotes
      const promises = productIds.map(async (productId) => {
        try {
          const url = `/api/productos/${productId}?retireLotes=${retireLotes}`
          const response = await fetch(url, {
            method: 'DELETE',
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      })

      await Promise.all(promises)

      toast({
        title: "Productos desactivados",
        description: retireLotes
          ? `${successCount} producto(s) desactivado(s) y lotes retirados${errorCount > 0 ? `, ${errorCount} fallido(s)` : ''}`
          : `${successCount} producto(s) desactivado(s)${errorCount > 0 ? `, ${errorCount} fallido(s)` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default",
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deactivating products:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error al desactivar los productos",
        variant: "destructive",
      })
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleBack = () => {
    setShowConfirm(false)
    setSelectedAction(null)
  }

  if (!isOpen || productIds.length === 0) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] lg:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Desactivar {productIds.length} producto(s)
          </DialogTitle>
          <DialogDescription>
            {!showConfirm 
              ? "Revisa la información de lotes antes de continuar"
              : "Confirma la desactivación de los productos seleccionados"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {/* Selección de Acción */}
        {!isLoading && !showConfirm && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total productos</div>
                <div className="text-2xl font-bold text-primary">{productIds.length}</div>
              </div>
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Con lotes disponibles</div>
                <div className="text-2xl font-bold text-amber-600">{productsWithLotes.length}</div>
              </div>
            </div>

            {/* Productos con lotes */}
            {productsWithLotes.length > 0 && (
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-500" />
                  <h4 className="font-semibold text-sm">Productos con lotes disponibles:</h4>
                </div>
                
                <ScrollArea className="flex-1 border rounded-lg p-3 bg-muted/30">
                  <div className="space-y-2">
                    {productsWithLotes.map((product) => (
                      <div 
                        key={product.id} 
                        className="p-2 bg-background border rounded-md text-sm flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.lotes_disponibles} lote(s) • {product.cantidad_total} unidades
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2 shrink-0">
                          {product.lotes_disponibles}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Alerta informativa */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {productsWithLotes.length > 0 ? (
                  <>
                    <strong>{productsWithLotes.length} producto(s)</strong> tienen lotes disponibles. 
                    ¿Deseas retirarlos automáticamente al desactivar?
                  </>
                ) : (
                  <>
                    Ningún producto tiene lotes disponibles. Se procederá con la desactivación normal.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {productsWithLotes.length > 0 ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleSelectAction('retire-lotes')}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Retirar lotes y desactivar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSelectAction('keep-lotes')}
                    className="flex-1"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Dejar lotes disponibles
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => handleSelectAction('keep-lotes')}
                  className="flex-1"
                >
                  Continuar
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Confirmación */}
        {!isLoading && showConfirm && (
          <div className="space-y-4 py-4">
            <Alert variant={selectedAction === 'retire-lotes' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedAction === 'retire-lotes' ? (
                  <>
                    Se desactivarán <strong>{productIds.length} producto(s)</strong> y se 
                    retirarán automáticamente <strong>todos los lotes disponibles</strong> de 
                    los {productsWithLotes.length} producto(s) que los tienen.
                  </>
                ) : (
                  <>
                    Se desactivarán <strong>{productIds.length} producto(s)</strong>. 
                    {productsWithLotes.length > 0 && (
                      <> Los lotes de {productsWithLotes.length} producto(s) quedarán disponibles 
                      y seguirán generando alertas hasta que sean retirados o venzan.</>
                    )}
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Resumen de acción */}
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-sm mb-3">Resumen de operación:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Productos a desactivar:</span>
                  <Badge variant="secondary">{productIds.length}</Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Con lotes disponibles:</span>
                  <Badge variant="outline">{productsWithLotes.length}</Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Acción sobre lotes:</span>
                  <Badge variant={selectedAction === 'retire-lotes' ? 'destructive' : 'default'}>
                    {selectedAction === 'retire-lotes' ? 'Retirar' : 'Mantener'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Botones de confirmación */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isDeactivating}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                variant={selectedAction === 'retire-lotes' ? 'destructive' : 'default'}
                onClick={handleConfirm}
                disabled={isDeactivating}
                className="flex-1"
              >
                {isDeactivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar desactivación
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
