"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useLote, useLotesMutations } from "@/hooks/use-lotes"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface EditLoteModalProps {
  loteId: number | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditLoteModal({ loteId, isOpen, onClose, onSuccess }: EditLoteModalProps) {
  const { toast } = useToast()
  const shouldFetch = isOpen && loteId !== null
  const { lote, isLoading, error } = useLote(shouldFetch ? loteId : null)
  const { updateLote, isUpdating } = useLotesMutations()

  const [formData, setFormData] = useState({
    codigo_lote: '',
    cantidad: '',
    fecha_produccion: '',
    fecha_vencimiento: '',
    estado: 'disponible' as 'disponible' | 'vencido' | 'retirado',
  })

  // Cargar datos del lote cuando se obtienen
  useEffect(() => {
    if (lote) {
      setFormData({
        codigo_lote: lote.codigo_lote,
        cantidad: lote.cantidad.toString(),
        fecha_produccion: new Date(lote.fecha_produccion).toISOString().split('T')[0],
        fecha_vencimiento: lote.fecha_vencimiento 
          ? new Date(lote.fecha_vencimiento).toISOString().split('T')[0] 
          : '',
        estado: lote.estado as 'disponible' | 'vencido' | 'retirado',
      })
    }
  }, [lote])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loteId) return

    try {
      await updateLote(loteId, {
        codigo_lote: formData.codigo_lote,
        cantidad: parseFloat(formData.cantidad),
        fecha_produccion: formData.fecha_produccion,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        estado: formData.estado,
      })

      toast({
        title: "Lote actualizado",
        description: "El lote ha sido actualizado correctamente",
      })

      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el lote",
        variant: "destructive",
      })
    }
  }

  if (!isOpen || !loteId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lote</DialogTitle>
          <DialogDescription>Modifica los datos del lote</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive text-sm">
            Error al cargar el lote: {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo_lote">Código de Lote</Label>
              <Input
                id="codigo_lote"
                value={formData.codigo_lote}
                onChange={(e) => setFormData({ ...formData, codigo_lote: e.target.value })}
                disabled
                className="bg-muted"
                required
              />
              <p className="text-xs text-muted-foreground">
                El código de lote no puede modificarse
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Cantidad actual en el lote
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_produccion">Fecha Producción</Label>
                <Input
                  id="fecha_produccion"
                  type="date"
                  value={formData.fecha_produccion}
                  onChange={(e) => setFormData({ ...formData, fecha_produccion: e.target.value })}
                  disabled
                  className="bg-muted"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  La fecha de producción no puede modificarse
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento">Fecha Vencimiento</Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value: 'disponible' | 'vencido' | 'retirado') =>
                  setFormData({ ...formData, estado: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="retirado">Retirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating} className="flex-1">
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
