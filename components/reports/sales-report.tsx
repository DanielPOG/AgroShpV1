"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface VentasPorDia {
  periodo: Date
  total_ventas: number
  cantidad_ventas: number
  ticket_promedio: number
}

interface VentasPorHora {
  hora: number
  total_ventas: number
  cantidad_ventas: number
}

interface Estadisticas {
  total_ventas: number
  cantidad_ventas: number
  ticket_promedio: number
  total_descuentos: number
  comparacion_periodo_anterior: {
    diferencia_ventas: number
    porcentaje_cambio: number
  }
}

interface ReporteVentas {
  estadisticas: Estadisticas
  ventas_por_periodo: VentasPorDia[]
  ventas_por_hora: VentasPorHora[]
}

export function SalesReport() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  })
  const [data, setData] = useState<ReporteVentas | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    cargarReporte()
  }, [dateRange])

  const cargarReporte = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/reportes/ventas?fecha_inicio=${dateRange.from.toISOString()}&fecha_fin=${dateRange.to.toISOString()}&agrupar_por=dia`
      )
      
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

  // Preparar datos para gráficos
  const ventasPorDiaChart = data?.ventas_por_periodo.map(v => ({
    dia: format(new Date(v.periodo), 'EEE', { locale: es }),
    ventas: v.total_ventas,
    transacciones: v.cantidad_ventas
  })) || []

  const ventasPorHoraChart = data?.ventas_por_hora.map(v => ({
    hora: `${v.hora}:00`,
    ventas: v.total_ventas
  })) || []

  // Calcular mejor día
  const mejorDia = data?.ventas_por_periodo.reduce((max, dia) => 
    dia.total_ventas > max.total_ventas ? dia : max
  , data.ventas_por_periodo[0])

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
        No hay datos disponibles para el período seleccionado
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

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Ventas</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">
              ${data.estadisticas.total_ventas.toLocaleString('es-CO')}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {data.estadisticas.comparacion_periodo_anterior.porcentaje_cambio >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <p className="text-[10px] sm:text-xs text-green-500">
                    +{data.estadisticas.comparacion_periodo_anterior.porcentaje_cambio.toFixed(1)}% vs anterior
                  </p>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <p className="text-[10px] sm:text-xs text-red-500">
                    {data.estadisticas.comparacion_periodo_anterior.porcentaje_cambio.toFixed(1)}% vs anterior
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Ticket Promedio</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              ${data.estadisticas.ticket_promedio.toLocaleString('es-CO')}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {data.estadisticas.cantidad_ventas} transacciones
            </p>
          </CardContent>
        </Card>

        <Card className="xs:col-span-2 lg:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Mejor Día</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {mejorDia ? format(new Date(mejorDia.periodo), 'EEEE', { locale: es }) : 'N/A'}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              ${mejorDia?.total_ventas.toLocaleString('es-CO')} en ventas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de ventas por día */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Ventas por Día</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ventasPorDiaChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dia" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`$${value.toLocaleString("es-CO")}`, "Ventas"]}
              />
              <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de horas pico */}
      {ventasPorHoraChart.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Horas Pico de Ventas</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ventasPorHoraChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hora" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString("es-CO")}`, "Ventas"]}
                />
                <Line
                  type="monotone"
                  dataKey="ventas"
                  stroke="hsl(var(--orange-accent))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--orange-accent))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
