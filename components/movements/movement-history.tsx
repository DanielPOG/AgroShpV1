import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { productiveUnits, type Movement } from "@/lib/mock-data"
import { ArrowRight, Clock, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface MovementHistoryProps {
  movements: Movement[]
}

const statusConfig = {
  completado: { label: "Completado", className: "bg-primary text-primary-foreground" },
  pendiente: { label: "Pendiente", className: "bg-orange-accent text-white" },
  cancelado: { label: "Cancelado", className: "bg-destructive text-destructive-foreground" },
}

export function MovementHistory({ movements }: MovementHistoryProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {movements.map((movement) => {
        const fromUnit = productiveUnits.find((u) => u.id === movement.from)
        const toUnit = productiveUnits.find((u) => u.id === movement.to)
        const statusInfo = statusConfig[movement.status]

        return (
          <Card key={movement.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-foreground truncate mb-1 sm:mb-1">
                    {movement.productName}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {fromUnit?.icon} {fromUnit?.name}
                    </Badge>
                    <ArrowRight className="h-2 w-2 sm:h-3 sm:w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {toUnit?.icon} {toUnit?.name}
                    </Badge>
                  </div>
                </div>
                <Badge className={`${statusInfo.className} text-[10px] sm:text-xs shrink-0 self-start`}>
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-0 text-xs sm:text-sm">
                <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-2 w-2 sm:h-3 sm:w-3" />
                    <span className="text-[10px] sm:text-sm">
                      {formatDistanceToNow(new Date(movement.date), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-2 w-2 sm:h-3 sm:w-3" />
                    <span className="text-[10px] sm:text-sm">{movement.user}</span>
                  </div>
                </div>
                <span className="font-semibold text-xs sm:text-sm text-foreground">{movement.quantity} unidades</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
