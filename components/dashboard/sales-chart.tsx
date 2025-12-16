"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SalesChartProps {
  ventas: Array<{ dia: Date; total: number }>
}

export function SalesChart({ ventas }: SalesChartProps) {
  const data = ventas.map(v => ({
    day: format(new Date(v.dia), 'EEE', { locale: es }),
    ventas: v.total
  }))

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="p-4 xs:p-5 sm:p-6">
        <CardTitle className="text-base xs:text-lg sm:text-xl">Ventas de la Semana</CardTitle>
        <CardDescription className="text-xs xs:text-sm">Últimos 7 días</CardDescription>
      </CardHeader>
      <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250} className="sm:h-[280px] md:h-[300px]">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                className="text-[10px] xs:text-xs" 
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                className="text-[10px] xs:text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                formatter={(value: number) => [`$${value.toLocaleString("es-CO")}`, "Ventas"]}
              />
              <Area
                type="monotone"
                dataKey="ventas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorVentas)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] sm:h-[280px] md:h-[300px] flex items-center justify-center text-muted-foreground text-xs xs:text-sm">
            No hay datos de ventas disponibles
          </div>
        )}
      </CardContent>
    </Card>
  )
}
