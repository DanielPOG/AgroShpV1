"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useCashSession } from "@/hooks/use-cash-session"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MovimientoModal } from "@/components/caja/movimiento-modal"
import { MovimientosGuiaModal } from "@/components/caja/movimientos-guia-modal"
import { MovimientosList } from "@/components/caja/movimientos-list"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertCircle,
  Loader2,
  Clock,
  HelpCircle
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export default function MovimientosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { session, hasActiveSession, loading: sessionLoading } = useCashSession()

  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [movimientosPendientes, setMovimientosPendientes] = useState<Movimiento[]>([])
  const [isLoadingMovimientos, setIsLoadingMovimientos] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showGuia, setShowGuia] = useState(false)
  const [efectivoDisponible, setEfectivoDisponible] = useState(0)
  const [totales, setTotales] = useState({
    ingresos: 0,
    egresos: 0,
    neto: 0
  })

  const isAdmin = user?.role === "Admin"
  const canAuthorize = isAdmin

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (hasActiveSession && session) {
      loadMovimientos()
    }
  }, [hasActiveSession, session])

  useEffect(() => {
    if (canAuthorize) {
      loadMovimientosPendientes()
    }
  }, [canAuthorize])

  const loadMovimientos = async () => {
    if (!session?.id) return

    setIsLoadingMovimientos(true)
    try {
      const response = await fetch(`/api/caja/movimientos?sesion_id=${session.id}`)
      const data = await response.json()

      if (response.ok) {
        setMovimientos(data.movimientos || [])
        calcularTotales(data.movimientos || [])
        calcularEfectivoDisponible(data.movimientos || [])
      }
    } catch (error) {
      console.error("Error al cargar movimientos:", error)
    } finally {
      setIsLoadingMovimientos(false)
    }
  }

  const loadMovimientosPendientes = async () => {
    try {
      const response = await fetch("/api/caja/movimientos?pendientes=true")
      const data = await response.json()

      if (response.ok) {
        setMovimientosPendientes(data.movimientos || [])
      }
    } catch (error) {
      console.error("Error al cargar movimientos pendientes:", error)
    }
  }

  const calcularTotales = (movs: Movimiento[]) => {
    const ingresos = movs
      .filter(m => m.tipo_movimiento === "ingreso_adicional")
      .reduce((sum, m) => sum + Number(m.monto), 0)

    const egresos = movs
      .filter(m => m.tipo_movimiento === "egreso_operativo")
      .reduce((sum, m) => sum + Number(m.monto), 0)

    setTotales({
      ingresos,
      egresos,
      neto: ingresos - egresos
    })
  }

  const calcularEfectivoDisponible = (movs: Movimiento[]) => {
    if (!session) return

    const fondoInicial = Number(session.fondo_inicial || 0)
    const ventasEfectivo = Number(session.total_ventas_efectivo || 0)
    const retiros = Number(session.total_retiros || 0)
    const gastos = Number(session.total_gastos || 0)

    // Movimientos solo en efectivo
    const ingresosEfectivo = movs
      .filter(m => m.tipo_movimiento === "ingreso_adicional" && m.metodo_pago === "efectivo")
      .reduce((sum, m) => sum + Number(m.monto), 0)

    const egresosEfectivo = movs
      .filter(m => m.tipo_movimiento === "egreso_operativo" && m.metodo_pago === "efectivo")
      .reduce((sum, m) => sum + Number(m.monto), 0)

    const disponible = fondoInicial + ventasEfectivo + ingresosEfectivo - retiros - gastos - egresosEfectivo
    setEfectivoDisponible(Math.max(0, disponible))
  }

  const handleMovimientoCreado = () => {
    loadMovimientos()
    if (canAuthorize) {
      loadMovimientosPendientes()
    }
  }

  if (authLoading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasActiveSession) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes una sesión de caja activa. Abre una sesión para registrar movimientos.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimientos de Caja</h1>
          <p className="text-muted-foreground">
            Sesión: {session?.codigo_sesion}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowGuia(true)}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Ayuda
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Cards de Totales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Adicionales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +${totales.ingresos.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Egresos Operativos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -${totales.egresos.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totales.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totales.neto.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Efectivo en Caja</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${efectivoDisponible.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Efectivo físico disponible
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="todos" className="w-full">
        <TabsList>
          <TabsTrigger value="todos">
            Todos los Movimientos
            {movimientos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {movimientos.length}
              </Badge>
            )}
          </TabsTrigger>
          {canAuthorize && (
            <TabsTrigger value="pendientes">
              <Clock className="h-4 w-4 mr-2" />
              Pendientes de Autorización
              {movimientosPendientes.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {movimientosPendientes.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="todos" className="mt-6">
          {isLoadingMovimientos ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <MovimientosList
              movimientos={movimientos}
              onUpdate={handleMovimientoCreado}
              canDelete={isAdmin}
              canAuthorize={false}
            />
          )}
        </TabsContent>

        {canAuthorize && (
          <TabsContent value="pendientes" className="mt-6">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Autorización de Movimientos</CardTitle>
                <CardDescription>
                  Los movimientos superiores a $100.000 COP requieren autorización antes de ser procesados
                </CardDescription>
              </CardHeader>
            </Card>

            <MovimientosList
              movimientos={movimientosPendientes}
              onUpdate={handleMovimientoCreado}
              canDelete={false}
              canAuthorize={true}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Modal */}
      <MovimientoModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleMovimientoCreado}
        sesionCajaId={session?.id || 0}
      />

      {/* Modal de Guía */}
      <MovimientosGuiaModal
        open={showGuia}
        onClose={() => setShowGuia(false)}
      />
    </div>
  )
}
