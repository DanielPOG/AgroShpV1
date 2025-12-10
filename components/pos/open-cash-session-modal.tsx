"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, DollarSign, Store } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Caja {
  id: number
  nombre: string
  codigo: string
  ubicacion: string | null
  tipo: string
  activa: boolean
}

interface OpenCashSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function OpenCashSessionModal({
  open,
  onOpenChange,
  onSuccess,
}: OpenCashSessionModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingCajas, setLoadingCajas] = useState(false)
  const [cajas, setCajas] = useState<Caja[]>([])
  
  const [formData, setFormData] = useState({
    caja_id: "",
    fondo_inicial: "",
    observaciones_apertura: "",
  })

  // Cargar cajas disponibles al abrir el modal
  useEffect(() => {
    if (open) {
      loadCajas()
    }
  }, [open])

  const loadCajas = async () => {
    setLoadingCajas(true)
    try {
      const response = await fetch("/api/cajas")
      if (!response.ok) throw new Error("Error al cargar cajas")
      
      const data = await response.json()
      setCajas(data.cajas || [])
    } catch (error) {
      console.error("Error al cargar cajas:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las cajas disponibles",
        variant: "destructive",
      })
    } finally {
      setLoadingCajas(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.caja_id || !formData.fondo_inicial) {
      toast({
        title: "Campos requeridos",
        description: "Debes seleccionar una caja e ingresar el fondo inicial",
        variant: "destructive",
      })
      return
    }

    const fondoInicial = parseFloat(formData.fondo_inicial)
    if (isNaN(fondoInicial) || fondoInicial < 0) {
      toast({
        title: "Monto inválido",
        description: "El fondo inicial debe ser un número mayor o igual a 0",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/caja/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caja_id: parseInt(formData.caja_id),
          fondo_inicial: fondoInicial,
          observaciones_apertura: formData.observaciones_apertura || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al abrir caja")
      }

      const session = await response.json()
      
      toast({
        title: "✅ Caja abierta",
        description: `Sesión ${session.codigo_sesion} iniciada con $${fondoInicial.toLocaleString("es-CO")}`,
      })

      // Reset form
      setFormData({
        caja_id: "",
        fondo_inicial: "",
        observaciones_apertura: "",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al abrir caja:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al abrir caja",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Abrir Sesión de Caja
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleccionar Caja */}
          <div className="space-y-2">
            <Label htmlFor="caja">
              Caja <span className="text-red-500">*</span>
            </Label>
            {loadingCajas ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Cargando cajas...
                </span>
              </div>
            ) : (
              <Select
                value={formData.caja_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, caja_id: value })
                }
              >
                <SelectTrigger id="caja">
                  <SelectValue placeholder="Selecciona una caja" />
                </SelectTrigger>
                <SelectContent>
                  {cajas.map((caja) => (
                    <SelectItem key={caja.id} value={caja.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{caja.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {caja.codigo} - {caja.ubicacion || "Sin ubicación"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Fondo Inicial */}
          <div className="space-y-2">
            <Label htmlFor="fondo_inicial">
              Fondo Inicial <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fondo_inicial"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-9"
                value={formData.fondo_inicial}
                onChange={(e) =>
                  setFormData({ ...formData, fondo_inicial: e.target.value })
                }
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Monto de efectivo con el que inicias tu turno
            </p>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              placeholder="Ej: Billetes recibidos del turno anterior, novedades, etc."
              rows={3}
              maxLength={500}
              value={formData.observaciones_apertura}
              onChange={(e) =>
                setFormData({ ...formData, observaciones_apertura: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.observaciones_apertura.length}/500
            </p>
          </div>

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
              disabled={loading || loadingCajas}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abriendo...
                </>
              ) : (
                "Abrir Caja"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
