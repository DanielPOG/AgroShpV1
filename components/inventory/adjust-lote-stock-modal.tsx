"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useLote, useLotesMutations } from "@/hooks/use-lotes"
import { useState, useEffect } from "react"
import { Loader2, Plus, Minus, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AdjustLoteStockModalProps {
  loteId: number | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AdjustLoteStockModal({ loteId, isOpen, onClose, onSuccess }: AdjustLoteStockModalProps) {
  const { toast } = useToast()
  const shouldFetch = isOpen && loteId !== null
  const { lote, isLoading, error } = useLote(shouldFetch ? loteId : null)
  const { updateLote, isUpdating } = useLotesMutations()

  const [tipoAjuste, setTipoAjuste] = useState<'aumentar' | 'disminuir'>('aumentar')
  const [cantidad, setCantidad] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // Verificar si el lote no es disponible y cerrar el modal
  useEffect(() => {
    if (lote && lote.estado !== 'disponible') {
      toast({
        title: "No se puede ajustar stock",
        description: `Este lote está "${lote.estado}". Solo se pueden ajustar lotes disponibles.`,
        variant: "destructive",
      })
      onClose()
    }
  }, [lote, onClose, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loteId || !lote) return

    const cantidadAjuste = parseFloat(cantidad)
    if (isNaN(cantidadAjuste) || cantidadAjuste <= 0) {
      toast({
        title: "Error",
        description: "Ingresa una cantidad válida",
        variant: "destructive",
      })
      return
    }

    // Convertir cantidad del lote a número para evitar concatenación
    const cantidadActual = Number(lote.cantidad)
    const nuevaCantidad = tipoAjuste === 'aumentar' 
      ? cantidadActual + cantidadAjuste
      : cantidadActual - cantidadAjuste

    if (nuevaCantidad < 0) {
      toast({
        title: "Error",
        description: "La cantidad no puede ser negativa",
        variant: "destructive",
      })
      return
    }

    try {
      await updateLote(loteId, {
        cantidad: nuevaCantidad,
        observaciones: observaciones || `Ajuste de stock: ${tipoAjuste === 'aumentar' ? '+' : '-'}${cantidadAjuste}`,
      })

      toast({
        title: "Stock ajustado",
        description: `Se ${tipoAjuste === 'aumentar' ? 'aumentó' : 'disminuyó'} ${cantidadAjuste} unidades`,
      })

      onSuccess()
      onClose()
      
      // Limpiar formulario
      setCantidad('')
      setObservaciones('')
      setTipoAjuste('aumentar')
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo ajustar el stock",
        variant: "destructive",
      })
    }
  }

  if (!isOpen || !loteId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Stock del Lote</DialogTitle>
          <DialogDescription>Aumenta o disminuye la cantidad del lote</DialogDescription>
          
          {/* Badge de advertencia si el producto está desactivado */}
          {lote && !lote.producto?.activo && (
            <Alert variant="default" className="bg-orange-50 border-orange-200 mt-3">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-xs text-orange-800">
                <strong>⚠️ Producto desactivado:</strong> Solo puedes reducir cantidades, no incrementar.
              </AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive text-sm">
            Error al cargar el lote: {error}
          </div>
        ) : lote ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info del lote */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Código:</span>
                <span className="text-sm font-medium">{lote.codigo_lote}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cantidad Actual:</span>
                <span className="text-lg font-bold">{lote.cantidad}</span>
              </div>
              {lote.producto && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Producto:</span>
                  <span className="text-sm font-medium">{lote.producto.nombre}</span>
                </div>
              )}
            </div>

            {/* Tipo de ajuste */}
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipoAjuste === 'aumentar' ? 'default' : 'outline'}
                  onClick={() => setTipoAjuste('aumentar')}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aumentar
                </Button>
                <Button
                  type="button"
                  variant={tipoAjuste === 'disminuir' ? 'destructive' : 'outline'}
                  onClick={() => setTipoAjuste('disminuir')}
                  className="w-full"
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Disminuir
                </Button>
              </div>
            </div>

            {/* Cantidad a ajustar */}
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad a {tipoAjuste}</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ej: 10"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>

            {/* Cantidad resultante */}
            {cantidad && !isNaN(parseFloat(cantidad)) && (
              <Alert>
                <AlertDescription className="flex justify-between items-center">
                  <span>Cantidad resultante:</span>
                  <span className="text-lg font-bold">
                    {tipoAjuste === 'aumentar'
                      ? Number(lote.cantidad) + parseFloat(cantidad)
                      : Number(lote.cantidad) - parseFloat(cantidad)}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Ej: Merma por producto dañado"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isUpdating} 
                className="flex-1"
                variant={tipoAjuste === 'disminuir' ? 'destructive' : 'default'}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajustando...
                  </>
                ) : (
                  `${tipoAjuste === 'aumentar' ? 'Aumentar' : 'Disminuir'} Stock`
                )}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
