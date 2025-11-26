"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

const paymentData = [
  { name: "Efectivo", value: 3600000, percentage: 45, color: "hsl(var(--primary))" },
  { name: "Nequi", value: 2400000, percentage: 30, color: "hsl(var(--orange-accent))" },
  { name: "Tarjeta", value: 1600000, percentage: 20, color: "hsl(var(--chart-3))" },
  { name: "Mixto", value: 400000, percentage: 5, color: "hsl(var(--chart-4))" },
]

const dailyPayments = [
  { day: "Lun", efectivo: 400000, nequi: 300000, tarjeta: 190000 },
  { day: "Mar", efectivo: 540000, nequi: 420000, tarjeta: 240000 },
  { day: "Mié", efectivo: 340000, nequi: 250000, tarjeta: 160000 },
  { day: "Jue", efectivo: 650000, nequi: 480000, tarjeta: 320000 },
  { day: "Vie", efectivo: 742000, nequi: 560000, tarjeta: 348000 },
  { day: "Sáb", efectivo: 945000, nequi: 710000, tarjeta: 445000 },
  { day: "Dom", efectivo: 441000, nequi: 330000, tarjeta: 209000 },
]

export function PaymentMethodsReport() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {paymentData.map((method) => (
          <Card key={method.name}>
            <CardContent className="p-2 sm:p-4">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{method.name}</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">${(method.value / 1000).toFixed(0)}k</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{method.percentage}% del total</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Distribución de Pagos</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Métodos de Pago por Día</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyPayments}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => `$${value.toLocaleString("es-CO")}`}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="efectivo" fill="hsl(var(--primary))" name="Efectivo" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nequi" fill="hsl(var(--orange-accent))" name="Nequi" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tarjeta" fill="hsl(var(--chart-3))" name="Tarjeta" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
