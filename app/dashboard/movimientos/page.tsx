"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ArrowLeftRight, TrendingUp, Loader2 } from "lucide-react"
import { MovementWizard } from "@/components/movements/movement-wizard"
import { MovementHistory } from "@/components/movements/movement-history"
import { mockMovements, productiveUnits } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"

export default function MovimientosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [movements, setMovements] = useState(mockMovements)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    
    // Verificar que tenga permisos de movimientos
    if (!isLoading && isAuthenticated && !hasPermission('movimientos') && !hasPermission('all')) {
      router.push("/dashboard")
      return
    }
  }, [isAuthenticated, isLoading, hasPermission, router])

  const handleMovementComplete = (movementData: any) => {
    toast({
      title: "Movimiento Registrado",
      description: "El movimiento se ha registrado exitosamente",
    })
    console.log("[v0] Movement data:", movementData)
  }

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando movimientos...</p>
        </div>
      </div>
    )
  }

  const todayMovements = movements.filter((m) => {
    const movementDate = new Date(m.date)
    const today = new Date()
    return (
      movementDate.getDate() === today.getDate() &&
      movementDate.getMonth() === today.getMonth() &&
      movementDate.getFullYear() === today.getFullYear()
    )
  })

  const totalUnits = productiveUnits.length
  const activeMovements = todayMovements.length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role as string} userName={user.name || "Usuario"} />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-6 lg:p-8">
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
                <div className="text-2xl font-bold">{activeMovements}</div>
                <p className="text-xs text-muted-foreground">Transferencias realizadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unidades Activas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUnits}</div>
                <p className="text-xs text-muted-foreground">Unidades productivas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{movements.length}</div>
                <p className="text-xs text-muted-foreground">Movimientos registrados</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="mb-6">
            <Button onClick={() => setIsWizardOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </div>

          {/* Movement History */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>Últimos movimientos entre unidades productivas</CardDescription>
            </CardHeader>
            <CardContent>
              <MovementHistory movements={movements} />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Movement Wizard Modal */}
      <MovementWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleMovementComplete}
      />
    </div>
  )
}
