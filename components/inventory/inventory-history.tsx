"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpCircle, ArrowDownCircle, Settings, Package, Search, Filter, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface HistorialItem {
  id: number
  producto_id: number
  tipo_movimiento: string
  cantidad_anterior: number
  cantidad_movimiento: number
  cantidad_nueva: number
  usuario_id: number
  referencia_id: number
  referencia_tipo: string
  observaciones: string
  fecha_movimiento: string
  productos: {
    id: number
    codigo: string
    nombre: string
    unidad: string
  }
}

interface InventoryHistoryProps {
  productoId?: number
}

export function InventoryHistory({ productoId }: InventoryHistoryProps) {
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [fechaDesde, setFechaDesde] = useState<string>("")
  const [fechaHasta, setFechaHasta] = useState<string>("")
  const [search, setSearch] = useState<string>("")

  useEffect(() => {
    loadHistorial()
  }, [productoId, filtroTipo, fechaDesde, fechaHasta])

  const loadHistorial = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (productoId) params.append("producto_id", productoId.toString())
      if (filtroTipo && filtroTipo !== "todos") params.append("tipo_movimiento", filtroTipo)
      if (fechaDesde) params.append("fecha_desde", fechaDesde)
      if (fechaHasta) params.append("fecha_hasta", fechaHasta)

      const response = await fetch(`/api/inventario/historial?${params.toString()}`)
      const data = await response.json()
      setHistorial(data.historial || [])
    } catch (error) {
      console.error("Error al cargar historial:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada":
      case "compra":
      case "ajuste_positivo":
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />
      case "salida":
      case "venta":
      case "ajuste_negativo":
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />
      case "ajuste":
        return <Settings className="h-4 w-4 text-blue-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getTipoBadgeVariant = (tipo: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (tipo) {
      case "entrada":
      case "compra":
        return "default"
      case "salida":
      case "venta":
        return "destructive"
      case "ajuste":
      case "ajuste_positivo":
      case "ajuste_negativo":
        return "secondary"
      default:
        return "outline"
    }
  }

  const filteredHistorial = historial.filter((item) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.productos.nombre.toLowerCase().includes(searchLower) ||
      item.productos.codigo.toLowerCase().includes(searchLower) ||
      item.tipo_movimiento.toLowerCase().includes(searchLower) ||
      item.observaciones?.toLowerCase().includes(searchLower)
    )
  })

  const exportToCSV = () => {
    const headers = [
      "Fecha",
      "Producto",
      "Código",
      "Tipo",
      "Anterior",
      "Movimiento",
      "Nuevo",
      "Referencia",
      "Observaciones",
    ]
    const rows = filteredHistorial.map((item) => [
      format(new Date(item.fecha_movimiento), "dd/MM/yyyy HH:mm", { locale: es }),
      item.productos.nombre,
      item.productos.codigo,
      item.tipo_movimiento,
      item.cantidad_anterior,
      item.cantidad_movimiento,
      item.cantidad_nueva,
      item.referencia_tipo ? `${item.referencia_tipo} #${item.referencia_id}` : "-",
      item.observaciones || "-",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historial-inventario-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Historial de Movimientos de Inventario
          </span>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Producto, código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tipo">Tipo de Movimiento</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="compra">Compra</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
                <SelectItem value="ajuste_positivo">Ajuste Positivo</SelectItem>
                <SelectItem value="ajuste_negativo">Ajuste Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fecha_desde">Desde</Label>
            <Input
              id="fecha_desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="fecha_hasta">Hasta</Label>
            <Input
              id="fecha_hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-8">Cargando historial...</div>
        ) : filteredHistorial.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay movimientos registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Anterior</TableHead>
                  <TableHead className="text-right">Movimiento</TableHead>
                  <TableHead className="text-right">Nuevo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistorial.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.fecha_movimiento), "dd MMM yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.productos.nombre}</p>
                        <p className="text-xs text-gray-500">{item.productos.codigo}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTipoBadgeVariant(item.tipo_movimiento)} className="flex items-center gap-1 w-fit">
                        {getTipoIcon(item.tipo_movimiento)}
                        {item.tipo_movimiento}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.cantidad_anterior} {item.productos.unidad}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.tipo_movimiento.includes("entrada") ||
                      item.tipo_movimiento === "ajuste_positivo" ||
                      item.tipo_movimiento === "compra"
                        ? "+"
                        : "-"}
                      {item.cantidad_movimiento} {item.productos.unidad}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {item.cantidad_nueva} {item.productos.unidad}
                    </TableCell>
                    <TableCell>
                      {item.referencia_tipo ? (
                        <span className="text-sm">
                          {item.referencia_tipo} #{item.referencia_id}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{item.observaciones || "-"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
