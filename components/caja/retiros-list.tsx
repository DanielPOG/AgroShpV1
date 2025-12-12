"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  CheckCheck
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

interface Retiro {
  id: number
  monto: number
  motivo: string
  destino_fondos: string | null
  estado: string | null
  fecha_solicitud: string | null
  fecha_respuesta: string | null
  observaciones: string | null
  recibo_url: string | null
  solicitante: {
    id: number
    nombre: string
    apellido: string
  } | null
  autorizador: {
    id: number
    nombre: string
    apellido: string
  } | null
  sesion_caja?: {
    caja: {
      nombre: string
    }
  }
}

interface RetirosListProps {
  retiros: Retiro[]
  onUpdate: () => void
  canAuthorize?: boolean
  canComplete?: boolean
  canCancel?: boolean
}

export function RetirosList({
  retiros,
  onUpdate,
  canAuthorize = false,
  canComplete = false,
  canCancel = false
}: RetirosListProps) {
  const { toast } = useToast()
  const [retiroAEliminar, setRetiroAEliminar] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState<number | null>(null)
  const [actionType, setActionType] = useState<"autorizar" | "rechazar" | "completar" | "cancelar" | null>(null)

  const getEstadoBadge = (estado: string | null) => {
    switch (estado) {
      case "pendiente":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "autorizado":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Autorizado
          </Badge>
        )
      case "completado":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            <CheckCheck className="h-3 w-3 mr-1" />
            Completado
          </Badge>
        )
      case "rechazado":
        return (
          <Badge variant="outline" className="border-red-500 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        )
      default:
        return null
    }
  }

  const handleAction = async (id: number, action: "autorizar" | "rechazar" | "completar" | "cancelar") => {
    // ✅ Validar que el ID existe
    if (!id || isNaN(id)) {
      console.error('❌ ID de retiro inválido:', id)
      toast({
        title: "Error",
        description: "ID de retiro inválido",
        variant: "destructive"
      })
      return
    }

    console.log(`📤 Enviando acción "${action}" para retiro ID: ${id}`)

    setIsProcessing(id)
    setActionType(action)

    try {
      let response

      if (action === "cancelar") {
        response = await fetch(`/api/caja/retiros/${id}`, {
          method: "DELETE",
        })
      } else if (action === "completar") {
        response = await fetch(`/api/caja/retiros/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completar: true })
        })
      } else {
        response = await fetch(`/api/caja/retiros/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: action === "autorizar" ? "autorizado" : "rechazado" })
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      const messages = {
        autorizar: "✅ Retiro autorizado",
        rechazar: "❌ Retiro rechazado",
        completar: "✅ Retiro completado",
        cancelar: "🗑️ Retiro cancelado"
      }

      toast({
        title: messages[action],
        description: data.message,
      })

      // 🔔 Disparar evento global para refrescar panel de efectivo
      window.dispatchEvent(new CustomEvent('cash-session-updated'))

      onUpdate()
    } catch (error) {
      console.error(`Error al ${action} retiro:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `No se pudo ${action}`,
        variant: "destructive"
      })
    } finally {
      setIsProcessing(null)
      setActionType(null)
      setRetiroAEliminar(null)
    }
  }

  if (retiros.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay retiros registrados</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {retiros.map((retiro, index) => {
        // ✅ DEBUG: Verificar estructura del retiro
        if (index === 0) {
          console.log('📋 Primer retiro en lista:', {
            id: retiro.id,
            monto: retiro.monto,
            estado: retiro.estado,
            completo: retiro
          })
        }

        const esPendiente = retiro.estado === "pendiente"
        const esAutorizado = retiro.estado === "autorizado"
        const esCompletado = retiro.estado === "completado"
        const esRechazado = retiro.estado === "rechazado"

        return (
          <Card key={retiro.id} className={esPendiente ? "border-orange-300" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Contenido Principal */}
                <div className="flex-1 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Retiro de Caja</span>
                    </div>
                    {getEstadoBadge(retiro.estado)}
                  </div>

                  {/* Monto */}
                  <div className="text-3xl font-bold text-primary">
                    ${Number(retiro.monto).toLocaleString('es-CO')}
                  </div>

                  {/* Motivo */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Motivo:</p>
                    <p className="text-sm text-muted-foreground">{retiro.motivo}</p>
                  </div>

                  {/* Destino */}
                  {retiro.destino_fondos && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Destino:</p>
                      <p className="text-sm text-muted-foreground">{retiro.destino_fondos}</p>
                    </div>
                  )}

                  {/* Observaciones */}
                  {retiro.observaciones && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Observaciones:</p>
                      <p className="text-sm text-muted-foreground">{retiro.observaciones}</p>
                    </div>
                  )}

                  {/* Solicitante y Fecha */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Solicitado por: {retiro.solicitante?.nombre} {retiro.solicitante?.apellido}
                    </span>
                    {retiro.fecha_solicitud && (
                      <span>
                        {formatDistanceToNow(new Date(retiro.fecha_solicitud), {
                          addSuffix: true,
                          locale: es
                        })}
                      </span>
                    )}
                  </div>

                  {/* Caja */}
                  {retiro.sesion_caja?.caja && (
                    <div className="text-xs text-muted-foreground">
                      Caja: {retiro.sesion_caja.caja.nombre}
                    </div>
                  )}

                  {/* Autorizador */}
                  {esAutorizado && retiro.autorizador && (
                    <div className="text-xs text-blue-600">
                      Autorizado por: {retiro.autorizador.nombre} {retiro.autorizador.apellido}
                      {retiro.fecha_respuesta && (
                        <span className="ml-2">
                          {formatDistanceToNow(new Date(retiro.fecha_respuesta), {
                            addSuffix: true,
                            locale: es
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rechazado */}
                  {esRechazado && retiro.autorizador && (
                    <div className="text-xs text-red-600">
                      Rechazado por: {retiro.autorizador.nombre} {retiro.autorizador.apellido}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2">
                  {canAuthorize && esPendiente && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAction(retiro.id, "autorizar")}
                        disabled={isProcessing === retiro.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing === retiro.id && actionType === "autorizar" ? "Autorizando..." : "Autorizar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(retiro.id, "rechazar")}
                        disabled={isProcessing === retiro.id}
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        {isProcessing === retiro.id && actionType === "rechazar" ? "Rechazando..." : "Rechazar"}
                      </Button>
                    </>
                  )}

                  {canComplete && esAutorizado && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(retiro.id, "completar")}
                      disabled={isProcessing === retiro.id}
                    >
                      {isProcessing === retiro.id && actionType === "completar" ? "Completando..." : "Completar"}
                    </Button>
                  )}

                  {canCancel && esPendiente && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRetiroAEliminar(retiro.id)}
                      disabled={isProcessing === retiro.id}
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
      <AlertDialog open={retiroAEliminar !== null} onOpenChange={() => setRetiroAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar retiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El retiro será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => retiroAEliminar && handleAction(retiroAEliminar, "cancelar")}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cancelar retiro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
