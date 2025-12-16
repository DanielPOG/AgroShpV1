"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

interface VentasPorMetodoPago {
  metodo_pago: string
  total: number
  cantidad_transacciones: number
  porcentaje: number
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--orange-accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-2))"
]

export function PaymentMethodsReport() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  })
  const [data, setData] = useState<VentasPorMetodoPago[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    cargarReporte()
  }, [dateRange])

  const cargarReporte = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/reportes/ventas?fecha_inicio=${dateRange.from.toISOString()}&fecha_fin=${dateRange.to.toISOString()}`
      )
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data.ventas_por_metodo_pago || [])
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Preparar datos para el gráfico de pie
  const chartData = data.map((item, index) => ({
    name: item.metodo_pago,
    value: item.total,
    percentage: item.porcentaje,
    color: COLORS[index % COLORS.length]
  }))

  const totalGeneral = data.reduce((sum, m) => sum + m.total, 0)

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

      {/* Cards de métodos de pago */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {data.map((method, index) => (
          <Card key={method.metodo_pago}>
            <CardContent className="p-2 sm:p-4">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{method.metodo_pago}</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                ${method.total.toLocaleString('es-CO')}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {method.porcentaje.toFixed(1)}% del total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de distribución */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Distribución de Pagos</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name} ${entry.percent ? (entry.percent * 100).toFixed(1) : '0'}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString("es-CO")}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalles por método */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Detalles por Método</h3>
            <div className="space-y-3">
              {data.map((method, index) => (
                <div key={method.metodo_pago} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{method.metodo_pago}</span>
                    </div>
                    <span className="font-semibold">
                      ${method.total.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground pl-5">
                    <span>{method.cantidad_transacciones} transacciones</span>
                    <span>
                      ${method.cantidad_transacciones > 0 
                        ? (method.total / method.cantidad_transacciones).toLocaleString('es-CO')
                        : 0} promedio
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Totales */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Total General</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Período: {format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM yyyy", { locale: es })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                ${totalGeneral.toLocaleString('es-CO')}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {data.reduce((sum, m) => sum + m.cantidad_transacciones, 0)} transacciones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
