import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, ShoppingCart, Package, TrendingUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Actividad {
  tipo: string
  mensaje: string
  fecha: Date
  usuario: string
}

interface RecentActivityProps {
  actividades: Actividad[]
}

const activityIcons = {
  venta: ShoppingCart,
  movimiento: Package,
  bajo_stock: TrendingUp,
}

const activityColors = {
  venta: "bg-primary/10 text-primary",
  movimiento: "bg-chart-4/20 text-chart-4",
  bajo_stock: "bg-orange-accent/20 text-orange-accent",
}

export function RecentActivity({ actividades }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Últimas acciones del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        {actividades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No hay actividades recientes</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {actividades.map((actividad, index) => {
              const Icon = activityIcons[actividad.tipo as keyof typeof activityIcons] || ShoppingCart
              return (
                <div key={index} className="flex items-start gap-2 sm:gap-3">
                  <div
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activityColors[actividad.tipo as keyof typeof activityColors] || activityColors.venta
                    }`}
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground break-words">
                      {actividad.mensaje}
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="break-words">
                        {formatDistanceToNow(new Date(actividad.fecha), { addSuffix: true, locale: es })}
                      </span>
                      <span className="hidden xs:inline">•</span>
                      <span className="break-words">{actividad.usuario}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
