"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Package, Calendar, AlertTriangle, CheckCircle, XCircle, MoreVertical, Edit, RotateCcw, RefreshCw } from "lucide-react"

interface Lote {
  id: number
  codigo_lote: string
  cantidad: number
  fecha_produccion: Date | string
  fecha_vencimiento: Date | string | null
  estado: 'disponible' | 'vencido' | 'retirado'
  productos?: {
    nombre: string
    unidad: string
    imagen_url: string | null
  }
  unidad_productiva?: {
    nombre: string
  }
}

interface LotesListProps {
  lotes: Lote[]
  onViewDetails?: (loteId: number) => void
  onEdit?: (loteId: number) => void
  onAdjustStock?: (loteId: number) => void
  onChangeStatus?: (loteId: number) => void
  showProductInfo?: boolean
}

export function LotesList({
  lotes,
  onViewDetails,
  onEdit,
  onAdjustStock,
  onChangeStatus,
  showProductInfo = true,
}: LotesListProps) {
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Disponible
          </Badge>
        )
      case 'vencido':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Vencido
          </Badge>
        )
      case 'retirado':
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Retirado
          </Badge>
        )
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getDiasRestantes = (fechaVencimiento: Date | string | null) => {
    if (!fechaVencimiento) return null

    const fecha = new Date(fechaVencimiento)
    const hoy = new Date()
    const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

    if (diff < 0) return { dias: Math.abs(diff), tipo: 'vencido' }
    if (diff <= 3) return { dias: diff, tipo: 'critico' }
    if (diff <= 7) return { dias: diff, tipo: 'proximo' }
    return { dias: diff, tipo: 'normal' }
  }

  if (lotes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay lotes registrados</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lotes Registrados
        </CardTitle>
        <CardDescription>
          {lotes.length} lote{lotes.length !== 1 ? 's' : ''} encontrado{lotes.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                {showProductInfo && <TableHead>Producto</TableHead>}
                <TableHead>Cantidad</TableHead>
                <TableHead>Unidad Productiva</TableHead>
                <TableHead>F. Producción</TableHead>
                <TableHead>F. Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => {
                const diasRestantes = getDiasRestantes(lote.fecha_vencimiento)

                return (
                  <TableRow key={lote.id}>
                    <TableCell className="font-medium">
                      {lote.codigo_lote}
                    </TableCell>
                    {showProductInfo && (
                      <TableCell>
                        {lote.productos?.nombre || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell>
                      {lote.cantidad} {lote.productos?.unidad || ''}
                    </TableCell>
                    <TableCell>
                      {lote.unidad_productiva?.nombre || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(lote.fecha_produccion), 'dd/MM/yyyy', {
                          locale: es,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lote.fecha_vencimiento ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(lote.fecha_vencimiento),
                              'dd/MM/yyyy',
                              { locale: es }
                            )}
                          </div>
                          {diasRestantes && (
                            <div className="text-xs">
                              {diasRestantes.tipo === 'vencido' && (
                                <span className="text-destructive font-semibold">
                                  Vencido hace {diasRestantes.dias} día
                                  {diasRestantes.dias !== 1 ? 's' : ''}
                                </span>
                              )}
                              {diasRestantes.tipo === 'critico' && (
                                <span className="text-destructive font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {diasRestantes.dias} día{diasRestantes.dias !== 1 ? 's' : ''}
                                </span>
                              )}
                              {diasRestantes.tipo === 'proximo' && (
                                <span className="text-orange-500 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {diasRestantes.dias} día{diasRestantes.dias !== 1 ? 's' : ''}
                                </span>
                              )}
                              {diasRestantes.tipo === 'normal' && (
                                <span className="text-muted-foreground">
                                  {diasRestantes.dias} día{diasRestantes.dias !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No perecedero
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getEstadoBadge(lote.estado)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewDetails && (
                            <DropdownMenuItem onClick={() => onViewDetails(lote.id)}>
                              <Package className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(lote.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {onAdjustStock && lote.estado === 'disponible' && (
                            <DropdownMenuItem onClick={() => onAdjustStock(lote.id)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Ajustar Stock
                            </DropdownMenuItem>
                          )}
                          {onChangeStatus && lote.estado === 'disponible' && (
                            <DropdownMenuItem onClick={() => onChangeStatus(lote.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Cambiar Estado
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
