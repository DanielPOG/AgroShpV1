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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Clock, Info } from "lucide-react"
import { TIPOS_RELEVO, TIPOS_RELEVO_LABELS } from "@/lib/validations/turno-caja.schema"

interface IniciarTurnoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesionCajaId: number
  onSuccess: () => void
}

interface UltimoTurno {
  id: number
  efectivo_final: number
  cajero: {
    nombre: string
    apellido: string
  }
}

export function IniciarTurnoModal({ 
  open, 
  onOpenChange, 
  sesionCajaId, 
  onSuccess 
}: IniciarTurnoModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [loadingUltimoTurno, setLoadingUltimoTurno] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ultimoTurno, setUltimoTurno] = useState<UltimoTurno | null>(null)

  const [tipoRelevo, setTipoRelevo] = useState<string>("")
  const [montoInicial, setMontoInicial] = useState<string>("")
  const [observaciones, setObservaciones] = useState<string>("")

  const esEmergencia = tipoRelevo === TIPOS_RELEVO.EMERGENCIA
  const isAdmin = session?.user?.role === "Admin"
  const isSupervisor = session?.user?.role === "Supervisor"
  const puedeAutorizar = isAdmin || isSupervisor
  const hayTurnoAnterior = !!ultimoTurno

  // Cargar último turno cerrado de la sesión
  useEffect(() => {
    console.error('[ MODAL ACTUALIZADO - EFECTO] open:', open, 'sesionCajaId:', sesionCajaId)
    if (open && sesionCajaId) {
      console.log('🔄 Cargando último turno para sesión:', sesionCajaId)
      loadUltimoTurno()
    } else if (!open) {
      // Resetear estado cuando se cierra el modal
      setUltimoTurno(null)
      setTipoRelevo("")
      setMontoInicial("")
      setObservaciones("")
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sesionCajaId])

  const loadUltimoTurno = async () => {
    console.log('📞 Llamando a API para último turno...')
    setLoadingUltimoTurno(true)
    try {
      const url = `/api/turnos?sesion_id=${sesionCajaId}&ultimo_cerrado=true`
      console.log('🌐 URL:', url)
      const response = await fetch(url)
      console.log('📡 Response status:', response.status, response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Último turno recibido:', data)
        if (data && data.id) {
          console.log('✅ Turno encontrado, efectivo_final:', data.efectivo_final)
          setUltimoTurno(data)
          // Prellenar el monto inicial con el efectivo final del turno anterior
          setMontoInicial(data.efectivo_final.toString())
          // Autoseleccionar "Cambio de Turno" si hay turno anterior
          setTipoRelevo(TIPOS_RELEVO.CAMBIO_TURNO)
          console.log('✅ Estado actualizado con turno anterior')
        } else {
          console.log('ℹ️ No hay turno anterior, es el primer turno')
          setUltimoTurno(null)
          setMontoInicial("")
          // Autoseleccionar "Inicio de Jornada" si es el primer turno
          setTipoRelevo(TIPOS_RELEVO.INICIO_JORNADA)
        }
      } else {
        console.error('❌ Error en response:', response.status)
      }
    } catch (error) {
      console.error('❌ Error cargando último turno:', error)
      setUltimoTurno(null)
    } finally {
      console.log('🏁 Finalizando carga, loadingUltimoTurno = false')
      setLoadingUltimoTurno(false)
    }
  }

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
      const requestBody: any = {
        sesion_caja_id: sesionCajaId,
        tipo_relevo: tipoRelevo,
        efectivo_inicial: parseFloat(montoInicial),
        observaciones: observaciones || undefined,
      }

      // Si hay turno anterior, incluir su ID
      if (ultimoTurno) {
        requestBody.turno_anterior_id = ultimoTurno.id
      }

      // Si es emergencia, incluir autorización
      if (esEmergencia && puedeAutorizar) {
        requestBody.autorizado_por = Number(session?.user?.id)
      }

      const response = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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

        {loadingUltimoTurno ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Verificando turnos anteriores...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info turno anterior */}
            {hayTurnoAnterior && ultimoTurno && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  El turno anterior de <strong>{ultimoTurno.cajero.nombre} {ultimoTurno.cajero.apellido}</strong> cerró con{" "}
                  <strong>${ultimoTurno.efectivo_final.toLocaleString("es-CO")}</strong> en efectivo.
                  Este monto se usará como base para tu turno.
                </AlertDescription>
              </Alert>
            )}

            {/* Tipo de Relevo */}
            <div className="space-y-2">
              <Label htmlFor="tipo-relevo">Tipo de Relevo *</Label>
              <Select value={tipoRelevo} onValueChange={setTipoRelevo} disabled={loadingUltimoTurno}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de relevo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_RELEVO).map(([key, value]) => {
                    // Si hay turno anterior, ocultar "Inicio de Jornada"
                    if (hayTurnoAnterior && value === TIPOS_RELEVO.INICIO_JORNADA) {
                      return null
                    }
                    return (
                      <SelectItem key={value} value={value}>
                        {TIPOS_RELEVO_LABELS[value as keyof typeof TIPOS_RELEVO_LABELS]}
                      </SelectItem>
                    )
                  })}
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
            <Label htmlFor="monto-inicial">
              {hayTurnoAnterior ? "Efectivo Inicial (del turno anterior)" : "Monto Inicial del Turno"} *
            </Label>
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
                readOnly={hayTurnoAnterior}
                disabled={hayTurnoAnterior}
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
            {hayTurnoAnterior && (
              <p className="text-xs text-muted-foreground">
                Este monto fue el efectivo contado al cerrar el turno anterior y no puede modificarse.
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
        )}
      </DialogContent>
    </Dialog>
  )
}

