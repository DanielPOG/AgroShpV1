"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Users, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

interface ClienteTop {
  id: number
  nombre_completo: string
  tipo_cliente: string
  total_compras: number
  cantidad_compras: number
  ultima_compra: Date | null
  ticket_promedio: number
}

interface ResumenClientes {
  total_clientes: number
  total_compras: number
  ticket_promedio_global: number
}

export function ClientsReport() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  })
  const [clientes, setClientes] = useState<ClienteTop[]>([])
  const [resumen, setResumen] = useState<ResumenClientes | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    cargarReporte()
  }, [dateRange])

  const cargarReporte = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/reportes/clientes?fecha_inicio=${dateRange.from.toISOString()}&fecha_fin=${dateRange.to.toISOString()}&limit=20`
      )
      
      if (response.ok) {
        const result = await response.json()
        setClientes(result.data.clientes_top || [])
        setResumen(result.data.resumen || null)
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtro de fecha */}
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to })
                }
              }}
              locale={es}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Cards de resumen - Optimizado Mobile */}
      {resumen && (
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Total Clientes</p>
              </div>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-primary">{resumen.total_clientes}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Total Compras</p>
              </div>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-foreground">
                ${resumen.total_compras.toLocaleString('es-CO')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 sm:mb-2 truncate">Ticket Promedio</p>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-foreground">
                ${resumen.ticket_promedio_global.toLocaleString('es-CO')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top clientes - Optimizado Mobile */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Top 20 Clientes</h3>
          {clientes.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {clientes.map((cliente, index) => (
                <div
                  key={cliente.id}
                  className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-semibold text-[10px] sm:text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{cliente.nombre_completo}</p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                        <Badge variant="outline" className="text-[8px] sm:text-[10px] py-0 px-1 sm:px-1.5">
                          {cliente.tipo_cliente}
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {cliente.cantidad_compras} {cliente.cantidad_compras === 1 ? 'compra' : 'compras'}
                        </span>
                        {cliente.ultima_compra && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                            Última: {format(new Date(cliente.ultima_compra), 'dd MMM', { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex xs:flex-col items-center xs:items-end gap-2 xs:gap-0 justify-between xs:justify-start pl-8 xs:pl-0">
                    <p className="text-sm sm:text-base md:text-lg font-bold text-primary truncate">
                      ${cliente.total_compras.toLocaleString('es-CO')}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      ~${cliente.ticket_promedio.toLocaleString('es-CO')} ticket
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
              No hay datos de clientes para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
