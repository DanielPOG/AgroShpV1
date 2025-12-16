"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MetaVentasProps {
  meta: {
    id: number
    nombre: string
    monto_objetivo: number
    anio: number
    monto_actual: number
    porcentaje: number
  } | null
}

export function MetaVentas({ meta }: MetaVentasProps) {
  if (!meta) {
    return (
      <Card className="col-span-full">
        <CardHeader className="p-4 xs:p-5 sm:p-6">
          <CardTitle className="text-base xs:text-lg sm:text-xl flex items-center gap-2">
            <Target className="h-5 w-5" />
            Meta de Ventas
          </CardTitle>
          <CardDescription className="text-xs xs:text-sm">
            No hay meta configurada para este año
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
          <div className="text-center py-6 xs:py-8 text-muted-foreground text-xs xs:text-sm">
            <p>Configure una meta de ventas desde Configuración</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const porcentaje = meta.porcentaje
  const estaCompleta = porcentaje >= 100
  const estaCerca = porcentaje >= 80 && porcentaje < 100
  
  // Determinar color de la barra
  let colorBarra = "bg-primary"
  if (estaCompleta) {
    colorBarra = "bg-green-500"
  } else if (estaCerca) {
    colorBarra = "bg-orange-accent"
  }

  // Determinar color del badge
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary"
  let badgeText = ""
  
  if (estaCompleta) {
    badgeVariant = "default"
    badgeText = "¡Meta Alcanzada! 🎉"
  } else if (estaCerca) {
    badgeVariant = "outline"
    badgeText = "¡Casi lo logras!"
  } else if (porcentaje >= 50) {
    badgeVariant = "secondary"
    badgeText = "En progreso"
  } else {
    badgeVariant = "secondary"
    badgeText = "Iniciando"
  }

  const restante = Math.max(0, meta.monto_objetivo - meta.monto_actual)

  return (
    <Card className="col-span-full bg-gradient-to-br from-primary/5 via-background to-chart-4/5 border-primary/20">
      <CardHeader className="p-4 xs:p-5 sm:p-6">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
          <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 xs:h-12 xs:w-12 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-lg flex-shrink-0">
              <Target className="h-5 w-5 xs:h-6 xs:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base xs:text-lg sm:text-xl truncate">
                {meta.nombre}
              </CardTitle>
              <CardDescription className="text-xs xs:text-sm flex items-center gap-1.5 flex-wrap">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>Año {meta.anio}</span>
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={badgeVariant} 
            className="text-xs xs:text-sm px-2.5 xs:px-3 py-1 self-start xs:self-auto whitespace-nowrap"
          >
            {badgeText}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
        <div className="space-y-4 xs:space-y-6">
          {/* Barra de progreso */}
          <div className="space-y-2 xs:space-y-3">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs xs:text-sm text-muted-foreground">Progreso</p>
                <p className="text-2xl xs:text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">
                  {porcentaje.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs xs:text-sm text-muted-foreground">Objetivo</p>
                <p className="text-lg xs:text-xl sm:text-2xl font-bold text-foreground whitespace-nowrap">
                  ${meta.monto_objetivo.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
            
            <div className="relative">
              <Progress 
                value={Math.min(porcentaje, 100)} 
                className="h-3 xs:h-4 sm:h-5 bg-muted/30"
              />
              <div 
                className={`absolute top-0 left-0 h-full ${colorBarra} rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(porcentaje, 100)}%` }}
              >
                {porcentaje >= 15 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] xs:text-xs font-bold text-white drop-shadow-sm">
                      {porcentaje.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-3 xs:gap-4">
            <div className="bg-primary/10 backdrop-blur-sm rounded-lg p-3 xs:p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-primary flex-shrink-0" />
                <p className="text-[10px] xs:text-xs font-medium text-muted-foreground">Recaudado</p>
              </div>
              <p className="text-base xs:text-lg sm:text-xl font-bold text-primary break-words">
                ${meta.monto_actual.toLocaleString('es-CO')}
              </p>
            </div>

            <div className="bg-chart-4/10 backdrop-blur-sm rounded-lg p-3 xs:p-4 border border-chart-4/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-chart-4 flex-shrink-0" />
                <p className="text-[10px] xs:text-xs font-medium text-muted-foreground">
                  {estaCompleta ? "Excedente" : "Por alcanzar"}
                </p>
              </div>
              <p className={`text-base xs:text-lg sm:text-xl font-bold break-words ${
                estaCompleta ? "text-green-600" : "text-chart-4"
              }`}>
                ${restante.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          {/* Mensaje motivacional */}
          {!estaCompleta && (
            <div className="bg-gradient-to-r from-primary/5 to-chart-4/5 rounded-lg p-3 xs:p-4 border border-primary/20">
              <p className="text-xs xs:text-sm text-center text-muted-foreground">
                {porcentaje < 25 && "¡Vamos, el año apenas comienza! 💪"}
                {porcentaje >= 25 && porcentaje < 50 && "¡Buen ritmo, sigue así! 🚀"}
                {porcentaje >= 50 && porcentaje < 75 && "¡Excelente progreso! 🌟"}
                {porcentaje >= 75 && porcentaje < 100 && "¡Ya casi llegas a la meta! 🎯"}
              </p>
            </div>
          )}

          {estaCompleta && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 xs:p-4 border border-green-500/20">
              <p className="text-xs xs:text-sm text-center font-medium text-green-700 dark:text-green-400">
                ¡Felicitaciones! Has superado la meta del año 🏆
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
