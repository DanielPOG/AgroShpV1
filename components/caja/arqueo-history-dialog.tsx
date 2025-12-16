"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useArqueoHistory } from '@/hooks/use-arqueo-history'
import { 
  FileText, 
  User, 
  Store, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatearMoneda } from '@/lib/utils'

interface ArqueoHistoryDialogProps {
  arqueoId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const METODO_PAGO_ICONS = {
  efectivo: Wallet,
  nequi: DollarSign,
  tarjeta: CreditCard,
  transferencia: ArrowUpCircle,
}

const METODO_PAGO_LABELS = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const TIPO_RELEVO_LABELS = {
  inicio_jornada: 'Inicio de Jornada',
  cambio_turno: 'Cambio de Turno',
  fin_jornada: 'Fin de Jornada',
  emergencia: 'Emergencia',
}

export function ArqueoHistoryDialog({ 
  arqueoId, 
  open, 
  onOpenChange 
}: ArqueoHistoryDialogProps) {
  const { data, loading, error, fetchHistory, reset } = useArqueoHistory()
  const [expandedTurnoId, setExpandedTurnoId] = useState<number | null>(null)

  useEffect(() => {
    if (open && arqueoId) {
      fetchHistory(arqueoId)
    } else if (!open) {
      reset()
      setExpandedTurnoId(null)
    }
  }, [open, arqueoId])

  const toggleTurno = (turnoId: number) => {
    setExpandedTurnoId(expandedTurnoId === turnoId ? null : turnoId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Historial Detallado del Arqueo
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {data && (
          <ScrollArea className="h-[calc(90vh-8rem)] pr-2 sm:pr-4">
            {/* Información del Arqueo */}
            <div className="rounded-lg border bg-card p-3 sm:p-4 mb-3 sm:mb-4">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Información del Arqueo
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium text-xs sm:text-sm">
                    {format(new Date(data.arqueo.fecha_arqueo), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className="text-xs">{data.arqueo.tipo_arqueo}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Realizado por</p>
                  <p className="font-medium text-xs sm:text-sm truncate">{data.arqueo.realizador.nombre} {data.arqueo.realizador.apellido}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diferencia</p>
                  <p className={`font-bold text-xs sm:text-sm ${
                    data.arqueo.diferencia === 0 
                      ? 'text-green-600' 
                      : data.arqueo.diferencia > 0 
                      ? 'text-blue-600' 
                      : 'text-red-600'
                  }`}>
                    {formatearMoneda(data.arqueo.diferencia)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Contado</p>
                  <p className="font-bold text-sm sm:text-lg">{formatearMoneda(data.arqueo.total_contado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Esperado</p>
                  <p className="font-bold text-sm sm:text-lg">{formatearMoneda(data.arqueo.total_esperado)}</p>
                </div>
              </div>
            </div>

            {/* Información de la Sesión */}
            <div className="rounded-lg border bg-card p-3 sm:p-4 mb-3 sm:mb-4">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                <Store className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Sesión de Caja
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tienda</p>
                  <p className="font-medium text-xs sm:text-sm truncate">{data.sesion.tienda.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsable</p>
                  <p className="font-medium text-xs sm:text-sm truncate">{data.sesion.responsable.nombre} {data.sesion.responsable.apellido}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Apertura</p>
                  <p className="font-medium text-xs sm:text-sm">
                    {format(new Date(data.sesion.fecha_apertura), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fondo Inicial</p>
                  <p className="font-medium text-xs sm:text-sm">{formatearMoneda(data.sesion.fondo_inicial)}</p>
                </div>
              </div>
            </div>

            {/* Totales Generales */}
            <div className="rounded-lg border bg-card p-3 sm:p-4 mb-3 sm:mb-4">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Resumen General
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Turnos</p>
                  <p className="font-bold text-lg sm:text-2xl">{data.totalesGenerales.cantidades.turnos}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Ventas</p>
                  <p className="font-bold text-lg sm:text-2xl">{data.totalesGenerales.cantidades.ventas}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Retiros</p>
                  <p className="font-bold text-lg sm:text-2xl">{data.totalesGenerales.cantidades.retiros}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="font-bold text-lg sm:text-2xl">{data.totalesGenerales.cantidades.gastos}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Movimientos</p>
                  <p className="font-bold text-lg sm:text-2xl">{data.totalesGenerales.cantidades.movimientos}</p>
                </div>
              </div>

              <Separator className="my-3 sm:my-4" />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {Object.entries(data.totalesGenerales.porMetodo).map(([metodo, totales]) => {
                  const Icon = METODO_PAGO_ICONS[metodo as keyof typeof METODO_PAGO_ICONS]
                  const label = METODO_PAGO_LABELS[metodo as keyof typeof METODO_PAGO_LABELS]
                  const saldo = totales.ventas + totales.ingresos - totales.gastos - totales.egresos - (totales.retiros || 0)
                  
                  return (
                    <div key={metodo} className="rounded-lg border p-2 sm:p-3">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <p className="font-semibold text-xs sm:text-sm">{label}</p>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ventas:</span>
                          <span className="font-medium text-green-600">+{formatearMoneda(totales.ventas)}</span>
                        </div>
                        {totales.ingresos > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ingresos:</span>
                            <span className="font-medium text-green-600">+{formatearMoneda(totales.ingresos)}</span>
                          </div>
                        )}
                        {totales.retiros !== undefined && totales.retiros > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Retiros:</span>
                            <span className="font-medium text-red-600">-{formatearMoneda(totales.retiros)}</span>
                          </div>
                        )}
                        {totales.gastos > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gastos:</span>
                            <span className="font-medium text-red-600">-{formatearMoneda(totales.gastos)}</span>
                          </div>
                        )}
                        {totales.egresos > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Egresos:</span>
                            <span className="font-medium text-red-600">-{formatearMoneda(totales.egresos)}</span>
                          </div>
                        )}
                        <Separator className="my-1" />
                        <div className="flex justify-between font-bold">
                          <span>Saldo:</span>
                          <span className={saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatearMoneda(saldo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detalles por Turno */}
            <div className="rounded-lg border bg-card p-3 sm:p-4">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Turnos y Operaciones ({data.turnos.length})
              </h3>

              <div className="space-y-3">
                {data.turnos.map((turnoData, index) => {
                  const isExpanded = expandedTurnoId === turnoData.turno.id
                  const tipoRelievoLabel = TIPO_RELEVO_LABELS[turnoData.turno.tipo_relevo as keyof typeof TIPO_RELEVO_LABELS] || turnoData.turno.tipo_relevo
                  
                  // Calcular diferencia del turno
                  // Diferencia = efectivo_final (contado) - (efectivo_inicial + saldo_efectivo_operaciones)
                  let diferencia: number | null = null
                  if (turnoData.turno.efectivo_final !== null) {
                    const efectivoEsperado = Number(turnoData.turno.efectivo_inicial) + (turnoData.totales.saldos.efectivo || 0)
                    diferencia = Number(turnoData.turno.efectivo_final) - efectivoEsperado
                  }

                  return (
                    <div key={turnoData.turno.id} className="rounded-lg border">
                      {/* Header del Turno - Siempre visible */}
                      <button
                        onClick={() => toggleTurno(turnoData.turno.id)}
                        className="w-full p-2 sm:p-4 text-left hover:bg-accent/50 transition-colors rounded-t-lg"
                      >
                        <div className="flex flex-col gap-2">
                          {/* Primera fila: Info básica y efectivo */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                Turno #{index + 1}
                              </Badge>
                              <Badge className="text-xs">{tipoRelievoLabel}</Badge>
                              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                <span className="font-medium truncate max-w-[120px] sm:max-w-none">{turnoData.turno.cajero.nombre} {turnoData.turno.cajero.apellido}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Efectivo Inicial</p>
                                <p className="font-semibold text-xs sm:text-sm">{formatearMoneda(turnoData.turno.efectivo_inicial)}</p>
                              </div>
                              {turnoData.turno.efectivo_final !== null && (
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Efectivo Final</p>
                                  <p className="font-semibold text-xs sm:text-sm">{formatearMoneda(turnoData.turno.efectivo_final)}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Segunda fila: Resumen de operaciones */}
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {turnoData.totales.cantidades.ventas > 0 && (
                              <div className="flex items-center gap-1 bg-green-50 dark:bg-green-950 px-2 py-1 rounded">
                                <ShoppingCart className="h-3 w-3 text-green-600" />
                                <span className="font-medium text-green-700 dark:text-green-400">
                                  {turnoData.totales.cantidades.ventas} ventas
                                </span>
                              </div>
                            )}
                            {turnoData.totales.cantidades.retiros > 0 && (
                              <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950 px-2 py-1 rounded">
                                <ArrowDownCircle className="h-3 w-3 text-red-600" />
                                <span className="font-medium text-red-700 dark:text-red-400">
                                  {turnoData.totales.cantidades.retiros} retiros
                                </span>
                              </div>
                            )}
                            {turnoData.totales.cantidades.gastos > 0 && (
                              <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950 px-2 py-1 rounded">
                                <TrendingDown className="h-3 w-3 text-orange-600" />
                                <span className="font-medium text-orange-700 dark:text-orange-400">
                                  {turnoData.totales.cantidades.gastos} gastos
                                </span>
                              </div>
                            )}
                            {turnoData.totales.cantidades.movimientos > 0 && (
                              <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded">
                                <ArrowUpCircle className="h-3 w-3 text-blue-600" />
                                <span className="font-medium text-blue-700 dark:text-blue-400">
                                  {turnoData.totales.cantidades.movimientos} movimientos
                                </span>
                              </div>
                            )}
                            {diferencia !== null && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded font-semibold ml-auto ${
                                diferencia === 0 
                                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' 
                                  : diferencia > 0 
                                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400' 
                                  : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
                              }`}>
                                {diferencia === 0 ? '✓' : diferencia > 0 ? '↑' : '↓'}
                                <span>
                                  {diferencia === 0 ? 'Sin diferencia' : `${formatearMoneda(Math.abs(diferencia))} ${diferencia > 0 ? 'sobrante' : 'faltante'}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fechas */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="hidden sm:inline">{format(new Date(turnoData.turno.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                            <span className="sm:hidden">{format(new Date(turnoData.turno.fecha_inicio), "dd/MM HH:mm", { locale: es })}</span>
                          </div>
                          {turnoData.turno.fecha_fin && (
                            <>
                              <span>→</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="hidden sm:inline">{format(new Date(turnoData.turno.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                                <span className="sm:hidden">{format(new Date(turnoData.turno.fecha_fin), "dd/MM HH:mm", { locale: es })}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </button>

                      {/* Detalles del Turno - Expandible */}
                      {isExpanded && (
                        <div className="p-2 sm:p-4 pt-0 space-y-3 sm:space-y-4">
                          <Separator />

                          {/* Resumen del Turno */}
                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm mb-2">Resumen</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                              <div className="rounded bg-muted p-2">
                                <p className="text-xs text-muted-foreground">Ventas</p>
                                <p className="font-bold text-sm sm:text-base">{turnoData.totales.cantidades.ventas}</p>
                              </div>
                              <div className="rounded bg-muted p-2">
                                <p className="text-xs text-muted-foreground">Retiros</p>
                                <p className="font-bold text-sm sm:text-base">{turnoData.totales.cantidades.retiros}</p>
                              </div>
                              <div className="rounded bg-muted p-2">
                                <p className="text-xs text-muted-foreground">Gastos</p>
                                <p className="font-bold text-sm sm:text-base">{turnoData.totales.cantidades.gastos}</p>
                              </div>
                              <div className="rounded bg-muted p-2">
                                <p className="text-xs text-muted-foreground">Movimientos</p>
                                <p className="font-bold text-sm sm:text-base">{turnoData.totales.cantidades.movimientos}</p>
                              </div>
                            </div>
                          </div>

                          {/* Totales por Método de Pago */}
                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm mb-2">Totales por Método de Pago</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(turnoData.totales.saldos).map(([metodo, saldo]) => {
                                const Icon = METODO_PAGO_ICONS[metodo as keyof typeof METODO_PAGO_ICONS]
                                const label = METODO_PAGO_LABELS[metodo as keyof typeof METODO_PAGO_LABELS]
                                
                                return (
                                  <div key={metodo} className="rounded border p-2">
                                    <div className="flex items-center gap-1 mb-1">
                                      <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <p className="text-xs font-medium truncate">{label}</p>
                                    </div>
                                    <p className={`font-bold text-xs sm:text-sm ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatearMoneda(saldo)}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Operaciones Detalladas */}
                          {(turnoData.operaciones.ventas.length > 0 ||
                            turnoData.operaciones.retiros.length > 0 ||
                            turnoData.operaciones.gastos.length > 0 ||
                            turnoData.operaciones.movimientos.length > 0) && (
                            <div>
                              <h4 className="font-semibold text-xs sm:text-sm mb-2">Operaciones Detalladas</h4>
                              
                              {/* Ventas */}
                              {turnoData.operaciones.ventas.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <ShoppingCart className="h-3 w-3" />
                                    Ventas ({turnoData.operaciones.ventas.length})
                                  </p>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {turnoData.operaciones.ventas.map((venta) => (
                                      <div key={venta.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs p-2 rounded bg-muted gap-1">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                          <span className="font-mono">#{venta.id}</span>
                                          <span className="text-muted-foreground">
                                            {format(new Date(venta.fecha_venta), "HH:mm", { locale: es })}
                                          </span>
                                          <Badge variant="outline" className="text-xs h-5">
                                            {METODO_PAGO_LABELS[venta.metodo_pago as keyof typeof METODO_PAGO_LABELS]}
                                          </Badge>
                                        </div>
                                        <span className="font-semibold text-green-600">
                                          {formatearMoneda(venta.total)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Retiros */}
                              {turnoData.operaciones.retiros.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <ArrowDownCircle className="h-3 w-3" />
                                    Retiros ({turnoData.operaciones.retiros.length})
                                  </p>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {turnoData.operaciones.retiros.map((retiro) => (
                                      <div key={retiro.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs p-2 rounded bg-muted gap-1">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                          <span className="font-mono">#{retiro.id}</span>
                                          <span className="text-muted-foreground">
                                            {format(new Date(retiro.fecha_retiro), "HH:mm", { locale: es })}
                                          </span>
                                          <span className="text-xs truncate max-w-[150px]">{retiro.motivo}</span>
                                        </div>
                                        <span className="font-semibold text-red-600">
                                          -{formatearMoneda(retiro.monto)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Gastos */}
                              {turnoData.operaciones.gastos.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    Gastos ({turnoData.operaciones.gastos.length})
                                  </p>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {turnoData.operaciones.gastos.map((gasto) => (
                                      <div key={gasto.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs p-2 rounded bg-muted gap-1">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                          <span className="font-mono">#{gasto.id}</span>
                                          <span className="text-muted-foreground">
                                            {format(new Date(gasto.fecha_gasto), "HH:mm", { locale: es })}
                                          </span>
                                          <span className="text-xs truncate max-w-[100px]">{gasto.categoria}</span>
                                          <Badge variant="outline" className="text-xs h-5">
                                            {METODO_PAGO_LABELS[gasto.metodo_pago as keyof typeof METODO_PAGO_LABELS]}
                                          </Badge>
                                        </div>
                                        <span className="font-semibold text-red-600">
                                          -{formatearMoneda(gasto.monto)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Movimientos */}
                              {turnoData.operaciones.movimientos.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <ArrowUpCircle className="h-3 w-3" />
                                    Movimientos ({turnoData.operaciones.movimientos.length})
                                  </p>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {turnoData.operaciones.movimientos.map((mov) => (
                                      <div key={mov.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs p-2 rounded bg-muted gap-1">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                          <span className="font-mono">#{mov.id}</span>
                                          <span className="text-muted-foreground">
                                            {format(new Date(mov.fecha_movimiento), "HH:mm", { locale: es })}
                                          </span>
                                          <span className="text-xs truncate max-w-[100px]">{mov.motivo}</span>
                                          <Badge variant="outline" className="text-xs h-5">
                                            {METODO_PAGO_LABELS[mov.metodo_pago as keyof typeof METODO_PAGO_LABELS]}
                                          </Badge>
                                        </div>
                                        <span className={`font-semibold ${
                                          mov.tipo_movimiento === 'ingreso_operativo' 
                                            ? 'text-green-600' 
                                            : 'text-red-600'
                                        }`}>
                                          {mov.tipo_movimiento === 'ingreso_operativo' ? '+' : '-'}
                                          {formatearMoneda(mov.monto)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {turnoData.turno.observaciones && (
                            <div className="rounded bg-muted p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Observaciones:</p>
                              <p className="text-sm">{turnoData.turno.observaciones}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
