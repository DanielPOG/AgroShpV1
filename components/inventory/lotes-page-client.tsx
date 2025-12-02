"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, AlertTriangle, Package } from "lucide-react"
import { CreateLoteModal } from "@/components/inventory/create-lote-modal"
import { LotesList } from "@/components/inventory/lotes-list"
import { useLotes } from "@/hooks/use-lotes"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export function LotesPageClient() {
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [unidadesProductivas, setUnidadesProductivas] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  
  // Todos los lotes
  const { lotes: todosLotes, isLoading, error, refetch } = useLotes({ page: 1, limit: 100 })
  
  // Lotes próximos a vencer (7 días)
  const { lotes: lotesProximos, isLoading: loadingProximos } = useLotes({ 
    dias_vencimiento: 7,
    page: 1, 
    limit: 100 
  })

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [unidadesRes, productosRes] = await Promise.all([
          fetch('/api/unidades'),
          fetch('/api/productos?limit=100')
        ])
        
        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json()
          // La API de unidades retorna un array directamente
          setUnidadesProductivas(Array.isArray(unidadesData) ? unidadesData : [])
        }
        
        if (productosRes.ok) {
          const productosData = await productosRes.json()
          setProductos(productosData.data || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  const handleLoteCreated = () => {
    toast({
      title: "Lote creado",
      description: "El lote ha sido creado exitosamente",
    })
    setIsCreateOpen(false)
    refetch(true)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error al cargar lotes</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const lotesDisponibles = todosLotes.filter(l => l.estado === 'disponible')
  const lotesVencidos = todosLotes.filter(l => {
    if (!l.fecha_vencimiento) return false
    return new Date(l.fecha_vencimiento) < new Date() && l.estado === 'disponible'
  })
  const lotesRetirados = todosLotes.filter(l => l.estado === 'retirado')

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Lotes</CardDescription>
              <CardTitle className="text-3xl">{todosLotes.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Disponibles</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {lotesDisponibles.length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Próximos a Vencer</CardDescription>
              <CardTitle className="text-3xl text-orange-500">
                {lotesProximos?.length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Vencidos</CardDescription>
              <CardTitle className="text-3xl text-destructive">
                {lotesVencidos.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        
        <Button onClick={() => setIsCreateOpen(true)} className="ml-4">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lote
        </Button>
      </div>

      {/* Alertas de vencimiento */}
      {lotesProximos && lotesProximos.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-600">
            Atención: {lotesProximos.length} lote{lotesProximos.length !== 1 ? 's' : ''} próximo{lotesProximos.length !== 1 ? 's' : ''} a vencer
          </AlertTitle>
          <AlertDescription className="text-orange-700">
            Revisa los lotes que vencen en los próximos 7 días en la pestaña "Próximos a Vencer"
          </AlertDescription>
        </Alert>
      )}

      {lotesVencidos.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {lotesVencidos.length} lote{lotesVencidos.length !== 1 ? 's' : ''} vencido{lotesVencidos.length !== 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription>
            Cambia el estado de estos lotes a "Retirado" o elimínalos del inventario
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs con filtros */}
      <Tabs defaultValue="todos" className="w-full">
        <TabsList>
          <TabsTrigger value="todos">
            Todos
            <Badge variant="secondary" className="ml-2">
              {todosLotes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="disponibles">
            Disponibles
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              {lotesDisponibles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="proximos">
            Próximos a Vencer
            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
              {lotesProximos?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="vencidos">
            Vencidos
            <Badge variant="destructive" className="ml-2">
              {lotesVencidos.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="retirados">
            Retirados
            <Badge variant="secondary" className="ml-2">
              {lotesRetirados.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-6">
          <LotesList lotes={todosLotes} showProductInfo={true} />
        </TabsContent>

        <TabsContent value="disponibles" className="mt-6">
          <LotesList lotes={lotesDisponibles} showProductInfo={true} />
        </TabsContent>

        <TabsContent value="proximos" className="mt-6">
          {loadingProximos ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <LotesList lotes={lotesProximos || []} showProductInfo={true} />
          )}
        </TabsContent>

        <TabsContent value="vencidos" className="mt-6">
          <LotesList lotes={lotesVencidos} showProductInfo={true} />
        </TabsContent>

        <TabsContent value="retirados" className="mt-6">
          <LotesList lotes={lotesRetirados} showProductInfo={true} />
        </TabsContent>
      </Tabs>

      {/* Modal de crear lote */}
      <CreateLoteModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleLoteCreated}
        productos={productos}
        unidades={unidadesProductivas}
      />
    </div>
  )
}
