"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Loader2, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface CloseCashSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  sessionId: number
  efectivoEsperado: number
}

const BILLETES = [
  { denominacion: 100000, label: "$100,000" },
  { denominacion: 50000, label: "$50,000" },
  { denominacion: 20000, label: "$20,000" },
  { denominacion: 10000, label: "$10,000" },
  { denominacion: 5000, label: "$5,000" },
  { denominacion: 2000, label: "$2,000" },
  { denominacion: 1000, label: "$1,000" },
]

const MONEDAS = [
  { denominacion: 1000, label: "$1,000" },
  { denominacion: 500, label: "$500" },
  { denominacion: 200, label: "$200" },
  { denominacion: 100, label: "$100" },
  { denominacion: 50, label: "$50" },
]

export function CloseCashSessionModal({
  open,
  onOpenChange,
  onSuccess,
  sessionId,
  efectivoEsperado,
}: CloseCashSessionModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [billetes, setBilletes] = useState<Record<string, number>>({
    billetes_100000: 0,
    billetes_50000: 0,
    billetes_20000: 0,
    billetes_10000: 0,
    billetes_5000: 0,
    billetes_2000: 0,
    billetes_1000: 0,
  })

  const [monedas, setMonedas] = useState<Record<string, number>>({
    monedas_1000: 0,
    monedas_500: 0,
    monedas_200: 0,
    monedas_100: 0,
    monedas_50: 0,
  })

  const [observaciones, setObservaciones] = useState("")

  // Calcular total contado
  const totalContado = 
    billetes.billetes_100000 * 100000 +
    billetes.billetes_50000 * 50000 +
    billetes.billetes_20000 * 20000 +
    billetes.billetes_10000 * 10000 +
    billetes.billetes_5000 * 5000 +
    billetes.billetes_2000 * 2000 +
    billetes.billetes_1000 * 1000 +
    monedas.monedas_1000 * 1000 +
    monedas.monedas_500 * 500 +
    monedas.monedas_200 * 200 +
    monedas.monedas_100 * 100 +
    monedas.monedas_50 * 50

  const diferencia = totalContado - efectivoEsperado
  const cuadrada = Math.abs(diferencia) < 100

  const handleBilleteChange = (key: string, value: string) => {
    const num = parseInt(value) || 0
    setBilletes({ ...billetes, [key]: Math.max(0, num) })
  }

  const handleMonedaChange = (key: string, value: string) => {
    const num = parseInt(value) || 0
    setMonedas({ ...monedas, [key]: Math.max(0, num) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const response = await fetch("/api/caja/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          efectivo_contado: totalContado,
          observaciones_cierre: observaciones || undefined,
          ...billetes,
          ...monedas,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al cerrar caja")
      }

      const result = await response.json()
      
      toast({
        title: cuadrada ? "✅ Caja cuadrada" : "⚠️ Caja con diferencia",
        description: cuadrada 
          ? "La caja fue cerrada exitosamente"
          : `Diferencia: $${Math.abs(diferencia).toLocaleString("es-CO")} ${diferencia > 0 ? "sobrante" : "faltante"}`,
        variant: cuadrada ? "default" : "destructive",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al cerrar caja:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cerrar caja",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cerrar Sesión de Caja - Arqueo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resumen */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Efectivo Esperado:</span>
              <span className="font-semibold">
                ${efectivoEsperado.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Efectivo Contado:</span>
              <span className="font-semibold">
                ${totalContado.toLocaleString("es-CO")}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Diferencia:</span>
              <div className="flex items-center gap-2">
                {cuadrada ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span
                  className={cn(
                    "font-bold text-lg",
                    diferencia === 0 && "text-green-600",
                    diferencia > 0 && "text-blue-600",
                    diferencia < 0 && "text-red-600"
                  )}
                >
                  ${Math.abs(diferencia).toLocaleString("es-CO")}
                  {diferencia !== 0 && (
                    <span className="text-xs ml-1">
                      {diferencia > 0 ? "sobrante" : "faltante"}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Billetes */}
          <div>
            <h3 className="font-semibold mb-3">Billetes</h3>
            <div className="grid grid-cols-2 gap-3">
              {BILLETES.map(({ denominacion, label }) => {
                const key = `billetes_${denominacion}` as keyof typeof billetes
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key} className="text-xs">
                      {label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={key}
                        type="number"
                        min="0"
                        className="text-right"
                        value={billetes[key]}
                        onChange={(e) => handleBilleteChange(key, e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground w-20">
                        ${(billetes[key] * denominacion).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monedas */}
          <div>
            <h3 className="font-semibold mb-3">Monedas</h3>
            <div className="grid grid-cols-2 gap-3">
              {MONEDAS.map(({ denominacion, label }) => {
                const key = `monedas_${denominacion}` as keyof typeof monedas
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key} className="text-xs">
                      {label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={key}
                        type="number"
                        min="0"
                        className="text-right"
                        value={monedas[key]}
                        onChange={(e) => handleMonedaChange(key, e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground w-20">
                        ${(monedas[key] * denominacion).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones del cierre (opcional)</Label>
            <Textarea
              id="observaciones"
              placeholder="Ej: Novedades del turno, explicación de diferencia, etc."
              rows={3}
              maxLength={500}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">
              {observaciones.length}/500
            </p>
          </div>

          {/* Advertencia si hay diferencia */}
          {!cuadrada && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-900">
                    Diferencia detectada
                  </p>
                  <p className="text-xs text-yellow-700">
                    Hay una diferencia de ${Math.abs(diferencia).toLocaleString("es-CO")}{" "}
                    {diferencia > 0 ? "sobrante" : "faltante"}. 
                    {Math.abs(diferencia) >= 100 && " Se recomienda verificar antes de cerrar."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cerrando...
                </>
              ) : (
                "Cerrar Caja"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
