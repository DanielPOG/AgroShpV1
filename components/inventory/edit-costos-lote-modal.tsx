"use client"

import { useState, useEffect } from "react"
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
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, DollarSign, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Card } from "@/components/ui/card"

interface Lote {
  id: number
  codigo_lote: string
  cantidad: number
  estado: string
}

interface Costos {
  id: number
  costo_materia_prima: number
  costo_mano_obra: number
  costo_insumos: number
  costo_energia: number
  otros_costos: number
  costo_total: number
  costo_unitario: number
  observaciones: string | null
}

interface EditCostosLoteModalProps {
  loteId: number | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditCostosLoteModal({
  loteId,
  isOpen,
  onClose,
  onSuccess,
}: EditCostosLoteModalProps) {
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lote, setLote] = useState<Lote | null>(null)
  const [existeCostos, setExisteCostos] = useState(false)

  // Estados para los costos
  const [costoMateriaPrima, setCostoMateriaPrima] = useState("")
  const [costoManoObra, setCostoManoObra] = useState("")
  const [costoInsumos, setCostoInsumos] = useState("")
  const [costoEnergia, setCostoEnergia] = useState("")
  const [otrosCostos, setOtrosCostos] = useState("")
  const [observaciones, setObservaciones] = useState("")

  // Cargar datos del lote y costos existentes
  useEffect(() => {
    if (isOpen && loteId) {
      loadCostosLote()
    }
  }, [isOpen, loteId])

  const loadCostosLote = async () => {
    if (!loteId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/lotes/${loteId}/costos`)

      if (!response.ok) {
        throw new Error('Error al cargar los costos del lote')
      }

      const data = await response.json()
      setLote(data.lote)

      if (data.costos) {
        // Cargar costos existentes
        setExisteCostos(true)
        setCostoMateriaPrima(data.costos.costo_materia_prima?.toString() || "0")
        setCostoManoObra(data.costos.costo_mano_obra?.toString() || "0")
        setCostoInsumos(data.costos.costo_insumos?.toString() || "0")
        setCostoEnergia(data.costos.costo_energia?.toString() || "0")
        setOtrosCostos(data.costos.otros_costos?.toString() || "0")
        setObservaciones(data.costos.observaciones || "")
      } else {
        // No hay costos, inicializar en 0
        setExisteCostos(false)
        setCostoMateriaPrima("0")
        setCostoManoObra("0")
        setCostoInsumos("0")
        setCostoEnergia("0")
        setOtrosCostos("0")
        setObservaciones("")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los costos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loteId || !lote) return

    // Validar que al menos un costo sea mayor a 0
    const totalCostos =
      (parseFloat(costoMateriaPrima) || 0) +
      (parseFloat(costoManoObra) || 0) +
      (parseFloat(costoInsumos) || 0) +
      (parseFloat(costoEnergia) || 0) +
      (parseFloat(otrosCostos) || 0)

    if (totalCostos <= 0) {
      toast({
        title: "Error",
        description: "Debes ingresar al menos un costo mayor a 0",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/lotes/${loteId}/costos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          costo_materia_prima: parseFloat(costoMateriaPrima) || 0,
          costo_mano_obra: parseFloat(costoManoObra) || 0,
          costo_insumos: parseFloat(costoInsumos) || 0,
          costo_energia: parseFloat(costoEnergia) || 0,
          otros_costos: parseFloat(otrosCostos) || 0,
          observaciones: observaciones.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar costos')
      }

      toast({
        title: existeCostos ? "Costos actualizados" : "Costos agregados",
        description: result.message || `Los costos del lote ${lote.codigo_lote} han sido guardados`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron guardar los costos",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setCostoMateriaPrima("0")
    setCostoManoObra("0")
    setCostoInsumos("0")
    setCostoEnergia("0")
    setOtrosCostos("0")
    setObservaciones("")
    setLote(null)
    setExisteCostos(false)
    onClose()
  }

  // Calcular totales en tiempo real
  const costoTotal =
    (parseFloat(costoMateriaPrima) || 0) +
    (parseFloat(costoManoObra) || 0) +
    (parseFloat(costoInsumos) || 0) +
    (parseFloat(costoEnergia) || 0) +
    (parseFloat(otrosCostos) || 0)

  const costoUnitario = lote && lote.cantidad > 0 ? costoTotal / lote.cantidad : 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {existeCostos ? 'Editar Costos' : 'Agregar Costos'}
              </DialogTitle>
              <DialogDescription>
                {lote ? `Lote ${lote.codigo_lote}` : 'Cargando...'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información del lote */}
            {lote && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between text-sm">
                    <span>Cantidad del lote:</span>
                    <span className="font-semibold">{lote.cantidad} unidades</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Alerta si el lote no está disponible */}
            {lote && lote.estado !== 'disponible' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este lote está en estado "{lote.estado}". No se pueden editar costos de lotes vencidos o retirados.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Campos de costos */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costo_materia_prima">
                    💵 Materia Prima
                  </Label>
                  <Input
                    id="costo_materia_prima"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costoMateriaPrima}
                    onChange={(e) => setCostoMateriaPrima(e.target.value)}
                    disabled={lote?.estado !== 'disponible'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costo_mano_obra">
                    👷 Mano de Obra
                  </Label>
                  <Input
                    id="costo_mano_obra"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costoManoObra}
                    onChange={(e) => setCostoManoObra(e.target.value)}
                    disabled={lote?.estado !== 'disponible'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costo_insumos">
                    🧪 Insumos
                  </Label>
                  <Input
                    id="costo_insumos"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costoInsumos}
                    onChange={(e) => setCostoInsumos(e.target.value)}
                    disabled={lote?.estado !== 'disponible'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costo_energia">
                    ⚡ Energía
                  </Label>
                  <Input
                    id="costo_energia"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costoEnergia}
                    onChange={(e) => setCostoEnergia(e.target.value)}
                    disabled={lote?.estado !== 'disponible'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otros_costos">
                    📦 Otros Costos
                  </Label>
                  <Input
                    id="otros_costos"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={otrosCostos}
                    onChange={(e) => setOtrosCostos(e.target.value)}
                    disabled={lote?.estado !== 'disponible'}
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observaciones">
                  📝 Observaciones (Opcional)
                </Label>
                <Textarea
                  id="observaciones"
                  placeholder="Notas adicionales sobre los costos..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={lote?.estado !== 'disponible'}
                />
                <p className="text-xs text-muted-foreground">
                  {observaciones.length}/500 caracteres
                </p>
              </div>
            </div>

            <Separator />

            {/* Resumen de costos */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Costo Total:</span>
                  <span className="text-lg font-bold text-primary">
                    ${costoTotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {lote && lote.cantidad > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Costo Unitario:</span>
                    <span className="font-semibold">
                      ${costoUnitario.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || lote?.estado !== 'disponible' || costoTotal <= 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    {existeCostos ? 'Actualizar Costos' : 'Agregar Costos'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
