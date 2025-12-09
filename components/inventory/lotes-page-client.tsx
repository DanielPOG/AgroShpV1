"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, AlertTriangle, Package, Search } from "lucide-react"
import { CreateLoteModal } from "@/components/inventory/create-lote-modal"
import { EditLoteModal } from "@/components/inventory/edit-lote-modal"
import { AdjustLoteStockModal } from "@/components/inventory/adjust-lote-stock-modal"
import { RetireLoteModal } from "@/components/inventory/retire-lote-modal"
import { ReactivateLoteModal } from "@/components/inventory/reactivate-lote-modal"
import { LoteDetailModal } from "@/components/inventory/lote-detail-modal"
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
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null)
  const [selectedLoteCodigo, setSelectedLoteCodigo] = useState<string>("") 
  const [isEditLoteOpen, setIsEditLoteOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)
  const [isRetireLoteOpen, setIsRetireLoteOpen] = useState(false)
  const [isReactivateLoteOpen, setIsReactivateLoteOpen] = useState(false)
  const [isLoteDetailOpen, setIsLoteDetailOpen] = useState(false)
  const [unidadesProductivas, setUnidadesProductivas] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Todos los lotes con búsqueda
  const { lotes: todosLotes, isLoading, error, refetch } = useLotes({ 
    page: 1, 
    limit: 100,
    search: debouncedSearch || undefined
  })
  
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
          fetch('/api/productos?limit=100&activo=true') // Solo productos activos
        ])
        
        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json()
          // La API de unidades retorna { data: [], pagination: {} }
          setUnidadesProductivas(unidadesData.data || [])
        }
        
        if (productosRes.ok) {
          const productosData = await productosRes.json()
          // Filtrar solo productos activos en el cliente también (doble validación)
          const productosActivos = (productosData.data || []).filter((p: any) => p.activo !== false)
          setProductos(productosActivos)
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

  const handleEditLote = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsEditLoteOpen(true)
  }

  const handleAdjustStock = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsAdjustStockOpen(true)
  }

  const handleRetireLote = (loteId: number, codigo: string) => {
    setSelectedLoteId(loteId)
    setSelectedLoteCodigo(codigo)
    setIsRetireLoteOpen(true)
  }

  const handleReactivateLote = (loteId: number, codigo: string) => {
    setSelectedLoteId(loteId)
    setSelectedLoteCodigo(codigo)
    setIsReactivateLoteOpen(true)
  }

  const handleViewLoteDetail = (loteId: number) => {
    setSelectedLoteId(loteId)
    setIsLoteDetailOpen(true)
  }

  const handleLoteSuccess = () => {
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
      {/* Barra de búsqueda y botón crear */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código de lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lote
        </Button>
      </div>

      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          {todosLotes.length === 0 && debouncedSearch ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se encontraron lotes con el código "{debouncedSearch}"</p>
                <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2">
                  Limpiar búsqueda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <LotesList 
              lotes={todosLotes} 
              showProductInfo={true}
              onEdit={handleEditLote}
              onAdjustStock={handleAdjustStock}
              onRetire={handleRetireLote}
              onReactivate={handleReactivateLote}
              onViewDetail={handleViewLoteDetail}
            />
          )}
        </TabsContent>

        <TabsContent value="disponibles" className="mt-6">
          <LotesList 
            lotes={lotesDisponibles} 
            showProductInfo={true}
            onEdit={handleEditLote}
            onAdjustStock={handleAdjustStock}
            onRetire={handleRetireLote}
            onReactivate={handleReactivateLote}
            onViewDetail={handleViewLoteDetail}
          />
        </TabsContent>

        <TabsContent value="proximos" className="mt-6">
          {loadingProximos ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <LotesList 
              lotes={lotesProximos || []} 
              showProductInfo={true}
              onEdit={handleEditLote}
              onAdjustStock={handleAdjustStock}
              onRetire={handleRetireLote}
              onReactivate={handleReactivateLote}
              onViewDetail={handleViewLoteDetail}
            />
          )}
        </TabsContent>

        <TabsContent value="vencidos" className="mt-6">
          <LotesList 
            lotes={lotesVencidos} 
            showProductInfo={true}
            onEdit={handleEditLote}
            onAdjustStock={handleAdjustStock}
            onRetire={handleRetireLote}
            onReactivate={handleReactivateLote}
            onViewDetail={handleViewLoteDetail}
          />
        </TabsContent>

        <TabsContent value="retirados" className="mt-6">
          <LotesList 
            lotes={lotesRetirados} 
            showProductInfo={true}
            onRetire={handleRetireLote}
            onReactivate={handleReactivateLote}
            onViewDetail={handleViewLoteDetail}
          />
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

      {/* Modales de gestión de lotes */}
      <EditLoteModal
        loteId={selectedLoteId}
        isOpen={isEditLoteOpen}
        onClose={() => {
          setIsEditLoteOpen(false)
          setSelectedLoteId(null)
        }}
        onSuccess={handleLoteSuccess}
      />
      
      <AdjustLoteStockModal
        loteId={selectedLoteId}
        isOpen={isAdjustStockOpen}
        onClose={() => {
          setIsAdjustStockOpen(false)
          setSelectedLoteId(null)
        }}
        onSuccess={handleLoteSuccess}
      />

      <RetireLoteModal
        loteId={selectedLoteId}
        loteCodigo={selectedLoteCodigo}
        isOpen={isRetireLoteOpen}
        onClose={() => {
          setIsRetireLoteOpen(false)
          setSelectedLoteId(null)
          setSelectedLoteCodigo("")
        }}
        onSuccess={handleLoteSuccess}
      />

      <ReactivateLoteModal
        loteId={selectedLoteId}
        loteCodigo={selectedLoteCodigo}
        isOpen={isReactivateLoteOpen}
        onClose={() => {
          setIsReactivateLoteOpen(false)
          setSelectedLoteId(null)
          setSelectedLoteCodigo("")
        }}
        onSuccess={handleLoteSuccess}
      />

      <LoteDetailModal
        loteId={selectedLoteId}
        isOpen={isLoteDetailOpen}
        onClose={() => {
          setIsLoteDetailOpen(false)
          setSelectedLoteId(null)
        }}
      />
    </div>
  )
}
