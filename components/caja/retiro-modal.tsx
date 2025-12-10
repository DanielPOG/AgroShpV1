"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, Banknote } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RetiroModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  sesionCajaId: number
}

export function RetiroModal({
  open,
  onClose,
  onSuccess,
  sesionCajaId
}: RetiroModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [monto, setMonto] = useState("")
  const [motivo, setMotivo] = useState("")
  const [destinoFondos, setDestinoFondos] = useState("")
  const [observaciones, setObservaciones] = useState("")

  const montoAlto = Number(monto) >= 5000000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!monto || Number(monto) <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser mayor a 0",
        variant: "destructive"
      })
      return
    }

    if (!motivo || motivo.length < 10) {
      toast({
        title: "Error",
        description: "El motivo debe tener al menos 10 caracteres",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/caja/retiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion_caja_id: sesionCajaId,
          monto: Number(monto),
          motivo,
          destino_fondos: destinoFondos || undefined,
          observaciones: observaciones || undefined,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear retiro")
      }

      toast({
        title: "✅ Retiro solicitado",
        description: data.message,
      })

      // Limpiar formulario
      setMonto("")
      setMotivo("")
      setDestinoFondos("")
      setObservaciones("")

      onSuccess()
      onClose()

    } catch (error) {
      console.error("Error al solicitar retiro:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el retiro",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setMonto("")
      setMotivo("")
      setDestinoFondos("")
      setObservaciones("")
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Solicitar Retiro de Caja
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto a Retirar (COP) *</Label>
            <Input
              id="monto"
              type="number"
              placeholder="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              min="1"
              max="50000000"
              step="1000"
              required
              disabled={isSubmitting}
            />
            {monto && (
              <p className="text-sm font-medium text-primary">
                ${Number(monto).toLocaleString('es-CO')} COP
              </p>
            )}
          </div>

          {/* Alerta para montos altos */}
          {montoAlto && (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Monto alto detectado.</strong> Este retiro requerirá doble autorización ($5.000.000+)
              </AlertDescription>
            </Alert>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del Retiro *</Label>
            <Textarea
              id="motivo"
              placeholder="Describe el motivo del retiro..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              minLength={10}
              maxLength={200}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {motivo.length}/200 caracteres (mínimo 10)
            </p>
          </div>

          {/* Destino de Fondos */}
          <div className="space-y-2">
            <Label htmlFor="destino">Destino de los Fondos</Label>
            <Input
              id="destino"
              placeholder="Ej: Consignación Banco Davivienda, Pago a proveedor..."
              value={destinoFondos}
              onChange={(e) => setDestinoFondos(e.target.value)}
              maxLength={200}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Especifica dónde irán los fondos (opcional)
            </p>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones Adicionales</Label>
            <Textarea
              id="observaciones"
              placeholder="Información adicional relevante..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {observaciones.length}/500 caracteres
            </p>
          </div>

          {/* Info importante */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este retiro requiere autorización de un Supervisor o Administrador antes de ser procesado.
            </AlertDescription>
          </Alert>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Solicitando..." : "Solicitar Retiro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
