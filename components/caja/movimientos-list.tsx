"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  DollarSign,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Movimiento {
  id: number
  tipo_movimiento: string
  metodo_pago: string | null
  monto: number
  descripcion: string | null
  fecha_movimiento: string | null
  requiere_autorizacion: boolean | null
  autorizado_por: number | null
  usuario: {
    id: number
    nombre: string
    apellido: string
  } | null
  autorizador: {
    id: number
    nombre: string
    apellido: string
  } | null
}

interface MovimientosListProps {
  movimientos: Movimiento[]
  onUpdate: () => void
  canDelete?: boolean
  canAuthorize?: boolean
}

export function MovimientosList({ 
  movimientos, 
  onUpdate, 
  canDelete = false,
  canAuthorize = false 
}: MovimientosListProps) {
  const { toast } = useToast()
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState<number | null>(null)

  const getIconoMetodo = (metodo: string | null) => {
    switch (metodo) {
      case "efectivo":
        return <DollarSign className="h-4 w-4" />
      case "nequi":
      case "tarjeta":
      case "transferencia":
        return <CreditCard className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const handleDelete = async (id: number) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/caja/movimientos/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      toast({
        title: "✅ Movimiento eliminado",
        description: "El movimiento fue eliminado exitosamente",
      })

      onUpdate()
    } catch (error) {
      console.error("Error al eliminar:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setMovimientoAEliminar(null)
    }
  }

  const handleAutorizar = async (id: number) => {
    setIsAuthorizing(id)
    try {
      const response = await fetch(`/api/caja/movimientos/${id}`, {
        method: "PUT",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      toast({
        title: "✅ Movimiento autorizado",
        description: data.message,
      })

      onUpdate()
    } catch (error) {
      console.error("Error al autorizar:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo autorizar",
        variant: "destructive"
      })
    } finally {
      setIsAuthorizing(null)
    }
  }

  if (movimientos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay movimientos registrados</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {movimientos.map((mov) => {
        const esIngreso = mov.tipo_movimiento === "ingreso_adicional"
        const estaAutorizado = mov.autorizado_por !== null
        const requiereAutorizacion = mov.requiere_autorizacion && !estaAutorizado

        return (
          <Card key={mov.id} className={requiereAutorizacion ? "border-orange-300" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                {/* Contenido Principal */}
                <div className="flex-1 space-y-2">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    {esIngreso ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {esIngreso ? "Ingreso Adicional" : "Egreso Operativo"}
                    </span>
                    
                    {/* Badges */}
                    <div className="flex items-center gap-2 ml-auto">
                      {requiereAutorizacion && (
                        <Badge variant="outline" className="border-orange-500 text-orange-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente Autorización
                        </Badge>
                      )}
                      {estaAutorizado && (
                        <Badge variant="outline" className="border-green-500 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Autorizado
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="flex items-center gap-2">
                    {getIconoMetodo(mov.metodo_pago)}
                    <span className={`text-2xl font-bold ${esIngreso ? "text-green-600" : "text-red-600"}`}>
                      {esIngreso ? "+" : "-"}${Number(mov.monto).toLocaleString('es-CO')}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {mov.metodo_pago?.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Descripción */}
                  {mov.descripcion && (
                    <p className="text-sm text-muted-foreground">{mov.descripcion}</p>
                  )}

                  {/* Usuario y Fecha */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Por: {mov.usuario?.nombre} {mov.usuario?.apellido}
                    </span>
                    {mov.fecha_movimiento && (
                      <span>
                        {formatDistanceToNow(new Date(mov.fecha_movimiento), {
                          addSuffix: true,
                          locale: es
                        })}
                      </span>
                    )}
                  </div>

                  {/* Autorizador */}
                  {estaAutorizado && mov.autorizador && (
                    <div className="text-xs text-green-600">
                      Autorizado por: {mov.autorizador.nombre} {mov.autorizador.apellido}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 ml-4">
                  {canAuthorize && requiereAutorizacion && (
                    <Button
                      size="sm"
                      onClick={() => handleAutorizar(mov.id)}
                      disabled={isAuthorizing === mov.id}
                    >
                      {isAuthorizing === mov.id ? "Autorizando..." : "Autorizar"}
                    </Button>
                  )}
                  
                  {canDelete && !estaAutorizado && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMovimientoAEliminar(mov.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Dialog de Confirmación */}
      <AlertDialog open={movimientoAEliminar !== null} onOpenChange={() => setMovimientoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => movimientoAEliminar && handleDelete(movimientoAEliminar)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
