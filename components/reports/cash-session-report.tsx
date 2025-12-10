"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Download, Calendar } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SesionCaja {
  id: number
  codigo_sesion: string
  fecha_apertura: string
  fecha_cierre: string | null
  estado: string
  fondo_inicial: number
  total_ventas_efectivo: number
  total_ventas_nequi: number
  total_ventas_tarjeta: number
  total_ventas_transferencia: number
  total_retiros: number
  total_gastos: number
  efectivo_esperado: number
  efectivo_contado: number
  diferencia: number
  cuadrada: boolean
  caja: {
    nombre: string
    ubicacion: string
  }
  cajero: {
    nombre: string
    apellido: string
  }
}

interface Totales {
  total_sesiones: number
  total_fondo_inicial: number
  total_ventas_efectivo: number
  total_ventas_nequi: number
  total_ventas_tarjeta: number
  total_ventas_transferencia: number
  total_retiros: number
  total_gastos: number
  total_diferencias: number
  sesiones_cuadradas: number
  sesiones_descuadradas: number
}

export function CashSessionReport() {
  const [sesiones, setSesiones] = useState<SesionCaja[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState<string>("")
  const [fechaHasta, setFechaHasta] = useState<string>("")

  useEffect(() => {
    loadReporte()
  }, [fechaDesde, fechaHasta])

  const loadReporte = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fechaDesde) params.append("fecha_desde", fechaDesde)
      if (fechaHasta) params.append("fecha_hasta", fechaHasta)

      const response = await fetch(`/api/reportes/caja?${params.toString()}`)
      const data = await response.json()
      setSesiones(data.sesiones || [])
      setTotales(data.totales || null)
    } catch (error) {
      console.error("Error al cargar reporte:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = [
      "Código Sesión",
      "Caja",
      "Usuario",
      "Fecha Apertura",
      "Fecha Cierre",
      "Fondo Inicial",
      "Ventas Efectivo",
      "Ventas Nequi",
      "Ventas Tarjeta",
      "Retiros",
      "Gastos",
      "Efectivo Esperado",
      "Efectivo Contado",
      "Diferencia",
      "Cuadrada",
      "Estado",
    ]
    const rows = sesiones.map((sesion) => [
      sesion.codigo_sesion,
      sesion.caja.nombre,
      `${sesion.cajero.nombre} ${sesion.cajero.apellido}`,
      format(new Date(sesion.fecha_apertura), "dd/MM/yyyy HH:mm", { locale: es }),
      sesion.fecha_cierre ? format(new Date(sesion.fecha_cierre), "dd/MM/yyyy HH:mm", { locale: es }) : "Abierta",
      sesion.fondo_inicial,
      sesion.total_ventas_efectivo,
      sesion.total_ventas_nequi,
      sesion.total_ventas_tarjeta,
      sesion.total_retiros,
      sesion.total_gastos,
      sesion.efectivo_esperado,
      sesion.efectivo_contado,
      sesion.diferencia,
      sesion.cuadrada ? "Sí" : "No",
      sesion.estado,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-caja-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Reporte de Control de Caja
            </span>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

          {/* Resumen de Totales */}
          {totales && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Sesiones</div>
                      <div className="text-2xl font-bold">{totales.total_sesiones}</div>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Ventas Efectivo</div>
                      <div className="text-2xl font-bold">${totales.total_ventas_efectivo.toLocaleString()}</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Retiros + Gastos</div>
                      <div className="text-2xl font-bold">
                        ${(totales.total_retiros + totales.total_gastos).toLocaleString()}
                      </div>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Diferencias</div>
                      <div className="text-2xl font-bold">${totales.total_diferencias.toLocaleString()}</div>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Ventas por Método de Pago</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Efectivo:</span>
                      <span className="font-medium">${totales.total_ventas_efectivo.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nequi:</span>
                      <span className="font-medium">${totales.total_ventas_nequi.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tarjeta:</span>
                      <span className="font-medium">${totales.total_ventas_tarjeta.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transferencia:</span>
                      <span className="font-medium">${totales.total_ventas_transferencia.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Cuadre de Cajas</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Cajas Cuadradas:
                      </span>
                      <span className="font-medium">{totales.sesiones_cuadradas}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Cajas Descuadradas:
                      </span>
                      <span className="font-medium">{totales.sesiones_descuadradas}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabla de Sesiones */}
          {loading ? (
            <div className="text-center py-8">Cargando reporte...</div>
          ) : sesiones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay sesiones registradas</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Fecha Apertura</TableHead>
                    <TableHead>Fecha Cierre</TableHead>
                    <TableHead className="text-right">Ventas Efectivo</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sesiones.map((sesion) => (
                    <TableRow key={sesion.id}>
                      <TableCell className="font-medium">{sesion.codigo_sesion}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sesion.caja.nombre}</p>
                          <p className="text-xs text-gray-500">{sesion.caja.ubicacion}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sesion.cajero.nombre} {sesion.cajero.apellido}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sesion.fecha_apertura), "dd MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {sesion.fecha_cierre
                          ? format(new Date(sesion.fecha_cierre), "dd MMM yyyy HH:mm", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(sesion.total_ventas_efectivo).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            Number(sesion.diferencia) === 0
                              ? "text-green-600"
                              : Number(sesion.diferencia) > 0
                              ? "text-blue-600"
                              : "text-red-600"
                          }
                        >
                          ${Number(sesion.diferencia).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sesion.estado === "abierta" ? (
                          <Badge variant="default">Abierta</Badge>
                        ) : sesion.cuadrada ? (
                          <Badge variant="outline" className="border-green-600 text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Cuadrada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-600 text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Descuadrada
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
