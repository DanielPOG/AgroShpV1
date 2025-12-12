"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, DollarSign, Clock, Store, LogOut, LogIn, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Smartphone, CreditCard, ArrowLeftRight } from "lucide-react"
import { OpenCashSessionModal } from "./open-cash-session-modal"
import { CloseCashSessionModal } from "./close-cash-session-modal"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CashSession {
  id: number
  codigo_sesion: string
  fecha_apertura: string
  fondo_inicial: number
  efectivo_esperado: number
  estado: string
  caja: {
    nombre: string
    codigo: string
  }
}

interface CashSessionSummary {
  ventas: {
    efectivo: number
    total: number
  }
  movimientos: {
    total: number
    ingresos: number
    egresos: number
    ingresosEfectivo: number
    egresosEfectivo: number
    ingresosNequi: number
    egresosNequi: number
    ingresosTarjeta: number
    egresosTarjeta: number
    ingresosTransferencia: number
    egresosTransferencia: number
  }
  retiros: {
    total: number
    monto: number
  }
  gastos: {
    total: number
    monto: number
  }
  efectivoEsperado: number
  // Nuevos datos por método de pago
  efectivo?: {
    fondoInicial: number
    ventas: number
    ingresos: number
    egresos: number
    retiros: number
    gastos: number
    disponible: number
  }
  nequi?: {
    ventas: number
    ingresos: number
    egresos: number
    gastos: number
    disponible: number
  }
  tarjeta?: {
    ventas: number
    ingresos: number
    egresos: number
    gastos: number
    disponible: number
  }
  transferencia?: {
    ventas: number
    ingresos: number
    egresos: number
    gastos: number
    disponible: number
  }
  totales?: {
    totalVentas: number
    totalDisponible: number
    efectivoEnTransito: number
  }
}

// ✨ NUEVO: Exponer métodos del componente
export interface CashSessionStatusRef {
  refresh: () => Promise<void>
}

// ✨ NUEVO: Props del componente
interface CashSessionStatusProps {
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export const CashSessionStatus = forwardRef<CashSessionStatusRef, CashSessionStatusProps>(
  ({ isExpanded = false, onToggleExpand }, ref) => {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState<CashSession | null>(null)
    const [summary, setSummary] = useState<CashSessionSummary | null>(null)
    const [openModalOpen, setOpenModalOpen] = useState(false)
    const [closeModalOpen, setCloseModalOpen] = useState(false)

    useEffect(() => {
      loadSession()

      // 🔔 Escuchar eventos globales de actualización
      const handleUpdate = () => {
        console.log('🔔 Evento de actualización recibido, refrescando sesión...')
        loadSession()
      }

      window.addEventListener('cash-session-updated', handleUpdate)

      return () => {
        window.removeEventListener('cash-session-updated', handleUpdate)
      }
    }, [])

    const loadSession = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/caja/session")
        if (!response.ok) throw new Error("Error al cargar sesión")

        const data = await response.json()
        console.log('📊 [CashSessionStatus] Datos de sesión recibidos:', data.summary)
        console.log('📊 [CashSessionStatus] Movimientos desglosados:', {
          total: data.summary.movimientos.total,
          ingresos: data.summary.movimientos.ingresos,
          egresos: data.summary.movimientos.egresos,
          nequi: {
            ingresos: data.summary.movimientos.ingresosNequi,
            egresos: data.summary.movimientos.egresosNequi
          },
          tarjeta: {
            ingresos: data.summary.movimientos.ingresosTarjeta,
            egresos: data.summary.movimientos.egresosTarjeta
          },
          transferencia: {
            ingresos: data.summary.movimientos.ingresosTransferencia,
            egresos: data.summary.movimientos.egresosTransferencia
          }
        })
        setSession(data.session)
        setSummary(data.summary)
      } catch (error) {
        console.error("Error al cargar sesión:", error)
      } finally {
        setLoading(false)
      }
    }

    // ✨ NUEVO: Exponer función refresh al padre
    useImperativeHandle(ref, () => ({
      refresh: async () => {
        await loadSession()
      }
    }))

    const handleOpenSuccess = () => {
      loadSession()
      toast({
        title: "✅ Caja abierta",
        description: "Ya puedes realizar ventas",
      })
    }

    const handleCloseSuccess = () => {
      loadSession()
      toast({
        title: "✅ Caja cerrada",
        description: "Sesión finalizada correctamente",
      })
    }

    if (loading) {
      return (
        <Card className="border-2">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Cargando estado de caja...
            </span>
          </CardContent>
        </Card>
      )
    }

