"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useLoteMutations } from "@/hooks/use-lote-mutations"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ReactivateLoteModalProps {
  loteId: number | null
  loteCodigo: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ReactivateLoteModal({ 
  loteId, 
  loteCodigo, 
  isOpen, 
  onClose, 
  onSuccess 
}: ReactivateLoteModalProps) {
  const { toast } = useToast()
  const { reactivarLote, isDeleting } = useLoteMutations()
  
  const [motivo, setMotivo] = useState("")

  const handleConfirm = async () => {
    if (!loteId) return

    try {
      const result = await reactivarLote(loteId, motivo || undefined)

      toast({
        title: "Lote reactivado",
        description: result.message || `El lote ${loteCodigo} ha sido reactivado exitosamente`,
      })

      onSuccess()
      onClose()
      setMotivo("")
    } catch (error) {
      console.error('Error reactivating lote:', error)
      toast({
        title: "Error al reactivar lote",
        description: error instanceof Error ? error.message : "No se pudo reactivar el lote",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setMotivo("")
    onClose()
  }

  if (!isOpen || !loteId) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Reactivar Lote
          </DialogTitle>
          <DialogDescription>
            Lote: <strong>{loteCodigo}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <strong>¿Qué hace esta acción?</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Cambia el estado de <strong>retirado</strong> a <strong>disponible</strong></li>
                <li>• El lote vuelve a estar disponible para ventas</li>
                <li>• El stock se incrementa automáticamente</li>
                <li>• Se registra en auditoría</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert variant="default" className="bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs text-orange-800">
              <strong>Nota importante:</strong> Solo se pueden reactivar lotes retirados que NO estén vencidos por fecha.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm">
              Motivo de reactivación <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="motivo"
              placeholder="Ej: Error al retirar, producto en buen estado, corrección de inventario..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reactivando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Reactivar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
