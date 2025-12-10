"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, DollarSign, Clock, Store, LogOut, LogIn } from "lucide-react"
import { OpenCashSessionModal } from "./open-cash-session-modal"
import { CloseCashSessionModal } from "./close-cash-session-modal"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
}

// ✨ NUEVO: Exponer métodos del componente
export interface CashSessionStatusRef {
  refresh: () => Promise<void>
}

export const CashSessionStatus = forwardRef<CashSessionStatusRef>((props, ref) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<CashSession | null>(null)
  const [summary, setSummary] = useState<CashSessionSummary | null>(null)
  const [openModalOpen, setOpenModalOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)

  useEffect(() => {
    loadSession()
  }, [])

  const loadSession = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/caja/session")
      if (!response.ok) throw new Error("Error al cargar sesión")
      
      const data = await response.json()
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
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <Store className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-green-900">
                      {session.caja.nombre}
                    </h3>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      Abierta
                    </Badge>
                  </div>
                  <p className="text-xs text-green-700">
                    Sesión: {session.codigo_sesion}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setCloseModalOpen(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Caja
              </Button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-green-700">
                  <Clock className="h-3 w-3" />
                  <span>Apertura</span>
                </div>
                <p className="text-sm font-medium text-green-900">
                  {format(new Date(session.fecha_apertura), "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-green-700">
                  <DollarSign className="h-3 w-3" />
                  <span>Fondo Inicial</span>
                </div>
                <p className="text-sm font-medium text-green-900">
                  ${session.fondo_inicial.toLocaleString("es-CO")}
                </p>
              </div>
            </div>

            {/* Efectivo Esperado con desglose */}
            {summary && (
              <div className="pt-2 border-t border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-700">Efectivo en Caja:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      summary.efectivoEsperado < 10000 ? 'text-red-600' :
                      summary.efectivoEsperado < 50000 ? 'text-yellow-600' :
                      'text-green-900'
                    }`}>
                      ${summary.efectivoEsperado.toLocaleString("es-CO")}
                    </span>
                    {summary.efectivoEsperado < 10000 && (
                      <Badge variant="destructive" className="text-xs">
                        ⚠️ Bajo
                      </Badge>
                    )}
                    {summary.efectivoEsperado >= 10000 && summary.efectivoEsperado < 50000 && (
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                        ⚠️ Limitado
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Alerta si efectivo está muy bajo */}
                {summary.efectivoEsperado < 20000 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-2">
                    <p className="text-xs text-yellow-800">
                      <strong>💡 Aviso:</strong> El efectivo en caja está bajo. 
                      {summary.efectivoEsperado < 10000 
                        ? ' Considera recibir más efectivo o sugerir pagos digitales.'
                        : ' Puede que no puedas dar cambio para billetes grandes.'}
                    </p>
                  </div>
                )}
                
                {/* Desglose de cálculo */}
                <div className="bg-white/50 rounded-md p-2 space-y-1 text-xs">
                  <div className="flex justify-between text-green-700">
                    <span>✓ Fondo Inicial:</span>
                    <span className="font-medium">${session.fondo_inicial.toLocaleString("es-CO")}</span>
                  </div>
                  {summary.ventas.efectivo > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>✓ Ventas (Efectivo):</span>
                      <span className="font-medium text-green-600">+${summary.ventas.efectivo.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                  {summary.movimientos.ingresosEfectivo > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>✓ Ingresos (Efectivo):</span>
                      <span className="font-medium text-green-600">+${summary.movimientos.ingresosEfectivo.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                  {summary.retiros.monto > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>✗ Retiros:</span>
                      <span className="font-medium text-red-600">-${summary.retiros.monto.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                  {summary.gastos.monto > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>✗ Gastos:</span>
                      <span className="font-medium text-red-600">-${summary.gastos.monto.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                  {summary.movimientos.egresosEfectivo > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>✗ Egresos (Efectivo):</span>
                      <span className="font-medium text-red-600">-${summary.movimientos.egresosEfectivo.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                </div>

                {/* Totales de transacciones */}
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div className="text-center">
                    <p className="text-green-700">Movimientos</p>
                    <p className="font-semibold text-green-900">{summary.movimientos.total}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-700">Retiros</p>
                    <p className="font-semibold text-green-900">{summary.retiros.total}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-700">Gastos</p>
                    <p className="font-semibold text-green-900">{summary.gastos.total}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
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
