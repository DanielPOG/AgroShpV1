"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Receipt,
  Trash2,
  ShoppingCart,
  Zap,
  Wrench,
  Truck,
  Users,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  Calendar,
  User,
} from "lucide-react"
import { CATEGORIAS_LABELS } from "@/lib/validations/gasto-caja.schema"

interface Gasto {
  id: number
  monto: number | string
  categoria_gasto: string
  descripcion: string
  beneficiario: string | null
  numero_factura: string | null
  comprobante_url: string | null
  observaciones: string | null
  fecha_gasto: string | Date
  autorizado_por: number | null
  autorizador: {
    nombre: string
    apellido: string
  } | null
  sesion_caja: {
    codigo_sesion: string
    caja: {
      nombre: string
      codigo: string
    }
  }
}

interface GastosListProps {
  gastos: Gasto[]
  canDelete?: boolean
  onDelete?: (id: number) => void
}

const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  insumos: ShoppingCart,
  servicios: Zap,
  mantenimiento: Wrench,
  transporte: Truck,
  nomina: Users,
  impuestos: FileText,
  otros: MoreHorizontal,
}

const CATEGORIA_COLORS: Record<string, string> = {
  insumos: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  servicios: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  mantenimiento: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  transporte: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  nomina: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  impuestos: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  otros: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

export function GastosList({ gastos, canDelete = false, onDelete }: GastosListProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  if (gastos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay gastos registrados</h3>
        <p className="text-sm text-muted-foreground">
          Los gastos registrados aparecerán aquí
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {gastos.map((gasto) => {
          const Icon = CATEGORIA_ICONS[gasto.categoria_gasto] || Receipt
          const colorClass = CATEGORIA_COLORS[gasto.categoria_gasto] || CATEGORIA_COLORS.otros
          const monto = Number(gasto.monto)

          return (
            <Card key={gasto.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Info Principal */}
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className={`rounded-full p-2.5 ${colorClass.split(' ')[0]} flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Categoría y Monto */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className={colorClass}>
                          {CATEGORIAS_LABELS[gasto.categoria_gasto as keyof typeof CATEGORIAS_LABELS]}
                        </Badge>
                        <span className="text-lg font-bold text-red-600">
                          -{new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(monto)}
                        </span>
                      </div>

                      {/* Descripción */}
                      <p className="text-sm text-foreground font-medium">
                        {gasto.descripcion}
                      </p>

                      {/* Beneficiario y Factura */}
                      {(gasto.beneficiario || gasto.numero_factura) && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {gasto.beneficiario && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{gasto.beneficiario}</span>
                            </div>
                          )}
                          {gasto.numero_factura && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>Fact. {gasto.numero_factura}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Observaciones */}
                      {gasto.observaciones && (
                        <p className="text-xs text-muted-foreground italic border-l-2 pl-2 border-muted">
                          {gasto.observaciones}
                        </p>
                      )}

                      {/* Footer Info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(gasto.fecha_gasto), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          <span>
                            {gasto.sesion_caja.caja.nombre} - {gasto.sesion_caja.codigo_sesion}
                          </span>
                        </div>

                        {gasto.autorizador && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>
                              Autorizado: {gasto.autorizador.nombre} {gasto.autorizador.apellido}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  {canDelete && onDelete && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(gasto.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El gasto será eliminado permanentemente
              y se actualizará el total de gastos de la sesión.
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
