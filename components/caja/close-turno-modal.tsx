"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Calculator, AlertTriangle, CheckCircle2, Printer, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { calcularTotalDesglose } from "@/lib/validations/turno-caja.schema"

interface CloseTurnoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  turnoId: number
  efectivoInicial: number
  cajeroNombre: string
}

export function CloseTurnoModal({
  open,
  onOpenChange,
  onSuccess,
  turnoId,
  efectivoInicial,
  cajeroNombre,
}: CloseTurnoModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingResumen, setLoadingResumen] = useState(true)
  const [modoConteo, setModoConteo] = useState<"simple" | "desglose">("simple")
  
  const [efectivoFinal, setEfectivoFinal] = useState("")
  const [observaciones, setObservaciones] = useState("")
  
  // Estado para el resumen financiero del turno
  const [resumenTurno, setResumenTurno] = useState<{
    efectivo_esperado: number
    operaciones: {
      ventas_efectivo: number
      retiros: number
      gastos_efectivo: number
      ingresos_adicionales: number
      egresos_operativos: number
    }
  } | null>(null)
  
  const [desglose, setDesglose] = useState({
    // Billetes
    billetes_100000: 0,
    billetes_50000: 0,
    billetes_20000: 0,
    billetes_10000: 0,
    billetes_5000: 0,
    billetes_2000: 0,
    billetes_1000: 0,
    // Monedas
    monedas_1000: 0,
    monedas_500: 0,
    monedas_200: 0,
    monedas_100: 0,
    monedas_50: 0,
    total_contado: 0,
  })

  // Cargar resumen financiero del turno
  useEffect(() => {
    if (open && turnoId) {
      loadResumenTurno()
    }
  }, [open, turnoId])

  const loadResumenTurno = async () => {
    setLoadingResumen(true)
    try {
      const response = await fetch(`/api/turnos/${turnoId}/resumen`)
      if (!response.ok) throw new Error('Error al cargar resumen')
      
      const data = await response.json()
      setResumenTurno(data)
    } catch (error) {
      console.error('Error cargando resumen:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el resumen del turno",
      })
    } finally {
      setLoadingResumen(false)
    }
  }

  // Calcular total del desglose
  useEffect(() => {
    if (modoConteo === "desglose") {
      const total = calcularTotalDesglose(desglose)
      setDesglose(prev => ({ ...prev, total_contado: total }))
      setEfectivoFinal(total.toFixed(2))
    }
  }, [
    desglose.billetes_100000,
    desglose.billetes_50000,
    desglose.billetes_20000,
    desglose.billetes_10000,
    desglose.billetes_5000,
    desglose.billetes_2000,
    desglose.billetes_1000,
    desglose.monedas_1000,
    desglose.monedas_500,
    desglose.monedas_200,
    desglose.monedas_100,
    desglose.monedas_50,
    modoConteo,
  ])

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (open) {
      setEfectivoFinal("")
      setObservaciones("")
      setModoConteo("simple")
      setDesglose({
        billetes_100000: 0,
        billetes_50000: 0,
        billetes_20000: 0,
        billetes_10000: 0,
        billetes_5000: 0,
        billetes_2000: 0,
        billetes_1000: 0,
        monedas_1000: 0,
        monedas_500: 0,
        monedas_200: 0,
        monedas_100: 0,
        monedas_50: 0,
        total_contado: 0,
      })
    }
  }, [open])

  const handleDesgloseChange = (key: keyof typeof desglose, value: string) => {
    const num = parseInt(value) || 0
    setDesglose({ ...desglose, [key]: Math.max(0, num) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!efectivoFinal) {
      toast({
        title: "Campo requerido",
        description: "Debes ingresar el efectivo final contado",
        variant: "destructive",
      })
      return
    }

    const efectivoFinalNum = parseFloat(efectivoFinal)
    if (isNaN(efectivoFinalNum) || efectivoFinalNum < 0) {
      toast({
        title: "Monto inválido",
        description: "El efectivo final debe ser un número mayor o igual a 0",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/turnos/${turnoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cerrar",
          efectivo_final: efectivoFinalNum,
          desglose_efectivo: modoConteo === "desglose" ? desglose : undefined,
          observaciones_cierre: observaciones || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al cerrar turno")
      }

      const result = await response.json()
      
      toast({
        title: "✅ Turno cerrado",
        description: result.message || "El turno se cerró exitosamente",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al cerrar turno:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo cerrar el turno",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const totalContado = parseFloat(efectivoFinal) || 0
  const efectivoEsperado = resumenTurno?.efectivo_esperado || efectivoInicial
  const diferencia = totalContado - efectivoEsperado

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cerrar Turno de Caja
          </DialogTitle>
          <DialogDescription>
            Turno de: <span className="font-semibold">{cajeroNombre}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Resumen financiero del turno */}
          {loadingResumen ? (
            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Cargando resumen...</span>
            </div>
          ) : (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Efectivo inicial:</span>
                <span className="font-semibold">${efectivoInicial.toLocaleString("es-CO")}</span>
              </div>
              
              {resumenTurno && (
                <>
                  <div className="pl-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-600">+ Ventas efectivo:</span>
                      <span className="text-green-600">
                        ${resumenTurno.operaciones.ventas_efectivo.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">+ Ingresos adicionales:</span>
                      <span className="text-green-600">
                        ${resumenTurno.operaciones.ingresos_adicionales.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">- Retiros:</span>
                      <span className="text-red-600">
                        ${resumenTurno.operaciones.retiros.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">- Gastos efectivo:</span>
                      <span className="text-red-600">
                        ${resumenTurno.operaciones.gastos_efectivo.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">- Egresos operativos:</span>
                      <span className="text-red-600">
                        ${resumenTurno.operaciones.egresos_operativos.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-600">Efectivo esperado:</span>
                    <span className="font-bold text-lg text-blue-600">
                      ${efectivoEsperado.toLocaleString("es-CO")}
                    </span>
                  </div>
                </>
              )}
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Efectivo contado:</span>
                <span className="font-semibold text-lg">${totalContado.toLocaleString("es-CO")}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Diferencia:</span>
                <span className={cn(
                  "font-bold text-lg",
                  diferencia > 0 && "text-green-600",
                  diferencia < 0 && "text-red-600",
                  diferencia === 0 && "text-blue-600"
                )}>
                  {diferencia > 0 && "+"}${diferencia.toLocaleString("es-CO")}
                  {diferencia > 0 && " (sobrante)"}
                  {diferencia < 0 && " (faltante)"}
                  {diferencia === 0 && " (cuadrado)"}
                </span>
              </div>
            </div>
          )}

          {/* Modo de conteo */}
          <Tabs value={modoConteo} onValueChange={(v) => setModoConteo(v as "simple" | "desglose")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple">Conteo Simple</TabsTrigger>
              <TabsTrigger value="desglose">Desglose Detallado</TabsTrigger>
            </TabsList>

            {/* Conteo Simple */}
            <TabsContent value="simple" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="efectivo_final" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Efectivo Final Contado <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="efectivo_final"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={efectivoFinal}
                  onChange={(e) => setEfectivoFinal(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Ingresa el total de efectivo que contaste en caja
                </p>
              </div>
            </TabsContent>

            {/* Desglose Detallado */}
            <TabsContent value="desglose" className="space-y-4">
              {/* Billetes */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Billetes</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="billetes_100000" className="text-sm">$100.000</Label>
                    <Input
                      id="billetes_100000"
                      type="number"
                      min="0"
                      value={desglose.billetes_100000}
                      onChange={(e) => handleDesgloseChange("billetes_100000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billetes_50000" className="text-sm">$50.000</Label>
                    <Input
                      id="billetes_50000"
                      type="number"
                      min="0"
                      value={desglose.billetes_50000}
                      onChange={(e) => handleDesgloseChange("billetes_50000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billetes_20000" className="text-sm">$20.000</Label>
                    <Input
                      id="billetes_20000"
                      type="number"
                      min="0"
                      value={desglose.billetes_20000}
                      onChange={(e) => handleDesgloseChange("billetes_20000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billetes_10000" className="text-sm">$10.000</Label>
                    <Input
                      id="billetes_10000"
                      type="number"
                      min="0"
                      value={desglose.billetes_10000}
                      onChange={(e) => handleDesgloseChange("billetes_10000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billetes_5000" className="text-sm">$5.000</Label>
                    <Input
                      id="billetes_5000"
                      type="number"
                      min="0"
                      value={desglose.billetes_5000}
                      onChange={(e) => handleDesgloseChange("billetes_5000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billetes_2000" className="text-sm">$2.000</Label>
                    <Input
                      id="billetes_2000"
                      type="number"
                      min="0"
                      value={desglose.billetes_2000}
                      onChange={(e) => handleDesgloseChange("billetes_2000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billetes_1000" className="text-sm">$1.000</Label>
                    <Input
                      id="billetes_1000"
                      type="number"
                      min="0"
                      value={desglose.billetes_1000}
                      onChange={(e) => handleDesgloseChange("billetes_1000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Monedas */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Monedas</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="monedas_1000" className="text-sm">$1.000</Label>
                    <Input
                      id="monedas_1000"
                      type="number"
                      min="0"
                      value={desglose.monedas_1000}
                      onChange={(e) => handleDesgloseChange("monedas_1000", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monedas_500" className="text-sm">$500</Label>
                    <Input
                      id="monedas_500"
                      type="number"
                      min="0"
                      value={desglose.monedas_500}
                      onChange={(e) => handleDesgloseChange("monedas_500", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monedas_200" className="text-sm">$200</Label>
                    <Input
                      id="monedas_200"
                      type="number"
                      min="0"
                      value={desglose.monedas_200}
                      onChange={(e) => handleDesgloseChange("monedas_200", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monedas_100" className="text-sm">$100</Label>
                    <Input
                      id="monedas_100"
                      type="number"
                      min="0"
                      value={desglose.monedas_100}
                      onChange={(e) => handleDesgloseChange("monedas_100", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monedas_50" className="text-sm">$50</Label>
                    <Input
                      id="monedas_50"
                      type="number"
                      min="0"
                      value={desglose.monedas_50}
                      onChange={(e) => handleDesgloseChange("monedas_50", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total calculado:</span>
                  <span className="text-lg font-bold">${desglose.total_contado.toLocaleString("es-CO")}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">
              Observaciones (opcional)
            </Label>
            <Textarea
              id="observaciones"
              placeholder="Ej: Turno sin novedades, cierre normal..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={loading}
              rows={3}
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground">
              {observaciones.length}/500 caracteres
            </p>
          </div>

          {/* Alerta de diferencia */}
          {Math.abs(diferencia) > 0 && (
            <div className={cn(
              "flex items-start gap-2 p-3 rounded-lg",
              diferencia > 0 && "bg-green-50 border border-green-200",
              diferencia < 0 && "bg-red-50 border border-red-200"
            )}>
              {diferencia > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  diferencia > 0 ? "text-green-900" : "text-red-900"
                )}>
                  {diferencia > 0 ? "Sobrante detectado" : "Faltante detectado"}
                </p>
                <p className={cn(
                  "text-sm",
                  diferencia > 0 ? "text-green-700" : "text-red-700"
                )}>
                  {diferencia > 0 
                    ? `Hay $${Math.abs(diferencia).toLocaleString("es-CO")} más de lo esperado. Verifica el conteo.`
                    : `Faltan $${Math.abs(diferencia).toLocaleString("es-CO")}. Revisa el conteo y las operaciones.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Cerrar Turno
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
