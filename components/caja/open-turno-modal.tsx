"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Clock, DollarSign, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TIPOS_RELEVO, TIPOS_RELEVO_LABELS } from "@/lib/validations/turno-caja.schema"

interface OpenTurnoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  sesionCajaId: number
  turnoAnteriorId?: number | null
}

export function OpenTurnoModal({
  open,
  onOpenChange,
  onSuccess,
  sesionCajaId,
  turnoAnteriorId,
}: OpenTurnoModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingEfectivo, setLoadingEfectivo] = useState(false)
  const [efectivoCalculado, setEfectivoCalculado] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    efectivo_inicial: "",
    tipo_relevo: "",
    observaciones_inicio: "",
  })

  // Función para obtener el efectivo inicial calculado
  const obtenerEfectivoInicial = async () => {
    setLoadingEfectivo(true)
    try {
      const response = await fetch(`/api/turnos/efectivo-inicial?sesion_caja_id=${sesionCajaId}`)
      if (response.ok) {
        const data = await response.json()
        const efectivo = data.efectivo_inicial || 0
        setEfectivoCalculado(Number(efectivo))
        setFormData(prev => ({ 
          ...prev, 
          efectivo_inicial: Number(efectivo).toString() 
        }))
      }
    } catch (error) {
      console.error("Error al obtener efectivo inicial:", error)
    } finally {
      setLoadingEfectivo(false)
    }
  }

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (open) {
      // Pre-seleccionar tipo de relevo basado en contexto
      const tipoRelevoDefault = turnoAnteriorId 
        ? TIPOS_RELEVO.CAMBIO_TURNO 
        : TIPOS_RELEVO.INICIO_JORNADA

      setFormData({
        efectivo_inicial: "",
        tipo_relevo: tipoRelevoDefault,
        observaciones_inicio: "",
      })

      setEfectivoCalculado(null)

      // Si es inicio de jornada, obtener efectivo calculado
      if (tipoRelevoDefault === TIPOS_RELEVO.INICIO_JORNADA) {
        obtenerEfectivoInicial()
      }
    }
  }, [open, turnoAnteriorId, sesionCajaId])

  // Detectar cambio de tipo de relevo
  useEffect(() => {
    if (formData.tipo_relevo === TIPOS_RELEVO.INICIO_JORNADA) {
      obtenerEfectivoInicial()
    } else {
      // Para otros tipos, limpiar el campo
      setEfectivoCalculado(null)
      setFormData(prev => ({ ...prev, efectivo_inicial: "" }))
    }
  }, [formData.tipo_relevo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar que el tipo de relevo esté seleccionado
    if (!formData.tipo_relevo) {
      toast({
        title: "Campos requeridos",
        description: "Debes seleccionar el tipo de relevo",
        variant: "destructive",
      })
      return
    }

    // Para inicio_jornada, el efectivo es opcional (se calcula automáticamente)
    const esInicioJornada = formData.tipo_relevo === TIPOS_RELEVO.INICIO_JORNADA
    
    // Validar efectivo solo si no es inicio de jornada o si el usuario ingresó un valor
    let efectivoInicial: number | undefined = undefined
    
    if (formData.efectivo_inicial) {
      efectivoInicial = parseFloat(formData.efectivo_inicial)
      if (isNaN(efectivoInicial) || efectivoInicial < 0) {
        toast({
          title: "Monto inválido",
          description: "El efectivo inicial debe ser un número mayor o igual a 0",
          variant: "destructive",
        })
        return
      }
    } else if (!esInicioJornada) {
      // Si NO es inicio de jornada, el efectivo es obligatorio
      toast({
        title: "Campos requeridos",
        description: "Debes ingresar el efectivo inicial para este tipo de relevo",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const requestBody: any = {
        sesion_caja_id: sesionCajaId,
        tipo_relevo: formData.tipo_relevo,
        observaciones_inicio: formData.observaciones_inicio || undefined,
        turno_anterior_id: turnoAnteriorId || undefined,
      }

      // Solo incluir efectivo_inicial si hay un valor
      if (efectivoInicial !== undefined) {
        requestBody.efectivo_inicial = efectivoInicial
      }

      const response = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al iniciar turno")
      }

      const result = await response.json()
      
      const montoMostrar = result.turno?.efectivo_inicial 
        ? Number(result.turno.efectivo_inicial).toLocaleString("es-CO")
        : "0"
      
      toast({
        title: "✅ Turno iniciado",
        description: `Turno iniciado con $${montoMostrar}`,
      })

      // Reset form
      setFormData({
        efectivo_inicial: "",
        tipo_relevo: "",
        observaciones_inicio: "",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al iniciar turno:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar el turno",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const requiereAutorizacion = formData.tipo_relevo === TIPOS_RELEVO.EMERGENCIA

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Iniciar Turno de Caja
          </DialogTitle>
          <DialogDescription>
            Ingresa el efectivo con el que inicias tu turno y selecciona el tipo de relevo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Efectivo Inicial */}
          <div className="space-y-2">
            <Label htmlFor="efectivo_inicial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Efectivo Inicial {formData.tipo_relevo !== TIPOS_RELEVO.INICIO_JORNADA && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="efectivo_inicial"
                type="number"
                step="0.01"
                min="0"
                placeholder={loadingEfectivo ? "Calculando..." : "0.00"}
                value={formData.efectivo_inicial}
                onChange={(e) => setFormData({ ...formData, efectivo_inicial: e.target.value })}
                disabled={loading || loadingEfectivo || formData.tipo_relevo === TIPOS_RELEVO.INICIO_JORNADA}
                readOnly={formData.tipo_relevo === TIPOS_RELEVO.INICIO_JORNADA}
                required={formData.tipo_relevo !== TIPOS_RELEVO.INICIO_JORNADA}
                className={formData.tipo_relevo === TIPOS_RELEVO.INICIO_JORNADA ? "bg-muted" : ""}
                autoFocus={formData.tipo_relevo !== TIPOS_RELEVO.INICIO_JORNADA}
              />
              {loadingEfectivo && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {formData.tipo_relevo === TIPOS_RELEVO.INICIO_JORNADA ? (
              <p className="text-sm text-blue-600">
                {efectivoCalculado !== null 
                  ? `✓ Efectivo calculado automáticamente: $${efectivoCalculado.toLocaleString("es-CO")}`
                  : "ℹ️ Calculando efectivo inicial..."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Monto en efectivo con el que inicias tu turno
              </p>
            )}
          </div>

          {/* Tipo de Relevo */}
          <div className="space-y-2">
            <Label htmlFor="tipo_relevo">
              Tipo de Relevo <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.tipo_relevo}
              onValueChange={(value) => setFormData({ ...formData, tipo_relevo: value })}
              disabled={loading}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de relevo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPOS_RELEVO.INICIO_JORNADA}>
                  {TIPOS_RELEVO_LABELS.inicio_jornada}
                </SelectItem>
                <SelectItem value={TIPOS_RELEVO.CAMBIO_TURNO}>
                  {TIPOS_RELEVO_LABELS.cambio_turno}
                </SelectItem>
                <SelectItem value={TIPOS_RELEVO.FIN_JORNADA}>
                  {TIPOS_RELEVO_LABELS.fin_jornada}
                </SelectItem>
                <SelectItem value={TIPOS_RELEVO.EMERGENCIA}>
                  {TIPOS_RELEVO_LABELS.emergencia}
                </SelectItem>
              </SelectContent>
            </Select>
            {turnoAnteriorId && (
              <p className="text-sm text-muted-foreground">
                Se detectó un turno anterior, asegúrate de seleccionar "Cambio de Turno"
              </p>
            )}
          </div>

          {/* Alerta de autorización requerida */}
          {requiereAutorizacion && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Los relevos de emergencia requieren autorización de un supervisor o administrador
              </AlertDescription>
            </Alert>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones_inicio">
              Observaciones (opcional)
            </Label>
            <Textarea
              id="observaciones_inicio"
              placeholder="Ej: Inicio de turno matutino, recibido efectivo del turno anterior..."
              value={formData.observaciones_inicio}
              onChange={(e) => setFormData({ ...formData, observaciones_inicio: e.target.value })}
              disabled={loading}
              rows={3}
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground">
              {formData.observaciones_inicio.length}/500 caracteres
            </p>
          </div>

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
                  Iniciando...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Iniciar Turno
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
