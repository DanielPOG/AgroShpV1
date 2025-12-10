"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from "lucide-react"

interface FinalizarTurnoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turnoId: number
  montoInicial: number
  onSuccess: () => void
}

export function FinalizarTurnoModal({ 
  open, 
  onOpenChange, 
  turnoId,
  montoInicial,
  onSuccess 
}: FinalizarTurnoModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [loadingTotales, setLoadingTotales] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [montoFinal, setMontoFinal] = useState<string>("")
  const [observaciones, setObservaciones] = useState<string>("")
  const [totales, setTotales] = useState<any>(null)

  const totalVentas = totales?.total_ventas || 0
  const totalRetiros = totales?.total_retiros || 0
  const totalGastos = totales?.total_gastos || 0
  const montoEsperado = totales?.monto_esperado || montoInicial

  const montoFinalNum = parseFloat(montoFinal) || 0
  const diferencia = montoFinalNum - montoEsperado

  // Cargar totales del turno al abrir
  useEffect(() => {
    if (open && turnoId) {
      loadTotales()
    }
  }, [open, turnoId])

  const loadTotales = async () => {
    setLoadingTotales(true)
    try {
      const response = await fetch(`/api/caja/turnos?totales=${turnoId}`)
      if (response.ok) {
        const data = await response.json()
        setTotales(data)
      }
    } catch (err) {
      console.error("Error cargando totales:", err)
    } finally {
      setLoadingTotales(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!montoFinal || parseFloat(montoFinal) < 0) {
      setError("Ingresa un monto final válido")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/caja/turnos/${turnoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "finalizar",
          monto_final_turno: montoFinalNum,
          total_ventas_turno: totalVentas,
          total_retiros_turno: totalRetiros,
          total_gastos_turno: totalGastos,
          diferencia_turno: diferencia,
          observaciones_cierre: observaciones || null,
          proximo_cajero_id: null, // Por ahora sin relevo automático
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al finalizar turno")
      }

      // Limpiar formulario
      setMontoFinal("")
      setObservaciones("")
      
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMontoChange = (value: string) => {
    const regex = /^\d*\.?\d*$/
    if (regex.test(value)) {
      setMontoFinal(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Finalizar Turno de Caja
          </DialogTitle>
          <DialogDescription>
            Revisa los totales del turno y registra el monto final en caja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resumen de Totales */}
          {loadingTotales ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Monto Inicial</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold text-blue-600">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(montoInicial)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Ventas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold text-green-600">
                    +{new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(totalVentas)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totales?.cantidad_ventas || 0} ventas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Retiros</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold text-red-600">
                    -{new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(totalRetiros)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totales?.cantidad_retiros || 0} retiros
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Gastos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold text-red-600">
                    -{new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(totalGastos)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totales?.cantidad_gastos || 0} gastos
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Monto Esperado */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monto Esperado en Caja:</span>
                <span className="text-xl font-bold text-blue-600">
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(montoEsperado)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Monto Final */}
          <div className="space-y-2">
            <Label htmlFor="monto-final">Monto Final en Caja *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="monto-final"
                type="text"
                value={montoFinal}
                onChange={(e) => handleMontoChange(e.target.value)}
                placeholder="Cuenta el dinero en caja"
                className="pl-7"
                required
              />
            </div>
            {montoFinal && (
              <p className="text-sm text-muted-foreground">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                }).format(montoFinalNum)}
              </p>
            )}
          </div>

          {/* Diferencia */}
          {montoFinal && (
            <Card className={`border-2 ${
              diferencia === 0 
                ? 'border-green-200 dark:border-green-800' 
                : diferencia > 0 
                ? 'border-green-200 dark:border-green-800'
                : 'border-red-200 dark:border-red-800'
            }`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {diferencia > 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
                    {diferencia < 0 && <TrendingDown className="h-4 w-4 text-red-600" />}
                    {diferencia === 0 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    Diferencia:
                  </span>
                  <span className={`text-xl font-bold ${
                    diferencia === 0 
                      ? 'text-green-600' 
                      : diferencia > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                      signDisplay: "exceptZero"
                    }).format(diferencia)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones de Cierre (opcional)</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre el cierre del turno"
              rows={3}
              maxLength={500}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingTotales}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar Turno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
