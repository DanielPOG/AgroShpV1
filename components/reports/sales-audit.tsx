"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart, Eye, Download, Search, Filter, User, Calendar } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Venta {
  id: number
  codigo_venta: string
  fecha_venta: string
  total: number
  subtotal: number
  descuento: number
  impuesto: number
  estado: string
  cliente_nombre: string
  usuario: {
    nombre: string
    apellido: string
  }
  detalle_ventas: Array<{
    cantidad: number
    precio_unitario: number
    subtotal: number
    producto: {
      nombre: string
      codigo: string
    }
    lote: {
      codigo_lote: string
    }
  }>
  pagos_venta: Array<{
    monto: number
    metodo_pago: {
      nombre: string
    }
  }>
}

export function SalesAudit() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>("")
  const [fechaHasta, setFechaHasta] = useState<string>("")
  const [estado, setEstado] = useState<string>("todos")
  const [search, setSearch] = useState<string>("")

  useEffect(() => {
    loadVentas()
  }, [fechaDesde, fechaHasta, estado])

  const loadVentas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fechaDesde) params.append("fecha_desde", fechaDesde)
      if (fechaHasta) params.append("fecha_hasta", fechaHasta)
      if (estado && estado !== "todos") params.append("estado", estado)

      const response = await fetch(`/api/ventas?${params.toString()}`)
      const data = await response.json()
      setVentas(data.data || [])
    } catch (error) {
      console.error("Error al cargar ventas:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "completada":
        return <Badge variant="default">Completada</Badge>
      case "cancelada":
        return <Badge variant="destructive">Cancelada</Badge>
      case "pendiente":
        return <Badge variant="secondary">Pendiente</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const filteredVentas = ventas.filter((venta) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      venta.codigo_venta.toLowerCase().includes(searchLower) ||
      venta.cliente_nombre?.toLowerCase().includes(searchLower) ||
      `${venta.usuario.nombre} ${venta.usuario.apellido}`.toLowerCase().includes(searchLower)
    )
  })

  const totalVentas = filteredVentas.reduce((sum, v) => sum + Number(v.total), 0)

  const exportToCSV = () => {
    const headers = [
      "Código",
      "Fecha",
      "Cliente",
      "Vendedor",
      "Subtotal",
      "Descuento",
      "Impuesto",
      "Total",
      "Estado",
      "Método Pago",
    ]
    const rows = filteredVentas.map((venta) => [
      venta.codigo_venta,
      format(new Date(venta.fecha_venta), "dd/MM/yyyy HH:mm", { locale: es }),
      venta.cliente_nombre || "Cliente general",
      `${venta.usuario.nombre} ${venta.usuario.apellido}`,
      venta.subtotal,
      venta.descuento,
      venta.impuesto,
      venta.total,
      venta.estado,
      venta.pagos_venta.map((p) => p.metodo_pago.nombre).join(", "),
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `auditoria-ventas-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  const viewDetail = (venta: Venta) => {
    setSelectedVenta(venta)
    setShowDetail(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Auditoría de Ventas
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
                  placeholder="Código, cliente, vendedor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
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

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Ventas</div>
                <div className="text-2xl font-bold">{filteredVentas.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Monto Total</div>
                <div className="text-2xl font-bold">${totalVentas.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Promedio por Venta</div>
                <div className="text-2xl font-bold">
                  ${filteredVentas.length > 0 ? (totalVentas / filteredVentas.length).toFixed(0) : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8">Cargando ventas...</div>
          ) : filteredVentas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay ventas registradas</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVentas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">{venta.codigo_venta}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(venta.fecha_venta), "dd MMM yyyy HH:mm", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>{venta.cliente_nombre || "Cliente general"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {venta.usuario.nombre} {venta.usuario.apellido}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">${Number(venta.total).toLocaleString()}</TableCell>
                      <TableCell>{getEstadoBadge(venta.estado)}</TableCell>
                      <TableCell>
                        {venta.pagos_venta.map((p, i) => (
                          <Badge key={i} variant="outline" className="mr-1">
                            {p.metodo_pago.nombre}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => viewDetail(venta)} variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Venta - {selectedVenta?.codigo_venta}</DialogTitle>
          </DialogHeader>

          {selectedVenta && (
            <div className="space-y-4">
              {/* Info General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <p className="font-medium">{selectedVenta.cliente_nombre || "Cliente general"}</p>
                </div>
                <div>
                  <Label>Vendedor</Label>
                  <p className="font-medium">
                    {selectedVenta.usuario.nombre} {selectedVenta.usuario.apellido}
                  </p>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <p className="font-medium">
                    {format(new Date(selectedVenta.fecha_venta), "dd MMM yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="mt-1">{getEstadoBadge(selectedVenta.estado)}</div>
                </div>
              </div>

              {/* Productos */}
              <div>
                <Label className="mb-2 block">Productos</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedVenta.detalle_ventas.map((detalle, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{detalle.producto.nombre}</p>
                            <p className="text-xs text-gray-500">{detalle.producto.codigo}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{detalle.lote.codigo_lote}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{detalle.cantidad}</TableCell>
                        <TableCell className="text-right">${Number(detalle.precio_unitario).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(detalle.subtotal).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totales */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${Number(selectedVenta.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-${Number(selectedVenta.descuento).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impuesto:</span>
                    <span>${Number(selectedVenta.impuesto).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${Number(selectedVenta.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Pagos */}
              <div>
                <Label className="mb-2 block">Métodos de Pago</Label>
                <div className="space-y-2">
                  {selectedVenta.pagos_venta.map((pago, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <Badge>{pago.metodo_pago.nombre}</Badge>
                      <span className="font-medium">${Number(pago.monto).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
