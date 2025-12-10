"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, TrendingUp, TrendingDown, HelpCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MovimientosGuiaModal } from "./movimientos-guia-modal"

type TipoMovimiento = "ingreso_adicional" | "egreso_operativo"
type MetodoPago = "efectivo" | "nequi" | "tarjeta" | "transferencia"

interface MovimientoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  sesionCajaId: number
}

export function MovimientoModal({
  open,
  onClose,
  onSuccess,
  sesionCajaId
}: MovimientoModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showGuia, setShowGuia] = useState(false)
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>("ingreso_adicional")
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")

  const requiereAutorizacion = Number(monto) >= 100000

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

    if (!descripcion || descripcion.length < 5) {
      toast({
        title: "Error",
        description: "La descripción debe tener al menos 5 caracteres",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/caja/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion_caja_id: sesionCajaId,
          tipo_movimiento: tipoMovimiento,
          metodo_pago: metodoPago,
          monto: Number(monto),
          descripcion,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear movimiento")
      }

      toast({
        title: "✅ Movimiento registrado",
        description: data.message,
      })

      // Limpiar formulario
      setMonto("")
      setDescripcion("")
      setTipoMovimiento("ingreso_adicional")
      setMetodoPago("efectivo")

      onSuccess()
      onClose()

    } catch (error) {
      console.error("Error al crear movimiento:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el movimiento",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setMonto("")
      setDescripcion("")
      setTipoMovimiento("ingreso_adicional")
      setMetodoPago("efectivo")
      onClose()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Registrar Movimiento de Caja</DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowGuia(true)}
                title="Ver guía de uso"
              >
                <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-blue-600" />
              </Button>
            </div>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Movimiento */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Movimiento</Label>
            <Select value={tipoMovimiento} onValueChange={(value: TipoMovimiento) => setTipoMovimiento(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso_adicional">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Ingreso Adicional</span>
                  </div>
                </SelectItem>
                <SelectItem value="egreso_operativo">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span>Egreso Operativo</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tipoMovimiento === "ingreso_adicional" 
                ? "Ingresos por devoluciones, ajustes, etc." 
                : "Egresos por cambio, préstamos, etc."}
            </p>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label htmlFor="metodo">Método de Pago</Label>
            <Select value={metodoPago} onValueChange={(value: MetodoPago) => setMetodoPago(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="nequi">Nequi</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto (COP)</Label>
            <Input
              id="monto"
              type="number"
              placeholder="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              min="1"
              step="1"
              required
              disabled={isSubmitting}
            />
            {monto && (
              <p className="text-sm font-medium">
                ${Number(monto).toLocaleString('es-CO')} COP
              </p>
            )}
          </div>

          {/* Alerta de Autorización */}
          {requiereAutorizacion && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este movimiento requiere autorización de un Supervisor/Admin porque el monto supera $100.000 COP
              </AlertDescription>
            </Alert>
          )}

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Describe el motivo del movimiento..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              minLength={5}
              maxLength={500}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {descripcion.length}/500 caracteres
            </p>
          </div>

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
              {isSubmitting ? "Registrando..." : "Registrar Movimiento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Modal de Guía */}
    <MovimientosGuiaModal 
      open={showGuia} 
      onClose={() => setShowGuia(false)} 
    />
  </>
  )
}
