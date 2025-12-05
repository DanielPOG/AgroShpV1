"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowUp, ArrowDown, Package, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useProduct } from "@/hooks/use-products"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ProductHistoryModalProps {
  productId: number | null
  isOpen: boolean
  onClose: () => void
}

export function ProductHistoryModal({ productId, isOpen, onClose }: ProductHistoryModalProps) {
  const shouldFetch = isOpen && productId !== null
  const { product, isLoading, error } = useProduct(shouldFetch ? productId : null)

  if (!isOpen || !productId) return null

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Historial de Movimientos</DialogTitle>
            <DialogDescription className="text-sm">Cargando historial del producto...</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !product) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Error</DialogTitle>
            <DialogDescription className="text-sm">No se pudo cargar el historial</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "No se pudo cargar el historial del producto"}</AlertDescription>
          </Alert>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogContent>
      </Dialog>
    )
  }

  const historial = product.historial_inventario || []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl">Historial de Movimientos</DialogTitle>
          <DialogDescription className="text-sm">
            Movimientos de inventario para: <span className="font-semibold">{product.nombre}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-muted/50 rounded-lg p-2 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Stock Actual</p>
              </div>
              <p className="text-base sm:text-2xl font-bold text-foreground truncate">
                {product.stock_actual} <span className="text-xs sm:text-base">{product.unidad}</span>
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-2 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Movimientos</p>
              </div>
              <p className="text-base sm:text-2xl font-bold text-foreground">
                {historial.length}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-2 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
              </div>
              <p className="text-base sm:text-2xl font-bold text-green-600">
                {historial.filter(m => m.tipo_movimiento === 'entrada').length}
              </p>
            </div>
          </div>

          {/* Lista de movimientos */}
          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="font-semibold text-sm sm:text-base text-foreground mb-2 sm:mb-3">Historial Detallado</h4>
            {historial.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-muted/30 rounded-lg">
                <Package className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2 sm:mb-3" />
                <p className="text-sm text-muted-foreground px-4">No hay movimientos registrados para este producto</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-2 sm:pr-4">
                <div className="space-y-2 sm:space-y-3">
                  {historial.map((movimiento) => {
                    const isEntrada = movimiento.tipo_movimiento === 'entrada'
                    const isSalida = movimiento.tipo_movimiento === 'salida'
                    const isAjuste = movimiento.tipo_movimiento === 'ajuste'

                    return (
                      <div
                        key={movimiento.id}
                        className="border border-border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-4">
                          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                            {/* Icono según tipo */}
                            <div className={`mt-0.5 sm:mt-1 p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                              isEntrada ? 'bg-green-500/10' : 
                              isSalida ? 'bg-red-500/10' : 
                              'bg-blue-500/10'
                            }`}>
                              {isEntrada ? (
                                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                              ) : isSalida ? (
                                <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                              ) : (
                                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                              )}
                            </div>

                            {/* Información del movimiento */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <Badge 
                                  variant={isEntrada ? "default" : isSalida ? "destructive" : "secondary"}
                                  className="capitalize text-xs w-fit"
                                >
                                  {movimiento.tipo_movimiento}
                                </Badge>
                                {movimiento.fecha_movimiento && (
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                                    {format(new Date(movimiento.fecha_movimiento), "dd/MM/yyyy HH:mm", { locale: es })}
                                  </span>
                                )}
                              </div>

                              {movimiento.observaciones && (
                                <p className="text-xs sm:text-sm text-foreground mb-1 sm:mb-2 line-clamp-2">
                                  {movimiento.observaciones}
                                </p>
                              )}

                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                                {movimiento.usuarios && (
                                  <span className="truncate">
                                    Por: {movimiento.usuarios.nombre} {movimiento.usuarios.apellido}
                                  </span>
                                )}
                                <span className="truncate">
                                  Anterior: {movimiento.cantidad_anterior} {product.unidad}
                                </span>
                                <span className="truncate">
                                  Nueva: {movimiento.cantidad_nueva} {product.unidad}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Cantidad del movimiento */}
                          <div className="text-right flex-shrink-0">
                            <p className={`text-lg sm:text-2xl font-bold ${
                              isEntrada ? 'text-green-600' : 
                              isSalida ? 'text-red-600' : 
                              'text-blue-600'
                            }`}>
                              {isEntrada ? '+' : isSalida ? '-' : ''}
                              {Math.abs(movimiento.cantidad_movimiento)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{product.unidad}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Botón cerrar */}
          <div className="flex justify-end pt-3 sm:pt-4 border-t mt-auto">
            <Button onClick={onClose} className="w-full sm:w-auto">Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
