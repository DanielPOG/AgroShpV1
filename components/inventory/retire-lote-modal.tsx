"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLoteMutations } from "@/hooks/use-lote-mutations"
import { AlertCircle, Trash2, XCircle, Loader2 } from "lucide-react"

interface RetireLoteModalProps {
  loteId: number | null
  loteCodigo?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RetireLoteModal({ loteId, loteCodigo, isOpen, onClose, onSuccess }: RetireLoteModalProps) {
  const { toast } = useToast()
  const { retirarLote, isDeleting } = useLoteMutations()
  const [action, setAction] = useState<'retire' | 'delete' | null>(null)
  const [motivo, setMotivo] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setAction(null)
      setMotivo("")
      setShowConfirm(false)
    }
  }, [isOpen])

  const handleSelectAction = (selectedAction: 'retire' | 'delete') => {
    setAction(selectedAction)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!loteId || !action) return

    try {
      const result = await retirarLote({
        loteId,
        action,
        motivo: motivo.trim() || undefined,
      })

      toast({
        title: action === 'delete' ? "Lote eliminado" : "Lote retirado",
        description: result.message,
        variant: action === 'delete' ? "destructive" : "default",
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error al procesar lote:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })

      // Si el error es porque tiene ventas, cambiar automáticamente a "retirar"
      if (errorMessage.includes('ventas asociadas') && action === 'delete') {
        setAction('retire')
        toast({
          title: "Acción cambiada",
          description: "El lote tiene ventas asociadas. Cambiando a 'Retirar' en lugar de eliminar.",
        })
      }
    }
  }

  const handleBack = () => {
    setShowConfirm(false)
    setAction(null)
  }

  if (!isOpen || !loteId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Retirar Lote
          </DialogTitle>
          <DialogDescription>
            {loteCodigo ? `Lote: ${loteCodigo}` : 'Seleccione una acción'}
          </DialogDescription>
        </DialogHeader>

        {!showConfirm ? (
          // Paso 1: Selección de acción
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Seleccione cómo desea proceder con este lote
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {/* Opción: Cambiar a Retirado */}
              <button
                onClick={() => handleSelectAction('retire')}
                className="w-full p-4 border-2 border-muted rounded-lg hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground group-hover:text-orange-600">
                      Cambiar a Retirado
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Marca el lote como retirado del inventario. Se descuenta del stock y se mantiene en el historial para auditoría.
                    </p>
                    <p className="text-xs font-medium text-orange-600 mt-2">
                      ✓ Recomendado para lotes dañados, vencidos o con problemas
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción: Eliminar Físicamente */}
              <button
                onClick={() => handleSelectAction('delete')}
                className="w-full p-4 border-2 border-muted rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <Trash2 className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground group-hover:text-red-600">
                      Eliminar Permanentemente
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Elimina el lote de la base de datos. Solo disponible si NO tiene ventas ni movimientos asociados.
                    </p>
                    <p className="text-xs font-medium text-red-600 mt-2">
                      ⚠️ Solo para lotes creados por error
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          // Paso 2: Confirmación
          <div className="space-y-4">
            <Alert variant={action === 'delete' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {action === 'delete' ? (
                  <>
                    <strong>Eliminar permanentemente:</strong> Esta acción no se puede deshacer. 
                    El lote se eliminará completamente si no tiene ventas asociadas.
                  </>
                ) : (
                  <>
                    <strong>Cambiar a retirado:</strong> El lote se marcará como retirado y se descontará del stock disponible.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="motivo">
                Motivo {action === 'retire' ? '(opcional)' : '(recomendado)'}
              </Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  action === 'delete'
                    ? 'Ej: Lote creado por error en el registro'
                    : 'Ej: Producto dañado durante transporte'
                }
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Este comentario se guardará en el historial de auditoría
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isDeleting}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                variant={action === 'delete' ? 'destructive' : 'default'}
                onClick={handleConfirm}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : action === 'delete' ? (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Retirar
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
