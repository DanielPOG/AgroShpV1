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
import { Loader2, AlertCircle, Receipt } from "lucide-react"
import { CATEGORIAS_LABELS, MONTO_REQUIERE_AUTORIZACION_GASTO } from "@/lib/validations/gasto-caja.schema"

interface GastoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesionCajaId: number
  onSuccess: () => void
}

export function GastoModal({ open, onOpenChange, sesionCajaId, onSuccess }: GastoModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categoria, setCategoria] = useState<string>("")
  const [monto, setMonto] = useState<string>("")
  const [descripcion, setDescripcion] = useState<string>("")
  const [beneficiario, setBeneficiario] = useState<string>("")
  const [numeroFactura, setNumeroFactura] = useState<string>("")
  const [observaciones, setObservaciones] = useState<string>("")

  const requiereAutorizacion = parseFloat(monto) >= MONTO_REQUIERE_AUTORIZACION_GASTO
  const isAdmin = session?.user?.role === "Admin"
  const isSupervisor = session?.user?.role === "Supervisor"
  const canAuthorize = isAdmin || isSupervisor

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!categoria) {
      setError("Selecciona una categoría de gasto")
      return
    }

    if (!monto || parseFloat(monto) <= 0) {
      setError("Ingresa un monto válido")
      return
    }

    if (descripcion.length < 10) {
      setError("La descripción debe tener al menos 10 caracteres")
      return
    }

    // Si requiere autorización y el usuario no puede autorizar
    if (requiereAutorizacion && !canAuthorize) {
      setError("Este gasto requiere autorización de un Supervisor o Admin")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/caja/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion_caja_id: sesionCajaId,
          monto: parseFloat(monto),
          categoria_gasto: categoria,
          descripcion,
          beneficiario: beneficiario || undefined,
          numero_factura: numeroFactura || undefined,
          observaciones: observaciones || undefined,
          autorizado_por: requiereAutorizacion ? session?.user?.id : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar gasto")
      }

      // Limpiar formulario
      setCategoria("")
      setMonto("")
      setDescripcion("")
      setBeneficiario("")
      setNumeroFactura("")
      setObservaciones("")

      // 🔔 Disparar evento global para refrescar panel de efectivo
      window.dispatchEvent(new CustomEvent('cash-session-updated'))

      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMontoChange = (value: string) => {
    // Permitir solo números y punto decimal
    const regex = /^\d*\.?\d*$/
    if (regex.test(value)) {
      setMonto(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registrar Gasto de Caja
          </DialogTitle>
          <DialogDescription>
            Registra un gasto operativo de la caja. Los gastos mayores a{" "}
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(MONTO_REQUIERE_AUTORIZACION_GASTO)}{" "}
            requieren autorización.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIAS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="monto"
                type="text"
                value={monto}
                onChange={(e) => handleMontoChange(e.target.value)}
                placeholder="0"
                className="pl-7"
                required
              />
            </div>
            {monto && (
              <p className="text-sm text-muted-foreground">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                }).format(parseFloat(monto))}
              </p>
            )}
          </div>

          {/* Alert de autorización */}
          {requiereAutorizacion && (
            <Alert variant={canAuthorize ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {canAuthorize
                  ? "Este gasto será registrado con tu autorización automática."
                  : "Este monto requiere autorización de un Supervisor o Admin. Contacta con un administrador."}
              </AlertDescription>
            </Alert>
          )}

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el gasto (mínimo 10 caracteres)"
              rows={3}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {descripcion.length}/500
            </p>
          </div>

          {/* Beneficiario */}
          <div className="space-y-2">
            <Label htmlFor="beneficiario">Beneficiario (opcional)</Label>
            <Input
              id="beneficiario"
              value={beneficiario}
              onChange={(e) => setBeneficiario(e.target.value)}
              placeholder="Nombre del beneficiario o proveedor"
              maxLength={200}
            />
          </div>

          {/* Número de Factura */}
          <div className="space-y-2">
            <Label htmlFor="numeroFactura">Número de Factura (opcional)</Label>
            <Input
              id="numeroFactura"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="Ej: F-12345"
              maxLength={100}
            />
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre el gasto"
              rows={2}
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
              Registrar Gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
