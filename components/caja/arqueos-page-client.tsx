"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArqueoModal } from "@/components/caja/arqueo-modal"
import { ArqueosList } from "@/components/caja/arqueos-list"
import { 
  Calculator, 
  Plus, 
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
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

interface ArqueosPageClientProps {
  sesionCaja: SesionCaja | null
  userId: number
  userRole: string
}

export function ArqueosPageClient({ sesionCaja, userId, userRole }: ArqueosPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [arqueos, setArqueos] = useState<any[]>([])
  const [arqueosPendientes, setArqueosPendientes] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loadingArqueos, setLoadingArqueos] = useState(true)
  const [loadingPendientes, setLoadingPendientes] = useState(false)
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true)

  const isAdmin = userRole === "Admin"
  const isSupervisor = userRole === "Supervisor"
  const canApprove = isAdmin || isSupervisor

  const loadArqueos = async () => {
    if (!sesionCaja) return
    
    setLoadingArqueos(true)
    try {
      const response = await fetch(`/api/caja/arqueos?sesion_id=${sesionCaja.id}`)
      if (response.ok) {
        const data = await response.json()
        setArqueos(data)
      }
    } catch (error) {
      console.error("Error cargando arqueos:", error)
    } finally {
      setLoadingArqueos(false)
    }
  }

  const loadPendientes = async () => {
    if (!canApprove) return

    setLoadingPendientes(true)
    try {
      const response = await fetch(`/api/caja/arqueos?pendientes=true`)
      if (response.ok) {
        const data = await response.json()
        setArqueosPendientes(data)
      }
    } catch (error) {
      console.error("Error cargando pendientes:", error)
    } finally {
      setLoadingPendientes(false)
    }
  }

  const loadEstadisticas = async () => {
    setLoadingEstadisticas(true)
    try {
      const response = await fetch(`/api/caja/arqueos?estadisticas=true`)
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
    loadArqueos()
    loadEstadisticas()
    if (canApprove) {
      loadPendientes()
    }
  }, [sesionCaja?.id, canApprove])

  const handleSuccess = () => {
    loadArqueos()
    loadEstadisticas()
    if (canApprove) {
      loadPendientes()
    }
  }

  const handleApprove = async (id: number, observaciones: string) => {
    try {
      const response = await fetch(`/api/caja/arqueos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observaciones_aprobacion: observaciones }),
      })

      if (response.ok) {
        handleSuccess()
      }
    } catch (error) {
      console.error("Error aprobando arqueo:", error)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/caja/arqueos/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        handleSuccess()
      }
    } catch (error) {
      console.error("Error eliminando arqueo:", error)
    }
  }

  // Si no hay sesión activa
  if (!sesionCaja) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes una sesión de caja activa. Para realizar arqueos, primero debes abrir una sesión.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild>
            <a href="/dashboard/caja">Ir a Sesiones de Caja</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arqueos de Caja</h1>
          <p className="text-muted-foreground">
            Sesión: {sesionCaja.codigo_sesion} - {sesionCaja.caja.nombre} ({sesionCaja.caja.codigo})
          </p>
        </div>
        {sesionCaja.estado === 'abierta' && (
          <Button onClick={() => setModalOpen(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            Realizar Arqueo
          </Button>
        )}
      </div>

      {/* Cards Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Total Arqueos
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
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Cuadrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEstadisticas ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {(estadisticas?.total || 0) - (estadisticas?.conDiferencia || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Con Diferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEstadisticas ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">
                {estadisticas?.conDiferencia || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {estadisticas?.sumaDiferencias >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Suma Diferencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEstadisticas ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className={`text-xl font-bold ${
                estadisticas?.sumaDiferencias >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                  signDisplay: "exceptZero"
                }).format(estadisticas?.sumaDiferencias || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs con Listas de Arqueos */}
      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos" className="gap-2">
            Todos los Arqueos
            {!loadingArqueos && <Badge variant="secondary">{arqueos.length}</Badge>}
          </TabsTrigger>
          
          {canApprove && (
            <TabsTrigger value="pendientes" className="gap-2">
              Pendientes Aprobación
              {!loadingPendientes && arqueosPendientes.length > 0 && (
                <Badge variant="destructive">{arqueosPendientes.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          {loadingArqueos ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ArqueosList
              arqueos={arqueos}
              canDelete={isAdmin}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>

        {canApprove && (
          <TabsContent value="pendientes" className="space-y-4">
            {loadingPendientes ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ArqueosList
                arqueos={arqueosPendientes}
                canApprove={true}
                onApprove={handleApprove}
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Modal Realizar Arqueo */}
      {sesionCaja.estado === 'abierta' && (
        <ArqueoModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          sesionCajaId={sesionCaja.id}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
