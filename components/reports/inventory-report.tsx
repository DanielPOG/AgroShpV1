"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Package, TrendingDown, Loader2, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ProductoInventario {
  id: number
  codigo: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  stock_maximo: number | null
  valor_total: number
  estado: 'critico' | 'bajo' | 'normal' | 'exceso'
}

interface LoteProximoVencer {
  id: number
  codigo_lote: string
  producto_nombre: string
  cantidad: number
  fecha_vencimiento: Date
  dias_restantes: number
}

interface ReporteInventario {
  valorizacion: {
    total_productos: number
    valor_total: number
    productos_activos: number
  }
  productos_stock_critico: ProductoInventario[]
  lotes_proximos_vencer: LoteProximoVencer[]
  resumen: {
    productos_criticos: number
    productos_bajo_stock: number
    lotes_por_vencer: number
  }
}

export function InventoryReport() {
  const [data, setData] = useState<ReporteInventario | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [diasVencimiento, setDiasVencimiento] = useState(30)

  useEffect(() => {
    cargarReporte()
  }, [diasVencimiento])

  const cargarReporte = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/reportes/inventario?dias_vencimiento=${diasVencimiento}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground">
        No hay datos de inventario disponibles
      </div>
    )
  }

  const productosCriticos = data.productos_stock_critico.filter(p => p.estado === 'critico')
  const productosBajoStock = data.productos_stock_critico.filter(p => p.estado === 'bajo')

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtro días vencimiento */}
      <div className="flex items-end gap-2">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="dias_vencimiento" className="text-xs sm:text-sm">
            Días anticipación lotes
          </Label>
          <Input
            id="dias_vencimiento"
            type="number"
            min="1"
            max="90"
            value={diasVencimiento}
            onChange={(e) => setDiasVencimiento(parseInt(e.target.value) || 30)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
        <Alert className="border-destructive bg-destructive/10 p-3 sm:p-4">
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          <AlertDescription className="text-xs sm:text-sm">
            <span className="font-semibold">{data.resumen.productos_criticos}</span> productos agotados
          </AlertDescription>
        </Alert>
        
        <Alert className="border-orange-accent bg-orange-accent/10 p-3 sm:p-4">
          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-accent" />
          <AlertDescription className="text-xs sm:text-sm">
            <span className="font-semibold">{data.resumen.productos_bajo_stock}</span> productos bajo stock
          </AlertDescription>
        </Alert>

        <Alert className="border-chart-2 bg-chart-2/10 p-3 sm:p-4">
          <Package className="h-3 w-3 sm:h-4 sm:w-4 text-chart-2" />
          <AlertDescription className="text-xs sm:text-sm">
            <span className="font-semibold">{data.resumen.lotes_por_vencer}</span> lotes próximos a vencer
          </AlertDescription>
        </Alert>
      </div>

      {/* Valorización */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Productos</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{data.valorizacion.productos_activos}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">productos activos</p>
          </CardContent>
        </Card>

        <Card className="xs:col-span-2">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Valorización Total</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              ${data.valorizacion.valor_total.toLocaleString('es-CO')}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">valor del inventario</p>
          </CardContent>
        </Card>
      </div>

      {/* Productos que requieren atención */}
      {(productosCriticos.length > 0 || productosBajoStock.length > 0) && (
        <Card>
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Productos que Requieren Atención</h3>
            <div className="space-y-2 sm:space-y-3">
              {data.productos_stock_critico.slice(0, 10).map((producto) => (
                <div
                  key={producto.id}
                  className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{producto.nombre}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{producto.codigo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={producto.stock_minimo > 0 ? (producto.stock_actual / producto.stock_minimo) * 100 : 0}
                        className="w-20 xs:w-32 h-1.5 sm:h-2"
                      />
                      <span className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap">
                        {producto.stock_actual} / {producto.stock_minimo}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      ${producto.valor_total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </span>
                    <Badge
                      className={`${
                        producto.estado === 'critico' ? "bg-destructive" : "bg-orange-accent"
                      } text-[10px] sm:text-xs shrink-0`}
                    >
                      {producto.estado === 'critico' ? "Agotado" : "Bajo Stock"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lotes próximos a vencer */}
      {data.lotes_proximos_vencer.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              Lotes Próximos a Vencer ({diasVencimiento} días)
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {data.lotes_proximos_vencer.slice(0, 10).map((lote) => (
                <div
                  key={lote.id}
                  className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{lote.producto_nombre}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Lote: {lote.codigo_lote} • Cantidad: {lote.cantidad}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-[10px] sm:text-xs">
                        {new Date(lote.fecha_vencimiento).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <Badge
                      variant={lote.dias_restantes <= 7 ? "destructive" : "default"}
                      className="text-[10px] sm:text-xs shrink-0"
                    >
                      {lote.dias_restantes} {lote.dias_restantes === 1 ? 'día' : 'días'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
