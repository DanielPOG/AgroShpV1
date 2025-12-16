"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--orange-accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-2))"
]

interface PaymentMethodsChartProps {
  metodos: Array<{
    nombre: string
    total: number
    cantidad: number
  }>
}

export function PaymentMethodsChart({ metodos }: PaymentMethodsChartProps) {
  const totalGeneral = metodos.reduce((sum, m) => sum + m.total, 0)
  
  const data = metodos.map((metodo, index) => ({
    name: metodo.nombre,
    value: totalGeneral > 0 ? (metodo.total / totalGeneral) * 100 : 0,
    color: COLORS[index % COLORS.length]
  }))
  return (
    <Card>
      <CardHeader className="p-4 xs:p-5 sm:p-6">
        <CardTitle className="text-base xs:text-lg sm:text-xl">Métodos de Pago</CardTitle>
        <CardDescription className="text-xs xs:text-sm">Distribución de pagos</CardDescription>
      </CardHeader>
      <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
        {data.length > 0 && data.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={220} className="xs:h-60 sm:h-[250px]">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value.toFixed(0)}%`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '11px' }}
                className="xs:text-xs sm:text-sm"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{
                  fontSize: "12px",
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] xs:h-60 sm:h-[250px] flex items-center justify-center text-muted-foreground text-xs xs:text-sm">
            No hay datos de pagos disponibles
          </div>
        )}
      </CardContent>
    </Card>
  )
}
