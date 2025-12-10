"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Calculator,
  Trash2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  User,
  Receipt,
  Eye,
} from "lucide-react"
import { DENOMINACIONES_LABELS } from "@/lib/validations/arqueo-caja.schema"

interface Arqueo {
  id: number
  total_contado: number | string
  total_esperado: number | string
  diferencia: number | string
  desglose_billetes_monedas: string | null
  observaciones: string | null
  fecha_arqueo: string | Date
  realizado_por: number
  aprobado_por: number | null
  realizador: {
    nombre: string
    apellido: string
  }
  aprobador: {
    nombre: string
    apellido: string
  } | null
  sesion_caja: {
    codigo_sesion: string
    estado: string
    caja: {
      nombre: string
      codigo: string
    }
  }
}

interface ArqueosListProps {
  arqueos: Arqueo[]
  canApprove?: boolean
  canDelete?: boolean
  onApprove?: (id: number, observaciones: string) => void
  onDelete?: (id: number) => void
}

export function ArqueosList({ 
  arqueos, 
  canApprove = false, 
  canDelete = false,
  onApprove,
  onDelete 
}: ArqueosListProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [approveId, setApproveId] = useState<number | null>(null)
  const [observacionesAprobacion, setObservacionesAprobacion] = useState("")
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [approving, setApproving] = useState(false)

  const handleDelete = async () => {
    if (!deleteId || !onDelete) return

    setDeleting(true)
    try {
      await onDelete(deleteId)
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleApprove = async () => {
    if (!approveId || !onApprove) return

    if (observacionesAprobacion.length < 10) {
      alert("Las observaciones deben tener al menos 10 caracteres")
      return
    }

    setApproving(true)
    try {
      await onApprove(approveId, observacionesAprobacion)
      setApproveId(null)
      setObservacionesAprobacion("")
    } finally {
      setApproving(false)
    }
  }

  const arqueoDetalle = arqueos.find(a => a.id === detalleId)

  if (arqueos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay arqueos registrados</h3>
        <p className="text-sm text-muted-foreground">
          Los arqueos de caja aparecerán aquí
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {arqueos.map((arqueo) => {
          const diferencia = Number(arqueo.diferencia)
          const totalContado = Number(arqueo.total_contado)
          const totalEsperado = Number(arqueo.total_esperado)
          const requiereAprobacion = Math.abs(diferencia) > 5000
          const aprobado = !!arqueo.aprobado_por

          return (
            <Card key={arqueo.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Info Principal */}
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className={`rounded-full p-2.5 flex-shrink-0 ${
                      diferencia === 0 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : aprobado
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-orange-100 dark:bg-orange-900'
                    }`}>
                      <Calculator className={`h-5 w-5 ${
                        diferencia === 0 
                          ? 'text-green-600 dark:text-green-300' 
                          : aprobado
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-orange-600 dark:text-orange-300'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Badges de Estado */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {diferencia === 0 ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Cuadrado
                          </Badge>
                        ) : aprobado ? (
                          <Badge variant="default" className="bg-blue-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-orange-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pendiente Aprobación
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {arqueo.sesion_caja.estado === 'cerrada' ? 'Sesión Cerrada' : 'Sesión Abierta'}
                        </Badge>
                      </div>

                      {/* Totales */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Esperado</p>
                          <p className="font-semibold text-blue-600">
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            }).format(totalEsperado)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Contado</p>
                          <p className="font-semibold text-green-600">
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            }).format(totalContado)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Diferencia</p>
                          <p className={`font-bold flex items-center gap-1 ${
                            diferencia === 0 
                              ? 'text-gray-600' 
                              : diferencia > 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {diferencia > 0 && <TrendingUp className="h-3 w-3" />}
                            {diferencia < 0 && <TrendingDown className="h-3 w-3" />}
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                              signDisplay: "exceptZero"
                            }).format(diferencia)}
                          </p>
                        </div>
                      </div>

                      {/* Observaciones */}
                      {arqueo.observaciones && (
                        <p className="text-xs text-muted-foreground italic border-l-2 pl-2 border-muted line-clamp-2">
                          {arqueo.observaciones}
                        </p>
                      )}

                      {/* Footer Info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(arqueo.fecha_arqueo), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            {arqueo.realizador.nombre} {arqueo.realizador.apellido}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          <span>
                            {arqueo.sesion_caja.caja.nombre} - {arqueo.sesion_caja.codigo_sesion}
                          </span>
                        </div>

                        {arqueo.aprobador && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>
                              Aprobó: {arqueo.aprobador.nombre} {arqueo.aprobador.apellido}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetalleId(arqueo.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {canApprove && !aprobado && requiereAprobacion && onApprove && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setApproveId(arqueo.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                    )}

                    {canDelete && onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(arqueo.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Diálogo Ver Detalles */}
      <Dialog open={!!detalleId} onOpenChange={(open) => !open && setDetalleId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Arqueo</DialogTitle>
            <DialogDescription>
              Sesión: {arqueoDetalle?.sesion_caja.codigo_sesion}
            </DialogDescription>
          </DialogHeader>
          
          {arqueoDetalle && (
            <div className="space-y-4">
              {/* Desglose de billetes y monedas */}
              {arqueoDetalle.desglose_billetes_monedas && (
                <div>
                  <h4 className="font-semibold mb-2">Desglose de Billetes y Monedas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {JSON.parse(arqueoDetalle.desglose_billetes_monedas).map((item: any) => (
                      <div key={item.denominacion} className="flex justify-between border-b pb-1">
                        <span>{DENOMINACIONES_LABELS[item.denominacion as keyof typeof DENOMINACIONES_LABELS]}</span>
                        <span className="font-medium">× {item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones completas */}
              {arqueoDetalle.observaciones && (
                <div>
                  <h4 className="font-semibold mb-2">Observaciones</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {arqueoDetalle.observaciones}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo Aprobar Arqueo */}
      <Dialog open={!!approveId} onOpenChange={(open) => {
        if (!open) {
          setApproveId(null)
          setObservacionesAprobacion("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Arqueo con Diferencia</DialogTitle>
            <DialogDescription>
              Debes proporcionar una justificación para aprobar este arqueo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="obs-aprobacion">Observaciones de Aprobación *</Label>
              <Textarea
                id="obs-aprobacion"
                value={observacionesAprobacion}
                onChange={(e) => setObservacionesAprobacion(e.target.value)}
                placeholder="Explica por qué apruebas este arqueo (mínimo 10 caracteres)"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {observacionesAprobacion.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveId(null)
                setObservacionesAprobacion("")
              }}
              disabled={approving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || observacionesAprobacion.length < 10}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {approving ? "Aprobando..." : "Aprobar y Cerrar Sesión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar arqueo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El arqueo será eliminado permanentemente.
              Solo puedes eliminar arqueos de sesiones abiertas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
