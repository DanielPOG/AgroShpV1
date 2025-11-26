import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, ShoppingCart, Package, TrendingUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const activities = [
  {
    type: "sale",
    message: "Venta de 30 tomates por $105,000",
    time: new Date(Date.now() - 2 * 60 * 1000),
    user: "María Cajera",
  },
  {
    type: "movement",
    message: "Movimiento de 15kg de queso a Panificación",
    time: new Date(Date.now() - 15 * 60 * 1000),
    user: "Juan Inventarista",
  },
  {
    type: "low-stock",
    message: "Lechuga Crespa bajo stock (8 unidades)",
    time: new Date(Date.now() - 45 * 60 * 1000),
    user: "Sistema",
  },
  {
    type: "sale",
    message: "Venta de 2kg de miel por $30,000",
    time: new Date(Date.now() - 68 * 60 * 1000),
    user: "María Cajera",
  },
]

const activityIcons = {
  sale: ShoppingCart,
  movement: Package,
  "low-stock": TrendingUp,
}

const activityColors = {
  sale: "bg-primary/10 text-primary",
  movement: "bg-chart-4/20 text-chart-4",
  "low-stock": "bg-orange-accent/20 text-orange-accent",
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Últimas acciones del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.type as keyof typeof activityIcons]
            return (
              <div key={index} className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${activityColors[activity.type as keyof typeof activityColors]}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{activity.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(activity.time, { addSuffix: true, locale: es })}</span>
                    <span>•</span>
                    <span>{activity.user}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
