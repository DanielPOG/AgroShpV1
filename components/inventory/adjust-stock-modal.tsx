"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TrendingUp, TrendingDown, RotateCcw, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AdjustStockModalProps {
  productId: number
  productName: string
  currentStock: number
  unit: string
  tipoMedida: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AdjustStockModal({
  productId,
  productName,
  currentStock,
  unit,
  tipoMedida,
  isOpen,
  onClose,
  onSuccess,
}: AdjustStockModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    tipo_movimiento: "entrada" as "entrada" | "salida" | "ajuste",
    cantidad: "",
    motivo: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validación básica
      const cantidad = parseFloat(formData.cantidad)
      if (isNaN(cantidad) || cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor a 0")
      }

      // Validar que unidades discretas sean enteras
      if (tipoMedida === "unidad" && !Number.isInteger(cantidad)) {
        throw new Error("Para productos en unidades, la cantidad debe ser un número entero")
      }

      if (formData.tipo_movimiento === "salida" && cantidad > currentStock) {
        throw new Error(`Stock insuficiente. Solo hay ${currentStock} ${unit} disponibles`)
      }

      if (formData.motivo.trim().length < 5) {
        throw new Error("El motivo debe tener al menos 5 caracteres")
      }

      const response = await fetch(`/api/productos/${productId}/ajustar-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo_movimiento: formData.tipo_movimiento,
          cantidad: cantidad,
          motivo: formData.motivo.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al ajustar stock")
      }

      // Calcular nuevo stock
      let nuevoStock = Number(currentStock)
      if (formData.tipo_movimiento === "entrada") {
        nuevoStock = Number(currentStock) + cantidad
      } else if (formData.tipo_movimiento === "salida") {
        nuevoStock = Number(currentStock) - cantidad
      } else {
        nuevoStock = cantidad // ajuste establece el valor absoluto
      }

      toast({
        title: "Stock Ajustado",
        description: `${productName}: ${Number(currentStock).toFixed(2)} → ${nuevoStock.toFixed(2)} ${unit}`,
      })

      // Limpiar formulario
      setFormData({
        tipo_movimiento: "entrada",
        cantidad: "",
        motivo: "",
      })

      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error adjusting stock:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getTipoMovimientoIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "salida":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "ajuste":
        return <RotateCcw className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getTipoMovimientoLabel = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "Entrada de Stock"
      case "salida":
        return "Salida de Stock"
      case "ajuste":
        return "Ajuste Manual"
      default:
        return tipo
    }
  }

  const getTipoMovimientoDescription = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "Aumenta el stock (producción, compra, devolución)"
      case "salida":
        return "Disminuye el stock (venta, consumo, merma)"
      case "ajuste":
        return "Establece un valor exacto (corrección de inventario)"
      default:
        return ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Ajustar Stock</DialogTitle>
          <DialogDescription className="text-sm">
            Modifica el inventario de <span className="font-semibold text-foreground">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-lg p-2 sm:p-3 border border-border mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Stock Actual</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">
            {currentStock} <span className="text-sm sm:text-base font-normal text-muted-foreground">{unit}</span>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Movimiento */}
          <div className="space-y-3">
            <Label>Tipo de Movimiento *</Label>
            <RadioGroup
              value={formData.tipo_movimiento}
              onValueChange={(value) =>
                setFormData({ ...formData, tipo_movimiento: value as "entrada" | "salida" | "ajuste" })
              }
            >
              {["entrada", "salida", "ajuste"].map((tipo) => (
                <div key={tipo} className="flex items-start space-x-2 sm:space-x-3 space-y-0 p-2 sm:p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value={tipo} id={tipo} className="mt-1" />
                  <div className="flex-1 cursor-pointer" onClick={() => setFormData({ ...formData, tipo_movimiento: tipo as "entrada" | "salida" | "ajuste" })}>
                    <Label htmlFor={tipo} className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-semibold cursor-pointer">
                      {getTipoMovimientoIcon(tipo)}
                      {getTipoMovimientoLabel(tipo)}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 leading-tight">
                      {getTipoMovimientoDescription(tipo)}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="cantidad">
              {formData.tipo_movimiento === "ajuste" ? "Nuevo Stock *" : "Cantidad *"}
            </Label>
            <Input
              id="cantidad"
              type="number"
              step={tipoMedida === "unidad" ? "1" : "0.01"}
              min="0"
              placeholder={formData.tipo_movimiento === "ajuste" ? "Valor exacto" : "0"}
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              required
            />
            {tipoMedida === "unidad" && (
              <p className="text-xs text-muted-foreground">
                ℹ️ Solo números enteros (este producto se vende por unidades completas)
              </p>
            )}
            {formData.tipo_movimiento !== "ajuste" && formData.cantidad && !isNaN(parseFloat(formData.cantidad)) && (
              <p className="text-xs text-muted-foreground">
                Nuevo stock:{" "}
                {formData.tipo_movimiento === "entrada"
                  ? (Number(currentStock) + parseFloat(formData.cantidad)).toFixed(2)
                  : (Number(currentStock) - parseFloat(formData.cantidad)).toFixed(2)}{" "}
                {unit}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo / Observaciones *</Label>
            <Textarea
              id="motivo"
              placeholder="Ej: Producción del día, Venta a cliente, Corrección de inventario físico"
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              rows={3}
              required
              minLength={5}
            />
            <p className="text-xs text-muted-foreground">Mínimo 5 caracteres</p>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:flex-1" disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajustando...
                </>
              ) : (
                "Confirmar Ajuste"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
