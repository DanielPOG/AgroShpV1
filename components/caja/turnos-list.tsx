"use client"

import { useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  User,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Timer,
  PlayCircle,
  StopCircle,
  PauseCircle,
} from "lucide-react"
import { TIPOS_RELEVO_LABELS } from "@/lib/validations/turno-caja.schema"

interface Turno {
  id: number
  monto_inicial_turno: number | string
  monto_final_turno: number | string | null
  total_ventas_turno: number | string | null
  total_retiros_turno: number | string | null
  total_gastos_turno: number | string | null
  diferencia_turno: number | string | null
  tipo_relevo: string
  estado: string
  fecha_inicio: string | Date
  fecha_fin: string | Date | null
  observaciones_inicio: string | null
  observaciones_cierre: string | null
  cajero: {
    nombre: string
    apellido: string
    email: string
  }
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

interface TurnosListProps {
  turnos: Turno[]
  canFinalize?: boolean
  canSuspend?: boolean
  onFinalize?: (turno: Turno) => void
  onSuspend?: (id: number) => void
  onResume?: (id: number) => void
}

const ESTADO_COLORS = {
  activo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  finalizado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  suspendido: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

const ESTADO_ICONS = {
  activo: PlayCircle,
  finalizado: StopCircle,
  suspendido: PauseCircle,
}

export function TurnosList({ 
  turnos, 
  canFinalize = false,
  canSuspend = false,
  onFinalize,
  onSuspend,
  onResume
}: TurnosListProps) {
  const calcularDuracion = (fechaInicio: Date, fechaFin: Date | null) => {
    const inicio = new Date(fechaInicio)
    const fin = fechaFin ? new Date(fechaFin) : new Date()
    const diff = fin.getTime() - inicio.getTime()
    const horas = Math.floor(diff / (1000 * 60 * 60))
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${horas}h ${minutos}m`
  }

  if (turnos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay turnos registrados</h3>
        <p className="text-sm text-muted-foreground">
          Los turnos de caja aparecerán aquí
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {turnos.map((turno) => {
        const EstadoIcon = ESTADO_ICONS[turno.estado as keyof typeof ESTADO_ICONS]
        const colorClass = ESTADO_COLORS[turno.estado as keyof typeof ESTADO_COLORS]
        
        const montoInicial = Number(turno.monto_inicial_turno)
        const montoFinal = Number(turno.monto_final_turno || 0)
        const diferencia = Number(turno.diferencia_turno || 0)
        const totalVentas = Number(turno.total_ventas_turno || 0)

        const duracion = calcularDuracion(
          new Date(turno.fecha_inicio), 
          turno.fecha_fin ? new Date(turno.fecha_fin) : null
        )

        return (
          <Card key={turno.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Info Principal */}
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className={`rounded-full p-2.5 ${colorClass.split(' ')[0]} flex-shrink-0`}>
                    <EstadoIcon className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Estado y Tipo */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={colorClass}>
                        {turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1)}
                      </Badge>
                      <Badge variant="outline">
                        {TIPOS_RELEVO_LABELS[turno.tipo_relevo as keyof typeof TIPOS_RELEVO_LABELS]}
                      </Badge>
                      {turno.autorizador && (
                        <Badge variant="outline" className="text-xs">
                          Autorizado
                        </Badge>
                      )}
                    </div>

                    {/* Cajero */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {turno.cajero.nombre} {turno.cajero.apellido}
                      </span>
                    </div>

                    {/* Totales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Inicial</p>
                        <p className="font-semibold text-blue-600">
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(montoInicial)}
                        </p>
                      </div>

                      {turno.estado !== 'activo' && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Final</p>
                            <p className="font-semibold text-green-600">
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                                minimumFractionDigits: 0,
                              }).format(montoFinal)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Ventas</p>
                            <p className="font-semibold">
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                                minimumFractionDigits: 0,
                              }).format(totalVentas)}
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
                              {diferencia === 0 && <CheckCircle2 className="h-3 w-3" />}
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                                minimumFractionDigits: 0,
                                signDisplay: "exceptZero"
                              }).format(diferencia)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Observaciones */}
                    {turno.estado === 'activo' && turno.observaciones_inicio && (
                      <p className="text-xs text-muted-foreground italic border-l-2 pl-2 border-muted line-clamp-1">
                        {turno.observaciones_inicio}
                      </p>
                    )}
                    {turno.observaciones_cierre && (
                      <p className="text-xs text-muted-foreground italic border-l-2 pl-2 border-muted line-clamp-1">
                        {turno.observaciones_cierre}
                      </p>
                    )}

                    {/* Footer Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(turno.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        <span>{duracion}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {turno.sesion_caja.caja.nombre} - {turno.sesion_caja.codigo_sesion}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2">
                  {canFinalize && turno.estado === 'activo' && onFinalize && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onFinalize(turno)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <StopCircle className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                  )}

                  {canSuspend && turno.estado === 'activo' && onSuspend && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSuspend(turno.id)}
                    >
                      <PauseCircle className="h-4 w-4 mr-1" />
                      Suspender
                    </Button>
                  )}

                  {canSuspend && turno.estado === 'suspendido' && onResume && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onResume(turno.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Reanudar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
