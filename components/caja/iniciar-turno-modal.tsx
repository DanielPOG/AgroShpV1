"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Clock } from "lucide-react"
import { TIPOS_RELEVO, TIPOS_RELEVO_LABELS } from "@/lib/validations/turno-caja.schema"

interface IniciarTurnoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesionCajaId: number
  onSuccess: () => void
}

export function IniciarTurnoModal({ 
  open, 
  onOpenChange, 
  sesionCajaId, 
  onSuccess 
}: IniciarTurnoModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tipoRelevo, setTipoRelevo] = useState<string>("")
  const [montoInicial, setMontoInicial] = useState<string>("")
  const [observaciones, setObservaciones] = useState<string>("")

  const esEmergencia = tipoRelevo === TIPOS_RELEVO.EMERGENCIA
  const isAdmin = session?.user?.role === "Admin"
  const isSupervisor = session?.user?.role === "Supervisor"
  const puedeAutorizar = isAdmin || isSupervisor

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!tipoRelevo) {
      setError("Selecciona el tipo de relevo")
      return
    }

    if (!montoInicial || parseFloat(montoInicial) < 0) {
      setError("Ingresa un monto inicial válido")
      return
    }

    if (esEmergencia && !puedeAutorizar) {
      setError("Los relevos de emergencia requieren autorización de Supervisor/Admin")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/caja/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion_caja_id: sesionCajaId,
          cajero_id: session?.user?.id,
          monto_inicial_turno: parseFloat(montoInicial),
          tipo_relevo: tipoRelevo,
          observaciones_inicio: observaciones || null,
          autorizado_por: esEmergencia ? session?.user?.id : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al iniciar turno")
      }

      // Limpiar formulario
      setTipoRelevo("")
      setMontoInicial("")
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
      setMontoInicial(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Iniciar Turno de Caja
          </DialogTitle>
          <DialogDescription>
            Inicia tu turno de trabajo en caja. Verifica el dinero disponible antes de comenzar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Relevo */}
          <div className="space-y-2">
            <Label htmlFor="tipo-relevo">Tipo de Relevo *</Label>
            <Select value={tipoRelevo} onValueChange={setTipoRelevo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de relevo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_RELEVO).map(([key, value]) => (
                  <SelectItem key={value} value={value}>
                    {TIPOS_RELEVO_LABELS[value as keyof typeof TIPOS_RELEVO_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alert Emergencia */}
          {esEmergencia && (
            <Alert variant={puedeAutorizar ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {puedeAutorizar
                  ? "Como Supervisor/Admin, puedes autorizar este relevo de emergencia."
                  : "Los relevos de emergencia requieren autorización de un Supervisor o Admin."}
              </AlertDescription>
            </Alert>
          )}

          {/* Monto Inicial */}
          <div className="space-y-2">
            <Label htmlFor="monto-inicial">Monto Inicial del Turno *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="monto-inicial"
                type="text"
                value={montoInicial}
                onChange={(e) => handleMontoChange(e.target.value)}
                placeholder="0"
                className="pl-7"
                required
              />
            </div>
            {montoInicial && (
              <p className="text-sm text-muted-foreground">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                }).format(parseFloat(montoInicial))}
              </p>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre el inicio del turno"
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Turno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
