"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FileText, 
  Search, 
  Filter,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Loader2,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Arqueo {
  id: number
  codigo_sesion: string
  fondo_inicial: string
  efectivo_esperado: string
  efectivo_contado: string
  diferencia: string
  cuadrada: boolean
  observaciones_cierre: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  total_ventas_efectivo: string
  total_ventas_nequi: string
  total_ventas_tarjeta: string
  total_ventas_transferencia: string
  total_ingresos_adicionales: string
  total_retiros: string
  total_gastos: string
  caja: {
    nombre: string
    codigo: string
  }
  cajero: {
    nombre: string
    apellido: string
  }
}

interface ArqueosPageClientProps {
  userId: number
  userRole: string
}

export function ArqueosPageClient({ userId, userRole }: ArqueosPageClientProps) {
  const [arqueos, setArqueos] = useState<Arqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<"todos" | "cuadrada" | "diferencia">("todos")

  useEffect(() => {
    loadArqueos()
  }, [])

  const loadArqueos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/caja/arqueos")
      if (!response.ok) throw new Error("Error al cargar arqueos")
      
      const data = await response.json()
      setArqueos(data.arqueos || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const arqueosFiltrados = arqueos.filter(arqueo => {
    const matchSearch = searchTerm === "" || 
      arqueo.cajero.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arqueo.cajero.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arqueo.codigo_sesion.toLowerCase().includes(searchTerm.toLowerCase())

    const matchEstado = 
      filterEstado === "todos" ||
      (filterEstado === "cuadrada" && (arqueo.cuadrada || Number(arqueo.diferencia) === 0)) ||
      (filterEstado === "diferencia" && !arqueo.cuadrada && Number(arqueo.diferencia) !== 0)

    return matchSearch && matchEstado
  })

  const getEstadoBadge = (cuadrada: boolean, diferencia: string) => {
    const diff = Math.abs(Number(diferencia))
    if (cuadrada || diff === 0) {
      return <Badge className="bg-green-500">✓ Cuadrada</Badge>
    } else if (diff < 5000) {
      return <Badge className="bg-yellow-500">⚠ Diferencia Menor</Badge>
    } else {
      return <Badge className="bg-red-500">✗ Diferencia Alta</Badge>
    }
  }

  const totalVentas = (arqueo: Arqueo) => {
    return Number(arqueo.total_ventas_efectivo) +
           Number(arqueo.total_ventas_nequi) +
           Number(arqueo.total_ventas_tarjeta) +
           Number(arqueo.total_ventas_transferencia)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Historial de Arqueos
        </h1>
        <p className="text-muted-foreground mt-1">
          Consulta arqueos de sesiones cerradas
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Arqueos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{arqueos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Cuadradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {arqueos.filter(a => a.cuadrada || Number(a.diferencia) === 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Con Diferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {arqueos.filter(a => !a.cuadrada && Number(a.diferencia) !== 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {arqueos.reduce((sum, a) => sum + Number(a.diferencia), 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              Suma Diferencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${
              arqueos.reduce((sum, a) => sum + Number(a.diferencia), 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${arqueos.reduce((sum, a) => sum + Number(a.diferencia), 0).toLocaleString("es-CO")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cajero o código de sesión..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado del Arqueo</Label>
              <Select value={filterEstado} onValueChange={(value: any) => setFilterEstado(value)}>
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cuadrada">Cuadradas</SelectItem>
                  <SelectItem value="diferencia">Con Diferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Arqueos */}
      <div className="space-y-4">
        {arqueosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron arqueos</p>
            </CardContent>
          </Card>
        ) : (
          arqueosFiltrados.map((arqueo) => (
            <Card key={arqueo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {arqueo.codigo_sesion}
                      {getEstadoBadge(arqueo.cuadrada, arqueo.diferencia)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {arqueo.cajero.nombre} {arqueo.cajero.apellido}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {arqueo.fecha_cierre && format(new Date(arqueo.fecha_cierre), "PPP 'a las' p", { locale: es })}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Fondo Inicial</p>
                    <p className="text-lg font-semibold">
                      ${Number(arqueo.fondo_inicial).toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Efectivo Esperado</p>
                    <p className="text-lg font-semibold">
                      ${Number(arqueo.efectivo_esperado).toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Efectivo Contado</p>
                    <p className="text-lg font-semibold">
                      ${Number(arqueo.efectivo_contado).toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Diferencia</p>
                    <p className={`text-lg font-bold ${
                      Number(arqueo.diferencia) === 0 ? "text-green-600" :
                      Number(arqueo.diferencia) > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {Number(arqueo.diferencia) === 0 ? "$0" :
                       Number(arqueo.diferencia) > 0 ? 
                        `+$${Number(arqueo.diferencia).toLocaleString("es-CO")}` :
                        `-$${Math.abs(Number(arqueo.diferencia)).toLocaleString("es-CO")}`
                      }
                    </p>
                  </div>
                </div>

                {/* Desglose de Ventas */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Desglose de Ventas:</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Efectivo</p>
                      <p className="font-semibold">${Number(arqueo.total_ventas_efectivo).toLocaleString("es-CO")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nequi</p>
                      <p className="font-semibold">${Number(arqueo.total_ventas_nequi).toLocaleString("es-CO")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tarjeta</p>
                      <p className="font-semibold">${Number(arqueo.total_ventas_tarjeta).toLocaleString("es-CO")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transferencia</p>
                      <p className="font-semibold">${Number(arqueo.total_ventas_transferencia).toLocaleString("es-CO")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-bold">${totalVentas(arqueo).toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                </div>

                {/* Movimientos */}
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ingresos Extra</p>
                      <p className="font-semibold text-green-600">+${Number(arqueo.total_ingresos_adicionales).toLocaleString("es-CO")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retiros</p>
                      <p className="font-semibold text-red-600">-${Number(arqueo.total_retiros).toLocaleString("es-CO")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gastos</p>
                      <p className="font-semibold text-red-600">-${Number(arqueo.total_gastos).toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                </div>

                {arqueo.observaciones_cierre && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Observaciones:</p>
                    <p className="text-sm text-muted-foreground">{arqueo.observaciones_cierre}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
