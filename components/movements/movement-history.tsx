import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, User, Package, ChevronDown, ChevronUp } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface DetalleMovimiento {
  id: number
  producto: {
    id: number
    codigo: string
    nombre: string
    unidad: string | null
  }
  lote: {
    id: number
    codigo_lote: string
  }
  cantidad: number
  unidad: string | null
}

interface Movimiento {
  id: number
  codigo_movimiento: string
  unidad_origen: {
    id: number
    codigo: string
    nombre: string
  }
  unidad_destino: {
    id: number
    codigo: string
    nombre: string
  }
  usuario: {
    id: number
    nombre: string
    apellido: string | null
  } | null
  fecha_movimiento: Date | null
  motivo: string | null
  estado: string | null
  observaciones: string | null
  detalle_movimientos: DetalleMovimiento[]
}

interface MovementHistoryProps {
  movimientos: Movimiento[]
  isLoading?: boolean
}

const statusConfig = {
  completado: { label: "Completado", variant: "default" as const },
  pendiente: { label: "Pendiente", variant: "secondary" as const },
  cancelado: { label: "Cancelado", variant: "destructive" as const },
}

export function MovementHistory({ movimientos, isLoading }: MovementHistoryProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (movimientos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay movimientos registrados</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {movimientos.map((movimiento) => {
        const statusInfo = statusConfig[movimiento.estado as keyof typeof statusConfig] || statusConfig.completado
        const isExpanded = expandedIds.has(movimiento.id)
        const totalProductos = movimiento.detalle_movimientos.length
        const nombreUsuario = movimiento.usuario 
          ? `${movimiento.usuario.nombre} ${movimiento.usuario.apellido || ''}`.trim()
          : 'Sistema'

        return (
          <Card key={movimiento.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(movimiento.id)}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm sm:text-base text-foreground">
                        {movimiento.codigo_movimiento}
                      </p>
                      <Badge variant={statusInfo.variant} className="text-[10px] sm:text-xs">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {movimiento.unidad_origen.nombre}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {movimiento.unidad_destino.nombre}
                      </Badge>
                    </div>
                    {movimiento.motivo && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {movimiento.motivo}
                      </p>
                    )}
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>

                {/* Info */}
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-4 text-xs sm:text-sm mb-3">
                  <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] sm:text-sm">
                        {movimiento.fecha_movimiento 
                          ? formatDistanceToNow(new Date(movimiento.fecha_movimiento), { 
                              addSuffix: true, 
                              locale: es 
                            })
                          : 'Fecha desconocida'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="text-[10px] sm:text-sm">{nombreUsuario}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs self-start xs:self-auto">
                    {totalProductos} producto{totalProductos !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Expandable Details */}
                <CollapsibleContent>
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Detalle del movimiento:</p>
                    <div className="space-y-2">
                      {movimiento.detalle_movimientos.map((detalle) => (
                        <div 
                          key={detalle.id} 
                          className="flex items-center justify-between p-2 bg-secondary/30 rounded-md"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {detalle.producto.nombre}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Lote: {detalle.lote.codigo_lote}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-xs sm:text-sm font-semibold">
                              {detalle.cantidad} {detalle.producto.unidad || detalle.unidad}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {movimiento.observaciones && (
                      <div className="mt-3 p-2 bg-muted/50 rounded-md">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Observaciones:</p>
                        <p className="text-xs">{movimiento.observaciones}</p>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      {movimiento.fecha_movimiento && (
                        <span>
                          Fecha: {format(new Date(movimiento.fecha_movimiento), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
