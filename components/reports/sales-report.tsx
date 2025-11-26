"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

const salesData = [
  { day: "Lun", ventas: 890000, transacciones: 45 },
  { day: "Mar", ventas: 1200000, transacciones: 62 },
  { day: "Mié", ventas: 750000, transacciones: 38 },
  { day: "Jue", ventas: 1450000, transacciones: 71 },
  { day: "Vie", ventas: 1650000, transacciones: 89 },
  { day: "Sáb", ventas: 2100000, transacciones: 105 },
  { day: "Dom", ventas: 980000, transacciones: 52 },
]

const hourlyData = [
  { hora: "8-10", ventas: 150000 },
  { hora: "10-12", ventas: 450000 },
  { hora: "12-14", ventas: 890000 },
  { hora: "14-16", ventas: 320000 },
  { hora: "16-18", ventas: 680000 },
  { hora: "18-20", ventas: 410000 },
]

export function SalesReport() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Ventas Semana</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">$8.02M</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">462 transacciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Ticket Promedio</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">$17,359</p>
            <p className="text-[10px] sm:text-xs text-primary mt-1">+8% vs anterior</p>
          </CardContent>
        </Card>
        <Card className="xs:col-span-2 lg:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Mejor Día</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">Sábado</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">$2.1M en ventas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-6">
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Ventas por Día</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
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

      <Card>
        <CardContent className="p-3 sm:p-6">
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Horas Pico de Ventas</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourlyData}>
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
    </div>
  )
}