    // Sin sesión activa
    if (!session) {
      return (
        <>
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-900">Caja Cerrada</h3>
                  </div>
                  <p className="text-sm text-red-700">
                    Debes abrir una sesión de caja para realizar ventas
                  </p>
                </div>
                <Button
                  onClick={() => setOpenModalOpen(true)}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Abrir Caja
                </Button>
              </div>
            </CardContent>
          </Card>

          <OpenCashSessionModal
            open={openModalOpen}
            onOpenChange={setOpenModalOpen}
            onSuccess={handleOpenSuccess}
          />
        </>
      )
    }

    // Con sesión activa
    return (
      <>
        <Card className="border-0 border-b-2 border-green-300 bg-gradient-to-br from-green-50 via-emerald-50/50 to-green-50 rounded-none shadow-sm">
          <CardContent className="p-3 lg:p-4">
            {/* Header Compacto - Siempre visible */}
            <div className="flex items-center justify-between gap-3 flex-wrap lg:flex-nowrap">
              {/* Info de sesión compacta */}
              <div className="flex items-center gap-2 flex-1 min-w-0 order-1">
                <div className="rounded-full bg-gradient-to-br from-green-400 to-emerald-500 p-2 shadow-md shrink-0 ring-2 ring-green-100">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-green-900 truncate bg-gradient-to-r from-green-800 to-emerald-700 bg-clip-text text-transparent">
                      {session.caja.nombre}
                    </h3>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-xs shrink-0 shadow-sm hover:shadow-md transition-shadow">
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      Abierta
                    </Badge>
                    <span className="text-xs text-green-700 hidden md:inline font-medium">
                      · {session.codigo_sesion}
                    </span>
                  </div>
                </div>
              </div>

              {/* Efectivo disponible - Destacado con diseño premium */}
              {summary && (
                <div className="flex items-center gap-3 shrink-0 order-3 lg:order-2 w-full sm:w-auto justify-center lg:justify-start">
                  <div className={cn(
                    "relative overflow-hidden rounded-xl p-3 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl",
                    summary.efectivoEsperado < 10000
                      ? 'bg-gradient-to-br from-red-500 to-rose-600'
                      : summary.efectivoEsperado < 50000
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                        : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  )}>
                    {/* Efecto de brillo animado */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>

                    <div className="relative text-right">
                      <p className="text-xs text-white/90 font-semibold mb-0.5 flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3" />
                        Efectivo en Caja
                      </p>
                      <p className="text-xl lg:text-2xl font-black text-white drop-shadow-md tracking-tight">
                        ${summary.efectivoEsperado.toLocaleString("es-CO")}
                      </p>
                      {summary.efectivoEsperado < 10000 && (
                        <div className="absolute -top-1 -right-1 h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción con diseño moderno */}
              <div className="flex items-center gap-2 shrink-0 order-2 lg:order-3">
                {/* Botón expandir/contraer */}
                {onToggleExpand && (
                  <Button
                    onClick={onToggleExpand}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 gap-1.5 transition-all duration-300 hover:bg-green-100 hover:scale-105",
                      isExpanded && "bg-green-100"
                    )}
                    title={isExpanded ? "Contraer" : "Expandir"}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 text-green-700" />
                        <span className="text-xs font-semibold text-green-700 hidden sm:inline">Contraer</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 text-green-700" />
                        <span className="text-xs font-semibold text-green-700 hidden sm:inline">Expandir</span>
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => setCloseModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400 hover:scale-105 transition-all duration-300 shadow-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-xs font-semibold hidden sm:inline">Cerrar</span>
                </Button>
              </div>
            </div>

            {/* Contenido Expandible - Acordeón con animación mejorada */}
            {isExpanded && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-4 duration-500 fade-in">
                {/* Resumen de sesión con cards premium */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Apertura</span>
                    </div>
                    <p className="text-sm font-bold text-green-900">
                      {format(new Date(session.fecha_apertura), "dd MMM, HH:mm", { locale: es })}
                    </p>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Fondo Inicial</span>
                    </div>
                    <p className="text-sm font-bold text-green-900">
                      ${session.fondo_inicial.toLocaleString("es-CO")}
                    </p>
                  </div>

                  {summary && summary.ventas.total > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold mb-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Ventas Total</span>
                      </div>
                      <p className="text-sm font-bold text-blue-900">
                        ${summary.ventas.total.toLocaleString("es-CO")}
                      </p>
                    </div>
                  )}

                  {summary && summary.ventas.efectivo > 0 && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mb-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Ventas Efectivo</span>
                      </div>
                      <p className="text-sm font-bold text-emerald-900">
                        ${summary.ventas.efectivo.toLocaleString("es-CO")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Desglose de efectivo con diseño premium */}
                {summary && (
                  <div className="border-t-2 border-green-200 pt-4">
                    {/* Alerta si efectivo está bajo - Mejorada */}
                    {summary.efectivoEsperado < 20000 && (
                      <div className={cn(
                        "rounded-xl p-3 mb-3 shadow-md backdrop-blur-sm border-2 animate-in fade-in slide-in-from-top-2 duration-500",
                        summary.efectivoEsperado < 10000
                          ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
                          : "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                      )}>
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "rounded-full p-1.5 shrink-0",
                            summary.efectivoEsperado < 10000 ? "bg-red-200" : "bg-yellow-200"
                          )}>
                            <span className="text-base">
                              {summary.efectivoEsperado < 10000 ? "🚨" : "💡"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "text-xs font-bold mb-1",
                              summary.efectivoEsperado < 10000 ? "text-red-800" : "text-yellow-800"
                            )}>
                              {summary.efectivoEsperado < 10000 ? "⚠️ EFECTIVO CRÍTICO" : "💡 Efectivo Limitado"}
                            </p>
                            <p className={cn(
                              "text-xs",
                              summary.efectivoEsperado < 10000 ? "text-red-700" : "text-yellow-700"
                            )}>
                              {summary.efectivoEsperado < 10000
                                ? 'El efectivo está muy bajo. Considera recibir más efectivo o sugerir pagos digitales.'
                                : 'Puede que no puedas dar cambio para billetes grandes.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tabs con desglose por método de pago */}
                    <Tabs defaultValue="efectivo" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 mb-3">
                        <TabsTrigger value="efectivo" className="text-xs gap-1">
                          <DollarSign className="h-3 w-3" />
                          Efectivo
                        </TabsTrigger>
                        <TabsTrigger value="nequi" className="text-xs gap-1">
                          <Smartphone className="h-3 w-3" />
                          Nequi
                        </TabsTrigger>
                        <TabsTrigger value="tarjeta" className="text-xs gap-1">
                          <CreditCard className="h-3 w-3" />
                          Tarjeta
                        </TabsTrigger>
                        <TabsTrigger value="transferencia" className="text-xs gap-1">
                          <ArrowLeftRight className="h-3 w-3" />
                          Transfer.
                        </TabsTrigger>
                      </TabsList>

                      {/* Tab Efectivo */}
                      <TabsContent value="efectivo" className="mt-0">
                        <div className="bg-white/70 backdrop-blur-md rounded-xl p-4 space-y-2.5 text-xs shadow-lg border border-green-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md">
                              <DollarSign className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-bold text-sm text-green-900">Desglose Efectivo</h4>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-green-50/50 transition-colors">
                              <span className="text-green-700 font-medium">✓ Fondo Inicial:</span>
                              <span className="font-bold text-green-900">${(summary.efectivo?.fondoInicial || session.fondo_inicial).toLocaleString("es-CO")}</span>
                            </div>

                            {(summary.efectivo?.ventas || summary.ventas.efectivo) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-emerald-50/50 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                                    <TrendingUp className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-green-700 font-medium">Ventas:</span>
                                </div>
                                <span className="font-bold text-emerald-600">+${(summary.efectivo?.ventas || summary.ventas.efectivo).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.efectivo?.ingresos || summary.movimientos.ingresosEfectivo) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-emerald-50/50 transition-colors">
                                <span className="text-green-700 font-medium">Ingresos Extra:</span>
                                <span className="font-bold text-emerald-600">+${(summary.efectivo?.ingresos || summary.movimientos.ingresosEfectivo).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.efectivo?.retiros || summary.retiros.monto) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
                                    <TrendingDown className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-green-700 font-medium">Retiros:</span>
                                </div>
                                <span className="font-bold text-red-600">-${(summary.efectivo?.retiros || summary.retiros.monto).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.efectivo?.gastos || summary.gastos.monto) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-green-700 font-medium">Gastos:</span>
                                <span className="font-bold text-red-600">-${(summary.efectivo?.gastos || summary.gastos.monto).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.efectivo?.egresos || summary.movimientos.egresosEfectivo) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-green-700 font-medium">Egresos Extra:</span>
                                <span className="font-bold text-red-600">-${(summary.efectivo?.egresos || summary.movimientos.egresosEfectivo).toLocaleString("es-CO")}</span>
                              </div>
                            )}
                          </div>

                          <div className="border-t-2 border-dashed border-green-200 pt-3 mt-3">
                            <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-md">
                              <span className="font-bold text-sm text-white flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Disponible:
                              </span>
                              <span className="text-xl font-black text-white drop-shadow-md">
                                ${(summary.efectivo?.disponible || summary.efectivoEsperado).toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Tab Nequi */}
                      <TabsContent value="nequi" className="mt-0">
                        <div className="bg-white/70 backdrop-blur-md rounded-xl p-4 space-y-2.5 text-xs shadow-lg border border-purple-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-md">
                              <Smartphone className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-bold text-sm text-purple-900">Desglose Nequi</h4>
                          </div>

                          <div className="space-y-2">
                            {/* Mostrar ventas desde session directamente si no hay datos del panel */}
                            {(summary.nequi?.ventas ?? Number(session.total_ventas_nequi || 0)) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-sm">
                                    <TrendingUp className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-purple-700 font-medium">Ventas:</span>
                                </div>
                                <span className="font-bold text-purple-600">+${(summary.nequi?.ventas ?? Number(session.total_ventas_nequi || 0)).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.nequi?.ingresos || summary.movimientos.ingresosNequi || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                                <span className="text-purple-700 font-medium">Ingresos Extra:</span>
                                <span className="font-bold text-purple-600">+${(summary.nequi?.ingresos || summary.movimientos.ingresosNequi || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.nequi?.egresos || summary.movimientos.egresosNequi || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-purple-700 font-medium">Egresos:</span>
                                <span className="font-bold text-red-600">-${(summary.nequi?.egresos || summary.movimientos.egresosNequi || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.nequi?.gastos || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-purple-700 font-medium">Gastos:</span>
                                <span className="font-bold text-red-600">-${(summary.nequi?.gastos || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.nequi?.ventas ?? Number(session.total_ventas_nequi || 0)) === 0 && (summary.nequi?.ingresos || 0) === 0 && (
                              <div className="text-center py-4 text-muted-foreground">
                                Sin movimientos en Nequi
                              </div>
                            )}
                          </div>

                          <div className="border-t-2 border-dashed border-purple-200 pt-3 mt-3">
                            <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-md">
                              <span className="font-bold text-sm text-white flex items-center gap-2">
                                <Smartphone className="h-4 w-4" />
                                Disponible:
                              </span>
                              <span className="text-xl font-black text-white drop-shadow-md">
                                ${(summary.nequi?.disponible ?? (
                                  Number(session.total_ventas_nequi || 0) +
                                  (summary.movimientos.ingresosNequi || 0) -
                                  (summary.movimientos.egresosNequi || 0)
                                )).toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Tab Tarjeta */}
                      <TabsContent value="tarjeta" className="mt-0">
                        <div className="bg-white/70 backdrop-blur-md rounded-xl p-4 space-y-2.5 text-xs shadow-lg border border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-md">
                              <CreditCard className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-bold text-sm text-blue-900">Desglose Tarjeta</h4>
                          </div>

                          <div className="space-y-2">
                            {(summary.tarjeta?.ventas ?? Number(session.total_ventas_tarjeta || 0)) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-blue-50/50 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-sm">
                                    <TrendingUp className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-blue-700 font-medium">Ventas:</span>
                                </div>
                                <span className="font-bold text-blue-600">+${(summary.tarjeta?.ventas ?? Number(session.total_ventas_tarjeta || 0)).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.tarjeta?.ingresos || summary.movimientos.ingresosTarjeta || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-blue-50/50 transition-colors">
                                <span className="text-blue-700 font-medium">Ingresos Extra:</span>
                                <span className="font-bold text-blue-600">+${(summary.tarjeta?.ingresos || summary.movimientos.ingresosTarjeta || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.tarjeta?.egresos || summary.movimientos.egresosTarjeta || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-blue-700 font-medium">Egresos:</span>
                                <span className="font-bold text-red-600">-${(summary.tarjeta?.egresos || summary.movimientos.egresosTarjeta || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.tarjeta?.gastos || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-blue-700 font-medium">Gastos:</span>
                                <span className="font-bold text-red-600">-${(summary.tarjeta?.gastos || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.tarjeta?.ventas ?? Number(session.total_ventas_tarjeta || 0)) === 0 && (summary.tarjeta?.ingresos || 0) === 0 && (
                              <div className="text-center py-4 text-muted-foreground">
                                Sin movimientos en Tarjeta
                              </div>
                            )}
                          </div>

                          <div className="border-t-2 border-dashed border-blue-200 pt-3 mt-3">
                            <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 shadow-md">
                              <span className="font-bold text-sm text-white flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Disponible:
                              </span>
                              <span className="text-xl font-black text-white drop-shadow-md">
                                ${(summary.tarjeta?.disponible ?? (
                                  Number(session.total_ventas_tarjeta || 0) +
                                  (summary.movimientos.ingresosTarjeta || 0) -
                                  (summary.movimientos.egresosTarjeta || 0)
                                )).toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Tab Transferencia */}
                      <TabsContent value="transferencia" className="mt-0">
                        <div className="bg-white/70 backdrop-blur-md rounded-xl p-4 space-y-2.5 text-xs shadow-lg border border-orange-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md">
                              <ArrowLeftRight className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-bold text-sm text-orange-900">Desglose Transferencia</h4>
                          </div>

                          <div className="space-y-2">
                            {(summary.transferencia?.ventas ?? Number(session.total_ventas_transferencia || 0)) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-orange-50/50 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                                    <TrendingUp className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-orange-700 font-medium">Ventas:</span>
                                </div>
                                <span className="font-bold text-orange-600">+${(summary.transferencia?.ventas ?? Number(session.total_ventas_transferencia || 0)).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.transferencia?.ingresos || summary.movimientos.ingresosTransferencia || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-orange-50/50 transition-colors">
                                <span className="text-orange-700 font-medium">Ingresos Extra:</span>
                                <span className="font-bold text-orange-600">+${(summary.transferencia?.ingresos || summary.movimientos.ingresosTransferencia || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.transferencia?.egresos || summary.movimientos.egresosTransferencia || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-orange-700 font-medium">Egresos:</span>
                                <span className="font-bold text-red-600">-${(summary.transferencia?.egresos || summary.movimientos.egresosTransferencia || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.transferencia?.gastos || 0) > 0 && (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                                <span className="text-orange-700 font-medium">Gastos:</span>
                                <span className="font-bold text-red-600">-${(summary.transferencia?.gastos || 0).toLocaleString("es-CO")}</span>
                              </div>
                            )}

                            {(summary.transferencia?.ventas ?? Number(session.total_ventas_transferencia || 0)) === 0 && (summary.transferencia?.ingresos || 0) === 0 && (
                              <div className="text-center py-4 text-muted-foreground">
                                Sin movimientos en Transferencia
                              </div>
                            )}
                          </div>

                          <div className="border-t-2 border-dashed border-orange-200 pt-3 mt-3">
                            <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 shadow-md">
                              <span className="font-bold text-sm text-white flex items-center gap-2">
                                <ArrowLeftRight className="h-4 w-4" />
                                Disponible:
                              </span>
                              <span className="text-xl font-black text-white drop-shadow-md">
                                ${(summary.transferencia?.disponible ?? (
                                  Number(session.total_ventas_transferencia || 0) +
                                  (summary.movimientos.ingresosTransferencia || 0) -
                                  (summary.movimientos.egresosTransferencia || 0)
                                )).toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Contador de transacciones con diseño moderno */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="text-center bg-gradient-to-br from-blue-50 to-cyan-50 backdrop-blur-sm rounded-xl p-3 shadow-md border border-blue-100 hover:shadow-lg hover:scale-105 transition-all duration-300">
                        <div className="text-xs text-blue-700 font-semibold mb-1 flex items-center justify-center gap-1">
                          <span className="text-base">📊</span>
                          Movimientos
                        </div>
                        <p className="font-black text-2xl text-blue-900">{summary.movimientos.total}</p>
                      </div>
                      <div className="text-center bg-gradient-to-br from-purple-50 to-fuchsia-50 backdrop-blur-sm rounded-xl p-3 shadow-md border border-purple-100 hover:shadow-lg hover:scale-105 transition-all duration-300">
                        <div className="text-xs text-purple-700 font-semibold mb-1 flex items-center justify-center gap-1">
                          <span className="text-base">💸</span>
                          Retiros
                        </div>
                        <p className="font-black text-2xl text-purple-900">{summary.retiros.total}</p>
                      </div>
                      <div className="text-center bg-gradient-to-br from-orange-50 to-amber-50 backdrop-blur-sm rounded-xl p-3 shadow-md border border-orange-100 hover:shadow-lg hover:scale-105 transition-all duration-300">
                        <div className="text-xs text-orange-700 font-semibold mb-1 flex items-center justify-center gap-1">
                          <span className="text-base">💳</span>
                          Gastos
                        </div>
                        <p className="font-black text-2xl text-orange-900">{summary.gastos.total}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <CloseCashSessionModal
          open={closeModalOpen}
          onOpenChange={setCloseModalOpen}
          onSuccess={handleCloseSuccess}
          sessionId={session.id}
          efectivoEsperado={summary?.efectivoEsperado || session.efectivo_esperado}
        />
      </>
    )
  })

CashSessionStatus.displayName = "CashSessionStatus"
