"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Trophy, TrendingUp, Package, Layers, Calendar, DollarSign, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnidadReporte {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  total_ventas: number
  cantidad_productos_vendidos: number
  cantidad_productos_distintos: number
  cantidad_lotes_usados: number
}

interface ReporteData {
  success: boolean
  fecha_desde: string | null
  fecha_hasta: string | null
  unidad_mas_vendida: UnidadReporte | null
  totales: {
    total_general: number
    total_productos: number
    total_lotes: number
    cantidad_unidades: number
  }
  unidades: UnidadReporte[]
}

export function ReporteUnidadesProductivas() {
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [filtrosAplicados, setFiltrosAplicados] = useState({ desde: "", hasta: "" })

  // Query para obtener el reporte
  const { data, isLoading, error, refetch } = useQuery<ReporteData>({
    queryKey: ['reporte-unidades-productivas', filtrosAplicados.desde, filtrosAplicados.hasta],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtrosAplicados.desde) params.append('fecha_desde', filtrosAplicados.desde)
      if (filtrosAplicados.hasta) params.append('fecha_hasta', filtrosAplicados.hasta)
      
      const response = await fetch(`/api/reportes/unidades-productivas?${params}`)
      if (!response.ok) throw new Error('Error al cargar reporte')
      return response.json()
    },
  })

  const handleAplicarFiltros = () => {
    setFiltrosAplicados({ desde: fechaDesde, hasta: fechaHasta })
  }

  const handleLimpiarFiltros = () => {
    setFechaDesde("")
    setFechaHasta("")
    setFiltrosAplicados({ desde: "", hasta: "" })
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>No se pudo cargar el reporte</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros de Fecha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="fecha-desde">Fecha Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAplicarFiltros}>
                Aplicar Filtros
              </Button>
              <Button variant="outline" onClick={handleLimpiarFiltros}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unidad Más Vendida */}
      {data?.unidad_mas_vendida && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Unidad Productiva Más Vendida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {data.unidad_mas_vendida.nombre}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.unidad_mas_vendida.codigo}
                </div>
                {data.unidad_mas_vendida.descripcion && (
                  <p className="text-sm mt-1">{data.unidad_mas_vendida.descripcion}</p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Ventas</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatMoney(data.unidad_mas_vendida.total_ventas)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Productos Vendidos</div>
                  <div className="text-2xl font-bold">
                    {data.unidad_mas_vendida.cantidad_productos_vendidos}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Productos Distintos</div>
                  <div className="text-2xl font-bold">
                    {data.unidad_mas_vendida.cantidad_productos_distintos}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Lotes Usados</div>
                  <div className="text-2xl font-bold">
                    {data.unidad_mas_vendida.cantidad_lotes_usados}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totales Generales */}
      {data?.totales && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div className="text-2xl font-bold text-green-600">
                  {formatMoney(data.totales.total_general)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <div className="text-2xl font-bold">
                  {data.totales.total_productos}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Lotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                <div className="text-2xl font-bold">
                  {data.totales.total_lotes}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unidades Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <div className="text-2xl font-bold">
                  {data.totales.cantidad_unidades}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla de Todas las Unidades */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Unidades Productivas</CardTitle>
          <CardDescription>
            Ordenadas por total de ventas (mayor a menor)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Total Ventas</TableHead>
                  <TableHead className="text-center">Productos</TableHead>
                  <TableHead className="text-center">Distintos</TableHead>
                  <TableHead className="text-center">Lotes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.unidades && data.unidades.length > 0 ? (
                  data.unidades.map((unidad, index) => (
                    <TableRow key={unidad.id}>
                      <TableCell>
                        <Badge variant={index === 0 ? "default" : "outline"}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {unidad.codigo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{unidad.nombre}</div>
                          {unidad.descripcion && (
                            <div className="text-xs text-muted-foreground">
                              {unidad.descripcion}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatMoney(unidad.total_ventas)}
                      </TableCell>
                      <TableCell className="text-center">
                        {unidad.cantidad_productos_vendidos}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {unidad.cantidad_productos_distintos}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {unidad.cantidad_lotes_usados}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay datos disponibles para el período seleccionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
