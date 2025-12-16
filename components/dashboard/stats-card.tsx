import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  iconColor?: string
}

export function StatsCard({ title, value, description, icon: Icon, trend, iconColor }: StatsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 xs:p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2 xs:gap-3">
          <div className="space-y-1.5 xs:space-y-2 flex-1 min-w-0">
            <p className="text-xs xs:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div>
              <p className="text-xl xs:text-2xl sm:text-3xl font-bold text-foreground break-words">{value}</p>
              {description && <p className="text-[10px] xs:text-xs text-muted-foreground mt-1 break-words">{description}</p>}
            </div>
            {trend && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className={cn("text-xs xs:text-sm font-medium", trend.isPositive ? "text-primary" : "text-destructive")}>
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-[10px] xs:text-xs text-muted-foreground">vs. ayer</span>
              </div>
            )}
          </div>
          <div className={cn("h-10 w-10 xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0", iconColor || "bg-primary/10")}>
            <Icon className={cn("h-5 w-5 xs:h-5.5 xs:w-5.5 sm:h-6 sm:w-6", iconColor ? "text-white" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
