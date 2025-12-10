"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { cajas } from "@prisma/client"

interface CajaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  caja?: cajas | null
}

export function CajaModal({ open, onClose, onSuccess, caja }: CajaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    codigo: caja?.codigo || "",
    nombre: caja?.nombre || "",
    ubicacion: caja?.ubicacion || "",
    tipo: caja?.tipo || "secundaria",
    activa: caja?.activa ?? true,
  })

  const isEditing = !!caja

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEditing ? `/api/cajas/${caja.id}` : "/api/cajas"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar caja")
      }

      toast({
        title: isEditing ? "Caja actualizada" : "Caja creada",
        description: `La caja ${formData.nombre} ha sido ${isEditing ? "actualizada" : "creada"} exitosamente`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar caja",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      codigo: "",
      nombre: "",
      ubicacion: "",
      tipo: "secundaria",
      activa: true,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5" />
                Editar Caja
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Nueva Caja
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de la caja" : "Crea una nueva caja para el control de sesiones"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
              placeholder="CAJA-001"
              required
              disabled={loading}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">Código único de identificación (ej: CAJA-001, CAJA-SECUNDARIA-1)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Caja Principal"
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación *</Label>
            <Input
              id="ubicacion"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              placeholder="Mostrador 1"
              required
              disabled={loading}
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })} disabled={loading}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal">Principal</SelectItem>
                <SelectItem value="secundaria">Secundaria</SelectItem>
                <SelectItem value="movil">Móvil</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Principal: Caja central. Secundaria: Caja adicional. Móvil: Caja portátil
            </p>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activa"
                checked={formData.activa}
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="activa" className="text-sm font-normal cursor-pointer">
                Caja activa
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                "Actualizar"
              ) : (
                "Crear Caja"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
