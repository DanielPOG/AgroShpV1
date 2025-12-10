"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GastoModal } from "@/components/caja/gasto-modal"
import { GastosList } from "@/components/caja/gastos-list"
import { 
  Receipt, 
  Plus, 
  TrendingDown, 
  Loader2,
  ShoppingCart,
  Zap,
  Wrench,
  Truck,
  Users,
  FileText,
  MoreHorizontal,
} from "lucide-react"
import { CATEGORIAS_LABELS } from "@/lib/validations/gasto-caja.schema"

interface SesionCaja {
  id: number
  codigo_sesion: string
  caja: {
    nombre: string
    codigo: string
  }
}

interface GastosPageClientProps {
  sesionCaja: SesionCaja
  userId: number
  userRole: string
}

const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  insumos: ShoppingCart,
  servicios: Zap,
  mantenimiento: Wrench,
  transporte: Truck,
  nomina: Users,
  impuestos: FileText,
  otros: MoreHorizontal,
}

export function GastosPageClient({ sesionCaja, userId, userRole }: GastosPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [gastos, setGastos] = useState<any[]>([])
  const [totales, setTotales] = useState<Record<string, number>>({})
  const [loadingGastos, setLoadingGastos] = useState(true)
  const [loadingTotales, setLoadingTotales] = useState(true)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas")

  const isAdmin = userRole === "Admin"

  const loadGastos = async () => {
    setLoadingGastos(true)
    try {
      const response = await fetch(`/api/caja/gastos?sesion_id=${sesionCaja.id}`)
      if (response.ok) {
        const data = await response.json()
        setGastos(data)
      }
    } catch (error) {
      console.error("Error cargando gastos:", error)
    } finally {
      setLoadingGastos(false)
    }
  }

  const loadTotales = async () => {
    setLoadingTotales(true)
    try {
      const response = await fetch(`/api/caja/gastos?sesion_id=${sesionCaja.id}&totales=true`)
      if (response.ok) {
        const data = await response.json()
        setTotales(data)
      }
    } catch (error) {
      console.error("Error cargando totales:", error)
    } finally {
      setLoadingTotales(false)
    }
  }

  useEffect(() => {
    loadGastos()
    loadTotales()
  }, [sesionCaja.id])

  const handleSuccess = () => {
    loadGastos()
    loadTotales()
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/caja/gastos/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        handleSuccess()
      }
    } catch (error) {
      console.error("Error eliminando gasto:", error)
    }
  }

  const gastosFiltrados = categoriaFiltro === "todas" 
    ? gastos 
    : gastos.filter(g => g.categoria_gasto === categoriaFiltro)

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos de Caja</h1>
          <p className="text-muted-foreground">
            Sesión: {sesionCaja.codigo_sesion} - {sesionCaja.caja.nombre} ({sesionCaja.caja.codigo})
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Gasto
        </Button>
      </div>

      {/* Card Total Gastos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            Total Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTotales ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="text-2xl font-bold text-red-600">
              -{new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
              }).format(totales.total || 0)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid Totales por Categoría */}
      {!loadingTotales && totales.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(CATEGORIAS_LABELS).map(([key, label]) => {
            const total = totales[key] || 0
            if (total === 0) return null

            const Icon = CATEGORIA_ICONS[key]
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-red-600">
                    -{new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(total)}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Tabs con Lista de Gastos */}
      <Tabs defaultValue="todos" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="todos" className="gap-2">
              Todos los Gastos
              {!loadingGastos && <Badge variant="secondary">{gastos.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Filtro por Categoría */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrar:</span>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {Object.entries(CATEGORIAS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="todos" className="space-y-4">
          {loadingGastos ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GastosList
              gastos={gastosFiltrados}
              canDelete={isAdmin}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Registrar Gasto */}
      <GastoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sesionCajaId={sesionCaja.id}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
