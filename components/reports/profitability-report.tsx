"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface ProductoRentable {
  producto_id: number
  nombre: string
  categoria?: string | null
  cantidad_vendida: number
  ingresos: number
  costo_produccion: number
  margen_ganancia: number
  porcentaje_margen: number
}

interface ProductoSinCostos {
  producto_id: number
  nombre: string
  cantidad_vendida: number
  ingresos: number
}

interface ResumenRentabilidad {
  total_ingresos: number
  total_costos: number
  margen_total: number
  porcentaje_margen: number
}

export function ProfitabilityReport() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  })
  const [productos, setProductos] = useState<ProductoRentable[]>([])
  const [productosSinCostos, setProductosSinCostos] = useState<ProductoSinCostos[]>([])
  const [resumen, setResumen] = useState<ResumenRentabilidad | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    cargarReporte()
  }, [dateRange])

  const cargarReporte = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/reportes/rentabilidad?fecha_inicio=${dateRange.from.toISOString()}&fecha_fin=${dateRange.to.toISOString()}&limit=20`
      )
      
      if (response.ok) {
        const result = await response.json()
        setProductos(result.data.productos_rentables || [])
        setProductosSinCostos(result.data.productos_sin_costos || [])
        setResumen(result.data.resumen || null)
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMarginColor = (porcentaje: number) => {
    if (porcentaje >= 30) return "text-green-600"
    if (porcentaje >= 15) return "text-yellow-600"
    return "text-red-600"
  }

  const getMarginBadgeVariant = (porcentaje: number): "default" | "secondary" | "destructive" => {
    if (porcentaje >= 30) return "default"
    if (porcentaje >= 15) return "secondary"
    return "destructive"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtro de fecha */}
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to })
                }
              }}
              locale={es}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Cards de resumen - Responsive Grid */}
      {resumen && (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Ingresos Totales</p>
              </div>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-foreground truncate">
                ${resumen.total_ingresos.toLocaleString('es-CO')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Costos Totales</p>
              </div>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-foreground truncate">
                ${resumen.total_costos.toLocaleString('es-CO')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Margen Bruto</p>
              </div>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-primary truncate">
                ${resumen.margen_total.toLocaleString('es-CO')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-2">Margen Promedio</p>
              <p className={`text-base sm:text-xl md:text-2xl font-bold ${getMarginColor(resumen.porcentaje_margen || 0)}`}>
                {(resumen.porcentaje_margen || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top productos rentables - Optimizado Mobile */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <h3 className="font-semibold text-xs sm:text-sm md:text-base mb-3 sm:mb-4">
            Productos con Costos de Producción Configurados
          </h3>
          {productos.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {productos.map((producto, index) => (
                <div
                  key={producto.producto_id}
                  className="p-2 sm:p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Header con ranking y título */}
                  <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-semibold text-[10px] sm:text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{producto.nombre}</p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                        {producto.categoria && (
                          <Badge variant="outline" className="text-[8px] sm:text-[10px] py-0 px-1 sm:px-1.5">
                            {producto.categoria}
                          </Badge>
                        )}
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {producto.cantidad_vendida} u
                        </span>
                        <Badge variant={getMarginBadgeVariant(producto.porcentaje_margen)} className="text-[8px] sm:text-[10px] py-0 px-1 sm:px-1.5">
                          {producto.porcentaje_margen.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Métricas financieras - Grid responsive */}
                  <div className="grid grid-cols-3 gap-1 sm:gap-2 text-[10px] sm:text-xs mb-2">
                    <div>
                      <p className="text-muted-foreground truncate">Ingresos</p>
                      <p className="font-semibold text-green-600 truncate">
                        ${producto.ingresos.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground truncate">Costos</p>
                      <p className="font-semibold text-red-600 truncate">
                        ${producto.costo_produccion.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground truncate">Margen</p>
                      <p className="font-semibold text-primary truncate">
                        ${producto.margen_ganancia.toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>

                  {/* Barra de rentabilidad */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-muted-foreground">Rentabilidad</span>
                      <span className={`font-medium ${getMarginColor(producto.porcentaje_margen)}`}>
                        {producto.porcentaje_margen.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(producto.porcentaje_margen, 100)} 
                      className="h-1.5 sm:h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
              No hay productos con costos de producción configurados para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Productos sin costos de producción - Optimizado Mobile */}
      {productosSinCostos.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
              <h3 className="font-semibold text-xs sm:text-sm md:text-base text-yellow-800 dark:text-yellow-400">
                Productos Sin Costos de Producción
              </h3>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-yellow-700 dark:text-yellow-300 mb-3 sm:mb-4">
              Los siguientes productos generaron ventas pero no tienen costos de producción configurados. 
              Configure los costos para poder calcular su rentabilidad real.
            </p>
            <div className="space-y-2">
              {productosSinCostos.map((producto, index) => (
                <div
                  key={producto.producto_id}
                  className="p-2 sm:p-3 rounded-lg bg-white dark:bg-gray-900 border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 font-semibold text-[10px] sm:text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{producto.nombre}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {producto.cantidad_vendida} unidades vendidas
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-semibold text-green-600 truncate">
                        ${producto.ingresos.toLocaleString('es-CO')}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">ingresos</p>
                    </div>
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
