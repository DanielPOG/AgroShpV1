"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ArrowLeftRight, TrendingUp, Loader2, RefreshCw } from "lucide-react"
import { MovementWizard } from "@/components/movements/movement-wizard"
import { MovementHistory } from "@/components/movements/movement-history"
import { useToast } from "@/hooks/use-toast"

interface Estadisticas {
  total_movimientos: number
  movimientos_hoy: number
  productos_transferidos: number
}

export default function MovimientosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading: authLoading, hasPermission } = useAuth()
  
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total_movimientos: 0,
    movimientos_hoy: 0,
    productos_transferidos: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Verificar permisos y autenticación
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    
    if (!authLoading && isAuthenticated) {
      const tienePermiso = hasPermission('movimientos') || hasPermission('all')
      if (!tienePermiso) {
        router.push("/dashboard")
      }
    }
  }, [isAuthenticated, authLoading, router])

  // Cargar datos solo una vez
  useEffect(() => {
    if (isAuthenticated && !dataLoaded && !authLoading) {
      cargarDatos()
      setDataLoaded(true)
    }
  }, [isAuthenticated, authLoading, dataLoaded])

  const cargarDatos = async () => {
    try {
      setIsLoading(true)
      
      // Cargar movimientos y estadísticas en paralelo
      const [movimientosRes, statsRes] = await Promise.all([
        fetch('/api/movimientos?limit=20'),
        fetch('/api/movimientos?limit=1') // Solo para obtener stats
      ])

      if (movimientosRes.ok) {
        const data = await movimientosRes.json()
        setMovimientos(data.data || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        // Calcular estadísticas desde los datos
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        
        const movimientosHoy = (data.data || []).filter((m: any) => {
          const fecha = new Date(m.fecha_movimiento)
          fecha.setHours(0, 0, 0, 0)
          return fecha.getTime() === hoy.getTime()
        })

        setEstadisticas({
          total_movimientos: data.pagination?.total || 0,
          movimientos_hoy: movimientosHoy.length,
          productos_transferidos: (data.data || []).reduce((acc: number, m: any) => 
            acc + (m.detalle_movimientos?.length || 0), 0
          )
        })
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los movimientos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await cargarDatos()
    setIsRefreshing(false)
    toast({
      title: "Actualizado",
      description: "Datos actualizados correctamente"
    })
  }

  const handleMovementComplete = async () => {
    toast({
      title: "✅ Movimiento Registrado",
      description: "El movimiento se ha registrado exitosamente",
    })
    setDataLoaded(false) // Permitir recargar datos
    await cargarDatos()
    setDataLoaded(true)
  }

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando movimientos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Movimientos entre Unidades"
        description="Gestiona transferencias de productos entre unidades productivas"
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos Hoy</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{estadisticas.movimientos_hoy}</div>
                <p className="text-xs text-muted-foreground">Transferencias realizadas</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Transferidos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{estadisticas.productos_transferidos}</div>
                <p className="text-xs text-muted-foreground">Diferentes productos</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{estadisticas.total_movimientos}</div>
                <p className="text-xs text-muted-foreground">Movimientos registrados</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <Button onClick={() => setIsWizardOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="lg"
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>Últimos movimientos entre unidades productivas</CardDescription>
        </CardHeader>
        <CardContent>
          <MovementHistory movimientos={movimientos} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Movement Wizard Modal */}
      <MovementWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleMovementComplete}
      />
    </div>
  )
}
