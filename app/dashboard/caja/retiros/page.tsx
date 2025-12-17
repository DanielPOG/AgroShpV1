"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useCashSession } from "@/hooks/use-cash-session"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RetiroModal } from "@/components/caja/retiro-modal"
import { RetirosList } from "@/components/caja/retiros-list"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Banknote,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  TrendingDown
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Retiro {
  id: number
  monto: number
  motivo: string
  destino_fondos: string | null
  estado: string | null
  fecha_solicitud: string | null
  fecha_respuesta: string | null
  observaciones: string | null
  recibo_url: string | null
  solicitante: {
    id: number
    nombre: string
    apellido: string
  } | null
  autorizador: {
    id: number
    nombre: string
    apellido: string
  } | null
  sesion_caja?: {
    caja: {
      nombre: string
    }
  }
}

export default function RetirosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { session, hasActiveSession, loading: sessionLoading } = useCashSession()

  const [retiros, setRetiros] = useState<Retiro[]>([])
  const [retirosPendientes, setRetirosPendientes] = useState<Retiro[]>([])
  const [retirosAutorizados, setRetirosAutorizados] = useState<Retiro[]>([])
  const [isLoadingRetiros, setIsLoadingRetiros] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [totalRetiros, setTotalRetiros] = useState(0)

  const isAdmin = user?.role === "Admin"
  const canAuthorize = isAdmin

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (hasActiveSession && session) {
      loadRetiros()
    }
  }, [hasActiveSession, session])

  useEffect(() => {
    if (canAuthorize) {
      loadRetirosPendientes()
      loadRetirosAutorizados()
    }
  }, [canAuthorize])

  const loadRetiros = async () => {
    if (!session?.id) return

    setIsLoadingRetiros(true)
    try {
      const response = await fetch(`/api/caja/retiros?sesion_id=${session.id}`)
      const data = await response.json()

      if (response.ok) {
        setRetiros(data.retiros || [])
        calcularTotal(data.retiros || [])
      }
    } catch (error) {
      console.error("Error al cargar retiros:", error)
    } finally {
      setIsLoadingRetiros(false)
    }
  }

  const loadRetirosPendientes = async () => {
    try {
      const response = await fetch("/api/caja/retiros?pendientes=true")
      const data = await response.json()

      if (response.ok) {
        setRetirosPendientes(data.retiros || [])
      }
    } catch (error) {
      console.error("Error al cargar retiros pendientes:", error)
    }
  }

  const loadRetirosAutorizados = async () => {
    try {
      const response = await fetch("/api/caja/retiros?autorizados=true")
      const data = await response.json()

      if (response.ok) {
        setRetirosAutorizados(data.retiros || [])
      }
    } catch (error) {
      console.error("Error al cargar retiros autorizados:", error)
    }
  }

  const calcularTotal = (retirosArray: Retiro[]) => {
    const total = retirosArray
      .filter(r => r.estado === "completado" || r.estado === "autorizado")
      .reduce((sum, r) => sum + Number(r.monto), 0)
    setTotalRetiros(total)
  }

  const handleRetiroCreado = () => {
    loadRetiros()
    if (canAuthorize) {
      loadRetirosPendientes()
      loadRetirosAutorizados()
    }
  }

  if (authLoading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Solo validar sesión de caja si NO es admin
  if (!hasActiveSession && !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes una sesión de caja activa. Abre una sesión para solicitar retiros.
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
          <h1 className="text-3xl font-bold">Retiros de Caja</h1>
          <p className="text-muted-foreground">
            {session?.codigo_sesion ? `Sesión: ${session.codigo_sesion}` : 'Todas las sesiones'}
          </p>
        </div>
        {hasActiveSession && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Solicitar Retiro
          </Button>
        )}
      </div>

      {/* Card de Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Retirado</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">
            ${totalRetiros.toLocaleString('es-CO')}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Retiros autorizados y completados
          </p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="mis-retiros" className="w-full">
        <TabsList>
          <TabsTrigger value="mis-retiros">
            Mis Retiros
            {retiros.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {retiros.length}
              </Badge>
            )}
          </TabsTrigger>
          {canAuthorize && (
            <>
              <TabsTrigger value="pendientes">
                <Clock className="h-4 w-4 mr-2" />
                Pendientes de Autorización
                {retirosPendientes.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {retirosPendientes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="autorizados">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Autorizados
                {retirosAutorizados.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {retirosAutorizados.length}
                  </Badge>
                )}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="mis-retiros" className="mt-6">
          {isLoadingRetiros ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <RetirosList
              retiros={retiros}
              onUpdate={handleRetiroCreado}
              canAuthorize={false}
              canComplete={false}
              canCancel={true}
            />
          )}
        </TabsContent>

        {canAuthorize && (
          <>
            <TabsContent value="pendientes" className="mt-6">
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">Autorización de Retiros</CardTitle>
                  <CardDescription>
                    Revisa y autoriza las solicitudes de retiro de efectivo de la caja
                  </CardDescription>
                </CardHeader>
              </Card>

              <RetirosList
                retiros={retirosPendientes}
                onUpdate={handleRetiroCreado}
                canAuthorize={true}
                canComplete={false}
                canCancel={false}
              />
            </TabsContent>

            <TabsContent value="autorizados" className="mt-6">
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">Completar Retiros</CardTitle>
                  <CardDescription>
                    Marca como completados los retiros que ya fueron procesados
                  </CardDescription>
                </CardHeader>
              </Card>

              <RetirosList
                retiros={retirosAutorizados}
                onUpdate={handleRetiroCreado}
                canAuthorize={false}
                canComplete={true}
                canCancel={false}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Modal */}
      <RetiroModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRetiroCreado}
        sesionCajaId={session?.id || 0}
      />
    </div>
  )
}
