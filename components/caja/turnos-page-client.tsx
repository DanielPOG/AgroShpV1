"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { IniciarTurnoModal } from "@/components/caja/iniciar-turno-modal"
import { FinalizarTurnoModal } from "@/components/caja/finalizar-turno-modal"
import { TurnosList } from "@/components/caja/turnos-list"
import { 
  Clock, 
  Plus, 
  Loader2,
  PlayCircle,
  StopCircle,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

interface SesionCaja {
  id: number
  codigo_sesion: string
  estado: string | null
  caja: {
    nombre: string
    codigo: string
  }
}

interface TurnosPageClientProps {
  sesionCaja: SesionCaja
  userId: number
  userRole: string
}

export function TurnosPageClient({ sesionCaja, userId, userRole }: TurnosPageClientProps) {
  const [iniciarModalOpen, setIniciarModalOpen] = useState(false)
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false)
  const [turnoActivo, setTurnoActivo] = useState<any>(null)
  const [turnos, setTurnos] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loadingTurnos, setLoadingTurnos] = useState(true)
  const [loadingTurnoActivo, setLoadingTurnoActivo] = useState(true)
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true)

  const isAdmin = userRole === "Admin"
  const isSupervisor = userRole === "Supervisor"
  const canManage = isAdmin || isSupervisor

  const loadTurnoActivo = async () => {
    setLoadingTurnoActivo(true)
    try {
      const response = await fetch(`/api/caja/turnos?mi_turno=true`)
      if (response.ok) {
        const data = await response.json()
        setTurnoActivo(data)
      }
    } catch (error) {
      console.error("Error cargando turno activo:", error)
    } finally {
      setLoadingTurnoActivo(false)
    }
  }

  const loadTurnos = async () => {
    setLoadingTurnos(true)
    try {
      const response = await fetch(`/api/caja/turnos?sesion_id=${sesionCaja.id}`)
      if (response.ok) {
        const data = await response.json()
        setTurnos(data)
      }
    } catch (error) {
      console.error("Error cargando turnos:", error)
    } finally {
      setLoadingTurnos(false)
    }
  }

  const loadEstadisticas = async () => {
    setLoadingEstadisticas(true)
    try {
      const response = await fetch(`/api/caja/turnos?sesion_id=${sesionCaja.id}&estadisticas=true`)
      if (response.ok) {
        const data = await response.json()
        setEstadisticas(data)
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error)
    } finally {
      setLoadingEstadisticas(false)
    }
  }

  useEffect(() => {
    loadTurnoActivo()
    loadTurnos()
    loadEstadisticas()
  }, [sesionCaja.id])

  const handleSuccess = () => {
    loadTurnoActivo()
    loadTurnos()
    loadEstadisticas()
  }

  const handleFinalize = (turno: any) => {
    setTurnoActivo(turno)
    setFinalizarModalOpen(true)
  }

  const handleSuspend = async (id: number) => {
    const motivo = prompt("Motivo de la suspensión (mínimo 10 caracteres):")
    if (!motivo || motivo.length < 10) {
      alert("Debes proporcionar un motivo válido")
      return
    }

    try {
      const response = await fetch(`/api/caja/turnos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "suspender",
          motivo,
        }),
      })

      if (response.ok) {
        handleSuccess()
      }
    } catch (error) {
      console.error("Error suspendiendo turno:", error)
    }
  }

  const handleResume = async (id: number) => {
    try {
      const response = await fetch(`/api/caja/turnos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "reanudar",
        }),
      })

      if (response.ok) {
        handleSuccess()
      }
    } catch (error) {
      console.error("Error reanudando turno:", error)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Turnos de Caja</h1>
          <p className="text-muted-foreground">
            Sesión: {sesionCaja.codigo_sesion} - {sesionCaja.caja.nombre} ({sesionCaja.caja.codigo})
          </p>
        </div>
        {!turnoActivo && sesionCaja.estado === 'abierta' && (
          <Button onClick={() => setIniciarModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Iniciar Turno
          </Button>
        )}
      </div>

      {/* Turno Activo del Usuario */}
      {turnoActivo ? (
        <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Tienes un turno activo</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Iniciado: {new Date(turnoActivo.fecha_inicio).toLocaleString('es-CO')}
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleFinalize(turnoActivo)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <StopCircle className="h-4 w-4 mr-1" />
              Finalizar Turno
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        loadingTurnoActivo ? (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Cargando turno activo...</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tienes un turno activo. Inicia un turno para comenzar a trabajar en caja.
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Cards Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEstadisticas ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {estadisticas?.total || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEstadisticas ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {estadisticas?.activos || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StopCircle className="h-4 w-4 text-blue-600" />
              Finalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEstadisticas ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {estadisticas?.finalizados || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PauseCircle className="h-4 w-4 text-orange-600" />
              Suspendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEstadisticas ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">
                {estadisticas?.suspendidos || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs con Listas de Turnos */}
      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos" className="gap-2">
            Todos los Turnos
            {!loadingTurnos && <Badge variant="secondary">{turnos.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          {loadingTurnos ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TurnosList
              turnos={turnos}
              canFinalize={true}
              canSuspend={canManage}
              onFinalize={handleFinalize}
              onSuspend={handleSuspend}
              onResume={handleResume}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <IniciarTurnoModal
        open={iniciarModalOpen}
        onOpenChange={setIniciarModalOpen}
        sesionCajaId={sesionCaja.id}
        onSuccess={handleSuccess}
      />

      {turnoActivo && (
        <FinalizarTurnoModal
          open={finalizarModalOpen}
          onOpenChange={setFinalizarModalOpen}
          turnoId={turnoActivo.id}
          montoInicial={Number(turnoActivo.monto_inicial_turno)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
