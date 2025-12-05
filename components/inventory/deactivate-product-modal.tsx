"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Package, XCircle, Loader2, AlertTriangle } from "lucide-react"

interface LotesInfo {
  producto: {
    id: number
    nombre: string
    unidad: string
  }
  total_lotes: number
  lotes_disponibles: number
  cantidad_total: number
  lotes: Array<{
    id: number
    codigo_lote: string
    cantidad: number
    fecha_vencimiento: string | null
    unidad_productiva: {
      nombre: string
    } | null
  }>
}

interface DeactivateProductModalProps {
  productId: number | null
  productName?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeactivateProductModal({ 
  productId, 
  productName, 
  isOpen, 
  onClose, 
  onSuccess 
}: DeactivateProductModalProps) {
  const { toast } = useToast()
  const [lotesInfo, setLotesInfo] = useState<LotesInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'only-deactivate' | 'retire-lotes' | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Cargar información de lotes cuando se abre el modal
  useEffect(() => {
    if (isOpen && productId) {
      loadLotesInfo()
    } else {
      // Reset al cerrar
      setLotesInfo(null)
      setSelectedAction(null)
      setShowConfirm(false)
    }
  }, [isOpen, productId])

  const loadLotesInfo = async () => {
    if (!productId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/productos/${productId}/lotes-info`)
      if (!response.ok) {
        throw new Error('Error al obtener información de lotes')
      }
      const data = await response.json()
      setLotesInfo(data)

      // Si no hay lotes disponibles, ir directo a confirmación simple
      if (data.lotes_disponibles === 0) {
        setShowConfirm(true)
        setSelectedAction('only-deactivate')
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

  const handleSelectAction = (action: 'only-deactivate' | 'retire-lotes') => {
    setSelectedAction(action)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!productId || !selectedAction) return

    setIsDeactivating(true)
    try {
      const retireLotes = selectedAction === 'retire-lotes'
      const url = `/api/productos/${productId}?retireLotes=${retireLotes}`

      const response = await fetch(url, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al desactivar producto')
      }

      toast({
        title: "Producto desactivado",
        description: retireLotes 
          ? "Producto desactivado y lotes retirados exitosamente"
          : "Producto desactivado exitosamente",
        variant: "destructive",
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deactivating product:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo desactivar el producto",
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

  if (!isOpen || !productId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] lg:max-w-[650px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            Desactivar Producto
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {productName || 'Este producto'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            <Skeleton className="h-16 sm:h-20 w-full" />
            <Skeleton className="h-24 sm:h-32 w-full" />
          </div>
        ) : !showConfirm ? (
          // Paso 1: Selección de acción (solo si hay lotes disponibles)
          <div className="space-y-3 sm:space-y-4">
            {lotesInfo && lotesInfo.lotes_disponibles > 0 ? (
              <>
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 text-xs sm:text-sm">
                    <strong>Este producto tiene {lotesInfo.lotes_disponibles} lote{lotesInfo.lotes_disponibles !== 1 ? 's' : ''} disponible{lotesInfo.lotes_disponibles !== 1 ? 's' : ''}</strong>
                    <br />
                    Total en inventario: <strong>{lotesInfo.cantidad_total} {lotesInfo.producto.unidad}</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 sm:space-y-3">
                  {/* Opción 1: Solo desactivar */}
                  <button
                    onClick={() => handleSelectAction('only-deactivate')}
                    className="w-full p-3 sm:p-4 border-2 border-muted rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary">
                          Solo desactivar producto
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          El producto dejará de aparecer en el inventario activo, pero los {lotesInfo.lotes_disponibles} lote{lotesInfo.lotes_disponibles !== 1 ? 's' : ''} quedarán disponibles para continuar vendiéndose hasta agotar el stock.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1 sm:gap-2">
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            ✓ Mantiene stock disponible
                          </Badge>
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            ✓ Continúa vendiendo lotes existentes
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Opción 2: Retirar todos los lotes */}
                  <button
                    onClick={() => handleSelectAction('retire-lotes')}
                    className="w-full p-3 sm:p-4 border-2 border-muted rounded-lg hover:border-destructive hover:bg-destructive/5 transition-all text-left group"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-destructive">
                          Desactivar y retirar todos los lotes
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Desactiva el producto y cambia automáticamente el estado de todos los {lotesInfo.lotes_disponibles} lote{lotesInfo.lotes_disponibles !== 1 ? 's' : ''} disponibles a "retirado". Se descuenta del stock.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1 sm:gap-2">
                          <Badge variant="destructive" className="text-[10px] sm:text-xs">
                            ⚠️ Descuenta {lotesInfo.cantidad_total} {lotesInfo.producto.unidad}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            ✓ Registrado en auditoría
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Mostrar lista de lotes */}
                {lotesInfo.lotes.length > 0 && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-muted/30 rounded-lg">
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">Lotes afectados:</h4>
                    <div className="space-y-1 max-h-24 sm:max-h-32 overflow-y-auto">
                      {lotesInfo.lotes.map((lote) => (
                        <div key={lote.id} className="text-[10px] sm:text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 py-1">
                          <span className="font-mono font-medium">{lote.codigo_lote}</span>
                          <span className="text-muted-foreground">
                            {lote.cantidad} {lotesInfo.producto.unidad} - {lote.unidad_productiva?.nombre || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  Este producto no tiene lotes disponibles. Será desactivado sin afectar inventario.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose} className="text-xs sm:text-sm">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          // Paso 2: Confirmación
          <div className="space-y-3 sm:space-y-4">
            <Alert variant={selectedAction === 'retire-lotes' ? 'destructive' : 'default'}>
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                {selectedAction === 'retire-lotes' ? (
                  <>
                    <strong>Desactivar y retirar {lotesInfo?.lotes_disponibles || 0} lote{lotesInfo && lotesInfo.lotes_disponibles !== 1 ? 's' : ''}:</strong>
                    <br />
                    Se descontarán {lotesInfo?.cantidad_total || 0} {lotesInfo?.producto.unidad} del inventario.
                    Los lotes se marcarán como "retirados" y quedarán registrados en auditoría.
                  </>
                ) : (
                  <>
                    <strong>Solo desactivar producto:</strong>
                    <br />
                    El producto se ocultará del inventario activo pero los lotes disponibles podrán seguir vendiéndose.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <p className="text-xs sm:text-sm text-muted-foreground">
              ¿Estás seguro de que deseas continuar?
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isDeactivating}
                className="flex-1 text-xs sm:text-sm"
              >
                Atrás
              </Button>
              <Button
                variant={selectedAction === 'retire-lotes' ? 'destructive' : 'default'}
                onClick={handleConfirm}
                disabled={isDeactivating}
                className="flex-1 text-xs sm:text-sm"
              >
                {isDeactivating ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span className="hidden sm:inline">Procesando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Confirmar
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
