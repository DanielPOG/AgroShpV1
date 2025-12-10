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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  Loader2, 
  AlertCircle, 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import {
  DENOMINACIONES,
  DENOMINACIONES_LABELS,
  DesgloseDenominacion,
  generarDesgloseVacio,
  calcularTotalDesglose,
  DIFERENCIA_PERMITIDA_SIN_APROBACION,
} from "@/lib/validations/arqueo-caja.schema"

interface ArqueoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesionCajaId: number
  onSuccess: () => void
}

export function ArqueoModal({ open, onOpenChange, sesionCajaId, onSuccess }: ArqueoModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [loadingEsperado, setLoadingEsperado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [desglose, setDesglose] = useState<DesgloseDenominacion[]>(generarDesgloseVacio())
  const [totalEsperado, setTotalEsperado] = useState<number>(0)
  const [observaciones, setObservaciones] = useState<string>("")

  const totalContado = calcularTotalDesglose(desglose)
  const diferencia = totalContado - totalEsperado
  const requiereAprobacion = Math.abs(diferencia) > DIFERENCIA_PERMITIDA_SIN_APROBACION

  // Cargar total esperado al abrir el modal
  useEffect(() => {
    if (open && sesionCajaId) {
      loadTotalEsperado()
    }
  }, [open, sesionCajaId])

  const loadTotalEsperado = async () => {
    setLoadingEsperado(true)
    try {
      const response = await fetch(`/api/caja/arqueos?sesion_id=${sesionCajaId}&total_esperado=true`)
      if (response.ok) {
        const data = await response.json()
        setTotalEsperado(data.total_esperado)
      }
    } catch (err) {
      console.error("Error cargando total esperado:", err)
    } finally {
      setLoadingEsperado(false)
    }
  }

  const handleCantidadChange = (denominacion: number, cantidad: string) => {
    const cantidadNum = parseInt(cantidad) || 0
    
    setDesglose(prev => prev.map(item => 
      item.denominacion === denominacion
        ? {
            ...item,
            cantidad: cantidadNum,
            total: denominacion * cantidadNum
          }
        : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (totalContado === 0) {
      setError("El total contado no puede ser 0. Ingresa las cantidades de billetes y monedas.")
      return
    }

    if (requiereAprobacion && !observaciones) {
      setError("Debes agregar observaciones explicando la diferencia encontrada.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/caja/arqueos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion_caja_id: sesionCajaId,
          total_contado: totalContado,
          total_esperado: totalEsperado,
          diferencia: diferencia,
          desglose_billetes_monedas: desglose.filter(d => d.cantidad > 0),
          observaciones: observaciones || null,
          realizado_por: session?.user?.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear arqueo")
      }

      // Limpiar formulario
      setDesglose(generarDesgloseVacio())
      setObservaciones("")
      
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Dividir denominaciones en billetes y monedas
  const billetes = desglose.filter(d => d.denominacion >= 2000)
  const monedas = desglose.filter(d => d.denominacion < 2000)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Arqueo de Caja
          </DialogTitle>
          <DialogDescription>
            Cuenta físicamente el dinero en caja e ingresa las cantidades de cada denominación.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Totales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Esperado</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEsperado ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="text-xl font-bold text-blue-600">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(totalEsperado)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Contado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(totalContado)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Diferencia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold flex items-center gap-2 ${
                  diferencia === 0 
                    ? 'text-gray-600' 
                    : diferencia > 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {diferencia > 0 && <TrendingUp className="h-5 w-5" />}
                  {diferencia < 0 && <TrendingDown className="h-5 w-5" />}
                  {diferencia === 0 && <CheckCircle2 className="h-5 w-5" />}
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                    signDisplay: "exceptZero"
                  }).format(diferencia)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert de diferencia */}
          {diferencia !== 0 && (
            <Alert variant={requiereAprobacion ? "destructive" : "default"}>
              {requiereAprobacion ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Diferencia significativa detectada.</strong> Este arqueo requerirá 
                    aprobación de un Supervisor o Admin antes de cerrar la sesión.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Diferencia dentro del rango permitido ($5.000). La sesión se cerrará automáticamente.
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}

          {/* Desglose de Billetes */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              💵 Billetes
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {billetes.map((item) => (
                <div key={item.denominacion} className="space-y-1">
                  <Label htmlFor={`denom-${item.denominacion}`} className="text-xs">
                    {DENOMINACIONES_LABELS[item.denominacion as keyof typeof DENOMINACIONES_LABELS]}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`denom-${item.denominacion}`}
                      type="number"
                      min="0"
                      value={item.cantidad || ""}
                      onChange={(e) => handleCantidadChange(item.denominacion, e.target.value)}
                      placeholder="0"
                      className="w-20"
                    />
                    <div className="flex-1 flex items-center text-sm text-muted-foreground">
                      = {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                      }).format(item.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Desglose de Monedas */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              🪙 Monedas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {monedas.map((item) => (
                <div key={item.denominacion} className="space-y-1">
                  <Label htmlFor={`denom-${item.denominacion}`} className="text-xs">
                    {DENOMINACIONES_LABELS[item.denominacion as keyof typeof DENOMINACIONES_LABELS]}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`denom-${item.denominacion}`}
                      type="number"
                      min="0"
                      value={item.cantidad || ""}
                      onChange={(e) => handleCantidadChange(item.denominacion, e.target.value)}
                      placeholder="0"
                      className="w-20"
                    />
                    <div className="flex-1 flex items-center text-sm text-muted-foreground">
                      = {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                      }).format(item.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">
              Observaciones {requiereAprobacion && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={
                requiereAprobacion 
                  ? "Explica la diferencia encontrada (requerido)"
                  : "Notas adicionales sobre el arqueo (opcional)"
              }
              rows={3}
              maxLength={1000}
              required={requiereAprobacion}
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
            <Button type="submit" disabled={loading || loadingEsperado}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {requiereAprobacion ? "Registrar Arqueo (Requiere Aprobación)" : "Completar Arqueo y Cerrar Sesión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
