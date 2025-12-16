"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IniciarTurnoModal } from "@/components/caja/iniciar-turno-modal"
import { FinalizarTurnoModal } from "@/components/caja/finalizar-turno-modal"
import { cajaEvents } from "@/lib/events"
import { 
  Clock, 
  Plus, 
  Loader2,
  PlayCircle,
  StopCircle,
  PauseCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  User,
  DollarSign,
  Calendar,
  Timer,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { TIPOS_RELEVO_LABELS } from "@/lib/validations/turno-caja.schema"

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
  sesionCaja: SesionCaja | null
  userId: number
  userRole: string
}

interface Turno {
  id: number
  efectivo_inicial: number | string
  efectivo_final: number | string | null
  monto_inicial: number | string
  monto_final: number | string | null
  diferencia: number | string | null
  tipo_relevo: string
  estado: string
  fecha_inicio: string | Date
  fecha_fin: string | Date | null
  observaciones: string | null
  observaciones_cierre: string | null
  motivo_suspension: string | null
  duracion_minutos: number | null
  cajero: {
    id: number
    nombre: string
    apellido: string
  }
  autorizador?: {
    nombre: string
    apellido: string
  } | null
}

export function TurnosPageClient({ sesionCaja, userId, userRole }: TurnosPageClientProps) {
  const [iniciarModalOpen, setIniciarModalOpen] = useState(false)
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false)
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [turnosFiltrados, setTurnosFiltrados] = useState<Turno[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loadingTurnos, setLoadingTurnos] = useState(true)
  const [loadingTurnoActivo, setLoadingTurnoActivo] = useState(true)
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true)
  const [expandedTurnos, setExpandedTurnos] = useState<Set<number>>(new Set())

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterCajero, setFilterCajero] = useState<string>("todos")

  const isAdmin = userRole === "Admin"
  const isSupervisor = userRole === "Supervisor"
  const canManage = isAdmin || isSupervisor
  const isCajero = userRole === "Cajero"

  const loadTurnoActivo = async () => {
    setLoadingTurnoActivo(true)
    try {
      if (!sesionCaja) {
        setTurnoActivo(null)
        setLoadingTurnoActivo(false)
        return
      }
      const response = await fetch(`/api/turnos?sesion_id=${sesionCaja.id}&activo=true`)
      if (response.ok) {
        const data = await response.json()
        setTurnoActivo(data.turno)
      } else {
        setTurnoActivo(null)
      }
    } catch (error) {
      console.error("Error cargando turno activo:", error)
      setTurnoActivo(null)
    } finally {
      setLoadingTurnoActivo(false)
    }
  }

  const loadTurnos = async () => {
    setLoadingTurnos(true)
    try {
      if (!sesionCaja) {
        setTurnos([])
        setTurnosFiltrados([])
        setLoadingTurnos(false)
        return
      }

      const response = await fetch(`/api/turnos?sesion_id=${sesionCaja.id}`)
      if (response.ok) {
        const data = await response.json()
        const turnosList = data.turnos || []
        
        // Si es cajero, filtrar solo sus turnos
        const turnosFiltrados = isCajero 
          ? turnosList.filter((t: Turno) => t.cajero.id === userId)
          : turnosList
        
        setTurnos(turnosFiltrados)
        setTurnosFiltrados(turnosFiltrados)
      } else {
        setTurnos([])
        setTurnosFiltrados([])
      }
    } catch (error) {
      console.error("Error cargando turnos:", error)
      setTurnos([])
      setTurnosFiltrados([])
    } finally {
      setLoadingTurnos(false)
    }
  }

  useEffect(() => {
    loadTurnoActivo()
    loadTurnos()
  }, [sesionCaja?.id, userId])

  // Calcular estadísticas desde los turnos cargados
  useEffect(() => {
    if (turnos.length > 0) {
      const stats = {
        total: turnos.length,
        activos: turnos.filter(t => t.estado === 'activo').length,
        finalizados: turnos.filter(t => t.estado === 'finalizado').length,
        suspendidos: turnos.filter(t => t.estado === 'suspendido').length,
      }
      setEstadisticas(stats)
      setLoadingEstadisticas(false)
    } else {
      setEstadisticas({ total: 0, activos: 0, finalizados: 0, suspendidos: 0 })
      setLoadingEstadisticas(false)
    }
  }, [turnos])

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...turnos]

    // Filtro por búsqueda (nombre cajero)
    if (searchTerm) {
      filtered = filtered.filter(t => 
        `${t.cajero.nombre} ${t.cajero.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por estado
    if (filterEstado !== "todos") {
      filtered = filtered.filter(t => t.estado === filterEstado)
    }

    // Filtro por cajero
    if (filterCajero !== "todos") {
      filtered = filtered.filter(t => t.cajero.id.toString() === filterCajero)
    }

    setTurnosFiltrados(filtered)
  }, [searchTerm, filterEstado, filterCajero, turnos])

  const handleSuccess = () => {
    loadTurnoActivo()
    loadTurnos()
    // Emitir evento para que otros componentes se actualicen
    console.log('🔔 Emitiendo evento session-updated después de cambio en turno')
    cajaEvents.emit('session-updated')
  }

  const handleFinalize = (turno: Turno) => {
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
      const response = await fetch(`/api/turnos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suspender",
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
      const response = await fetch(`/api/turnos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reanudar",
        }),
      })

      if (response.ok) {
        handleSuccess()
      }
    } catch (error) {
      console.error("Error reanudando turno:", error)
    }
  }

  const toggleExpandTurno = (id: number) => {
    const newExpanded = new Set(expandedTurnos)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedTurnos(newExpanded)
  }

  const calcularDuracion = (fechaInicio: Date, fechaFin: Date | null) => {
    const inicio = new Date(fechaInicio)
    const fin = fechaFin ? new Date(fechaFin) : new Date()
    const diff = fin.getTime() - inicio.getTime()
    const horas = Math.floor(diff / (1000 * 60 * 60))
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${horas}h ${minutos}m`
  }

  // Obtener lista única de cajeros para el filtro
  const cajerosUnicos = Array.from(new Set(turnos.map(t => t.cajero.id)))
    .map(id => {
      const turno = turnos.find(t => t.cajero.id === id)!
      return { id, nombre: `${turno.cajero.nombre} ${turno.cajero.apellido}` }
    })

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Turnos de Caja</h1>
          {sesionCaja ? (
            <p className="text-muted-foreground">
              Sesión: {sesionCaja.codigo_sesion} - {sesionCaja.caja.nombre} ({sesionCaja.caja.codigo})
            </p>
          ) : (
            <p className="text-muted-foreground">
              {isCajero ? "Mis turnos" : "Todos los turnos del sistema"}
            </p>
          )}
        </div>
        {!turnoActivo && sesionCaja?.estado === 'abierta' && (
          <Button onClick={() => setIniciarModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Iniciar Turno
          </Button>
        )}
      </div>

      {/* Turno Activo PROMINENTE */}
      {loadingTurnoActivo ? (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Cargando turno activo...</AlertDescription>
        </Alert>
      ) : turnoActivo ? (
        <Card className="border-2 border-green-500 shadow-lg">
          <CardHeader className="bg-green-50 dark:bg-green-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-6 w-6 text-green-600" />
                <CardTitle className="text-xl">Turno Activo</CardTitle>
                <Badge variant="default" className="bg-green-600">
                  En Curso
                </Badge>
              </div>
              <Button
                variant="default"
                onClick={() => handleFinalize(turnoActivo)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Finalizar Turno
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Monto Inicial */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Monto Inicial</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(Number(turnoActivo.efectivo_inicial))}
                </p>
              </div>

              {/* Hora Inicio */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Inicio</p>
                <p className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(turnoActivo.fecha_inicio), "HH:mm", { locale: es })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(turnoActivo.fecha_inicio), "dd/MM/yyyy", { locale: es })}
                </p>
              </div>

              {/* Duración */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Duración</p>
                <p className="text-xl font-semibold flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  {calcularDuracion(new Date(turnoActivo.fecha_inicio), null)}
                </p>
              </div>

              {/* Tipo Relevo */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant="outline" className="text-sm">
                  {TIPOS_RELEVO_LABELS[turnoActivo.tipo_relevo as keyof typeof TIPOS_RELEVO_LABELS]}
                </Badge>
                {turnoActivo.autorizador && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Autorizado por: {turnoActivo.autorizador.nombre}
                  </p>
                )}
              </div>
            </div>

            {turnoActivo.observaciones_inicio && (
              <div className="mt-4 p-3 bg-muted rounded-md border-l-4 border-blue-500">
                <p className="text-sm font-medium mb-1">Observaciones:</p>
                <p className="text-sm text-muted-foreground">{turnoActivo.observaciones_inicio}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !sesionCaja ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay sesión de caja activa. Mostrando historial de turnos.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes un turno activo. Inicia un turno para comenzar a trabajar en caja.
          </AlertDescription>
        </Alert>
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

      {/* Filtros */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cajero o código sesión..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cajero</label>
                <Select value={filterCajero} onValueChange={setFilterCajero}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {cajerosUnicos.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Turnos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historial de Turnos</span>
            <Badge variant="secondary">{turnosFiltrados.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTurnos ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay turnos</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterEstado !== "todos" || filterCajero !== "todos"
                  ? "No se encontraron turnos con los filtros aplicados"
                  : "Los turnos de caja aparecerán aquí"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {turnosFiltrados.map((turno) => {
                const isExpanded = expandedTurnos.has(turno.id)
                const montoInicial = Number(turno.efectivo_inicial)
                const montoFinal = turno.efectivo_final ? Number(turno.efectivo_final) : null
                const diferencia = turno.diferencia ? Number(turno.diferencia) : null

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

                const EstadoIcon = ESTADO_ICONS[turno.estado as keyof typeof ESTADO_ICONS]
                const colorClass = ESTADO_COLORS[turno.estado as keyof typeof ESTADO_COLORS]

                return (
                  <Card key={turno.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Header del Turno */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex gap-3 flex-1">
                          <div className={`rounded-full p-2.5 ${colorClass.split(' ')[0]} flex-shrink-0`}>
                            <EstadoIcon className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                          </div>

                          <div className="flex-1 space-y-2">
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

                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">
                                {turno.cajero.nombre} {turno.cajero.apellido}
                              </span>
                            </div>

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

                              {montoFinal !== null && (
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
                              )}

                              {diferencia !== null && (
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
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(new Date(turno.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                <span>{calcularDuracion(new Date(turno.fecha_inicio), turno.fecha_fin ? new Date(turno.fecha_fin) : null)}</span>
                              </div>

                              {sesionCaja && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {sesionCaja.caja.nombre} - {sesionCaja.codigo_sesion}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {turno.estado === 'activo' && (
                            <>
                              {turno.cajero.id === userId && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleFinalize(turno)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <StopCircle className="h-4 w-4 mr-1" />
                                  Finalizar
                                </Button>
                              )}

                              {canManage && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSuspend(turno.id)}
                                >
                                  <PauseCircle className="h-4 w-4 mr-1" />
                                  Suspender
                                </Button>
                              )}
                            </>
                          )}

                          {turno.estado === 'suspendido' && canManage && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleResume(turno.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Reanudar
                            </Button>
                          )}

                          {turno.estado === 'finalizado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandTurno(turno.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Detalles Expandidos */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <h4 className="font-semibold">Información del Turno</h4>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                              <p className="text-xs text-muted-foreground mb-1">Efectivo Inicial</p>
                              <p className="text-lg font-bold text-blue-600">
                                {new Intl.NumberFormat("es-CO", {
                                  style: "currency",
                                  currency: "COP",
                                  minimumFractionDigits: 0,
                                }).format(montoInicial)}
                              </p>
                            </div>

                            {montoFinal !== null && (
                              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-md">
                                <p className="text-xs text-muted-foreground mb-1">Efectivo Final</p>
                                <p className="text-lg font-bold text-purple-600">
                                  {new Intl.NumberFormat("es-CO", {
                                    style: "currency",
                                    currency: "COP",
                                    minimumFractionDigits: 0,
                                  }).format(montoFinal)}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Diferencia */}
                          {diferencia !== null && turno.estado === 'finalizado' && (
                            <div className={`p-4 rounded-md ${
                              diferencia === 0
                                ? 'bg-gray-100 dark:bg-gray-900'
                                : diferencia > 0
                                ? 'bg-green-100 dark:bg-green-950'
                                : 'bg-red-100 dark:bg-red-950'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium mb-1">
                                    {diferencia === 0 ? '✅ Sin Diferencia' : diferencia > 0 ? '📈 Sobrante' : '📉 Faltante'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {diferencia === 0 
                                      ? 'El turno cerró sin diferencias' 
                                      : `Diferencia en el cierre del turno`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold">
                                    {new Intl.NumberFormat("es-CO", {
                                      style: "currency",
                                      currency: "COP",
                                      minimumFractionDigits: 0,
                                      signDisplay: "exceptZero"
                                    }).format(diferencia)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Observaciones */}
                          {turno.observaciones && (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-xs text-muted-foreground mb-1">Observaciones Inicio</p>
                              <p className="text-sm">{turno.observaciones}</p>
                            </div>
                          )}

                          {turno.observaciones_cierre && (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-xs text-muted-foreground mb-1">Observaciones Cierre</p>
                              <p className="text-sm">{turno.observaciones_cierre}</p>
                            </div>
                          )}

                          {turno.motivo_suspension && (
                            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md">
                              <p className="text-xs text-muted-foreground mb-1">Motivo de Suspensión</p>
                              <p className="text-sm">{turno.motivo_suspension}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      {sesionCaja && (
        <IniciarTurnoModal
          open={iniciarModalOpen}
          onOpenChange={setIniciarModalOpen}
          sesionCajaId={sesionCaja.id}
          onSuccess={handleSuccess}
        />
      )}

      {turnoActivo && (
        <FinalizarTurnoModal
          open={finalizarModalOpen}
          onOpenChange={setFinalizarModalOpen}
          turnoId={turnoActivo.id}
          montoInicial={Number(turnoActivo.efectivo_inicial)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
