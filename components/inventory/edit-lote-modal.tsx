"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useLote, useLotesMutations } from "@/hooks/use-lotes"
import { useState, useEffect } from "react"
import { Loader2, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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

  const [estado, setEstado] = useState<'disponible' | 'vencido'>('disponible')

  // Cargar estado del lote cuando se obtiene
  useEffect(() => {
    if (lote) {
      // Si el lote está retirado, no se puede editar aquí
      if (lote.estado === 'retirado') {
        toast({
          title: "Lote retirado",
          description: "Este lote está retirado y no se puede cambiar de estado. Usa la acción 'Retirar Lote' para gestionar lotes.",
          variant: "destructive",
        })
        onClose()
        return
      }
      setEstado(lote.estado === 'vencido' ? 'vencido' : 'disponible')
    }
  }, [lote, onClose, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loteId || !lote) return

    try {
      await updateLote(loteId, {
        codigo_lote: lote.codigo_lote,
        cantidad: Number(lote.cantidad),
        fecha_produccion: new Date(lote.fecha_produccion).toISOString().split('T')[0],
        fecha_vencimiento: lote.fecha_vencimiento 
          ? new Date(lote.fecha_vencimiento).toISOString().split('T')[0] 
          : null,
        estado: estado,
      })

      toast({
        title: "Estado actualizado",
        description: `El lote ahora está marcado como "${estado}"`,
      })

      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  if (!isOpen || !loteId) return null

  const estadoInfo = {
    disponible: {
      label: 'Disponible',
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'bg-green-500',
      description: 'El lote está disponible para venta y uso normal',
      badge: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
    },
    vencido: {
      label: 'Vencido',
      icon: <XCircle className="h-5 w-5" />,
      color: 'bg-destructive',
      description: 'El lote ha superado su fecha de vencimiento y no puede usarse',
      badge: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Cambiar Estado del Lote</DialogTitle>
          <DialogDescription>Actualiza el estado actual del lote en el sistema</DialogDescription>
          
          {/* Badge de advertencia si el producto está desactivado */}
          {lote && !lote.producto?.activo && (
            <Alert variant="default" className="bg-orange-50 border-orange-200 mt-3">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-xs sm:text-sm text-orange-800">
                <strong>⚠️ Producto desactivado:</strong> Este lote pertenece a un producto desactivado. 
                Solo puedes cambiar a estados no disponibles o reducir cantidades.
              </AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 pr-3">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Error al cargar el lote: {error}</AlertDescription>
            </Alert>
          ) : lote ? (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Información del lote (solo lectura) */}
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Código de Lote</p>
                    <p className="text-base sm:text-lg font-semibold truncate">{lote.codigo_lote}</p>
                  </div>
                  <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-center">
                    {lote.cantidad} {lote.producto?.unidad || 'unidades'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Producción</p>
                    <p className="text-xs sm:text-sm font-medium">
                      {format(new Date(lote.fecha_produccion), 'PPP', { locale: es })}
                    </p>
                  </div>
                  {lote.fecha_vencimiento && (
                    <div>
                      <p className="text-xs text-muted-foreground">Vencimiento</p>
                      <p className="text-xs sm:text-sm font-medium">
                        {format(new Date(lote.fecha_vencimiento), 'PPP', { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Solo puedes cambiar entre Disponible y Vencido. Para retirar el lote, usa el menú de acciones.
                  {lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < new Date() && (
                    <span className="block mt-1 text-orange-600 font-medium">
                      ⚠️ Este lote tiene fecha de vencimiento pasada. Para ponerlo disponible, primero actualiza la fecha de vencimiento.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Selector visual de estado */}
              <div className="space-y-3">
                <Label className="text-sm sm:text-base font-semibold">Selecciona el nuevo estado</Label>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {(Object.keys(estadoInfo) as Array<'disponible' | 'vencido'>).map((key) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        estado === key
                          ? 'ring-2 ring-primary shadow-lg'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setEstado(key)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`p-1.5 sm:p-2 rounded-full ${estadoInfo[key].color} text-white flex-shrink-0`}>
                            {estadoInfo[key].icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base">{estadoInfo[key].label}</h3>
                              {estado === key && (
                                <Badge variant="default" className="text-xs">Seleccionado</Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {estadoInfo[key].description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-xs sm:text-sm">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUpdating || estado === lote.estado} 
                  className="flex-1 text-xs sm:text-sm"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Estado'
                  )}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
