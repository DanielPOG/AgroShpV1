import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShoppingCart, Package, TrendingDown } from "lucide-react"
import { UserMenu } from "@/components/user-menu"

interface DashboardHeaderProps {
  title: string
  description?: string
}

const notifications = [
  {
    id: 1,
    type: "sale",
    title: "Nueva Venta",
    message: "Venta de $45,000 registrada",
    time: "Hace 2 min",
    icon: ShoppingCart,
    color: "text-primary",
  },
  {
    id: 2,
    type: "movement",
    title: "Movimiento de Inventario",
    message: "15kg de queso transferidos",
    time: "Hace 15 min",
    icon: Package,
    color: "text-chart-4",
  },
  {
    id: 3,
    type: "alert",
    title: "Alerta de Stock",
    message: "Lechuga bajo stock (8 unidades)",
    time: "Hace 1 hora",
    icon: TrendingDown,
    color: "text-orange-accent",
  },
]

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative bg-transparent">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-accent border-0">
                {notifications.length}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
              <p className="text-xs text-muted-foreground">Movimientos y transacciones del sistema</p>
            </div>
            <ScrollArea className="h-80">
              <div className="p-2">
                {notifications.map((notification) => {
                  const Icon = notification.icon
                  return (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div
                        className={`h-8 w-8 rounded-lg bg-secondary flex items-center justify-center ${notification.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{notification.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        {/* Menú de usuario con logout */}
        <UserMenu />
      </div>
    </div>
  )
}
