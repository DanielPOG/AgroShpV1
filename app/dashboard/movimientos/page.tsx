"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ArrowLeftRight, TrendingUp } from "lucide-react"
import { MovementWizard } from "@/components/movements/movement-wizard"
import { MovementHistory } from "@/components/movements/movement-history"
import { mockMovements, productiveUnits } from "@/lib/mock-data"
import type { User } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function MovimientosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [movements, setMovements] = useState(mockMovements)

  useEffect(() => {
    const storedUser = localStorage.getItem("agroshop_user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("agroshop_user")
    router.push("/login")
  }

  const handleMovementComplete = (movementData: any) => {
    toast({
      title: "Movimiento Registrado",
      description: "El movimiento se ha registrado exitosamente",
    })
    console.log("[v0] Movement data:", movementData)
  }

  if (!user) {
    return null
  }

  const todayMovements = movements.filter((m) => {
    const movementDate = new Date(m.date)
    const today = new Date()
    return movementDate.toDateString() === today.toDateString()
  }).length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} userName={user.name} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <DashboardHeader title="Movimientos" description="Gestión de transferencias" />
            <Button onClick={() => setIsWizardOpen(true)} size="sm" className="text-xs sm:text-sm w-full xs:w-auto">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Nuevo
            </Button>
          </div>

          <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 mb-4 sm:mb-6">
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Movimientos Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{todayMovements}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">transferencias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Movimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-chart-4/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{movements.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">este mes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="xs:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Unidades Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                    <span className="text-lg sm:text-xl">{productiveUnits[0].icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{productiveUnits.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">unidades</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-4 sm:mb-6">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Unidades Productivas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Red de transferencias disponibles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                {productiveUnits.map((unit) => (
                  <Card key={unit.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-2 sm:p-3 lg:p-4 text-center">
                      <div className="text-2xl sm:text-3xl lg:text-4xl mb-1 sm:mb-2">{unit.icon}</div>
                      <p className="font-semibold text-[10px] sm:text-xs lg:text-sm line-clamp-1">{unit.name}</p>
                      <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                        {unit.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Historial de Movimientos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Últimas transferencias registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <MovementHistory movements={movements} />
            </CardContent>
          </Card>
        </div>
      </main>

      <MovementWizard open={isWizardOpen} onClose={() => setIsWizardOpen(false)} onComplete={handleMovementComplete} />
    </div>
  )
}
