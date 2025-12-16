"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, DollarSign, TrendingDown, TrendingUp, Receipt } from "lucide-react"
import Link from "next/link"

/**
 * Página principal de Caja - Dashboard de opciones
 */
export default function CajaPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Caja</h1>
        <p className="text-muted-foreground mt-1">
          Administra sesiones, movimientos y operaciones de caja
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Turnos de Caja */}
        <Link href="/dashboard/caja/turnos">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <Clock className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Turnos de Caja</CardTitle>
              <CardDescription>
                Abrir, cerrar y gestionar sesiones de caja
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Ir a Turnos
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Movimientos */}
        <Link href="/dashboard/caja/movimientos">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <TrendingUp className="h-8 w-8 mb-2 text-green-600" />
              <CardTitle>Movimientos de Caja</CardTitle>
              <CardDescription>
                Registrar ingresos y egresos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Ver Movimientos
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Gastos */}
        <Link href="/dashboard/caja/gastos">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <TrendingDown className="h-8 w-8 mb-2 text-red-600" />
              <CardTitle>Gastos de Caja</CardTitle>
              <CardDescription>
                Registrar y controlar gastos operativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Registrar Gastos
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Retiros */}
        <Link href="/dashboard/caja/retiros">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <DollarSign className="h-8 w-8 mb-2 text-amber-600" />
              <CardTitle>Retiros de Caja</CardTitle>
              <CardDescription>
                Gestionar retiros de efectivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Ver Retiros
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Arqueos */}
        <Link href="/dashboard/caja/arqueos">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <Receipt className="h-8 w-8 mb-2 text-blue-600" />
              <CardTitle>Historial de Arqueos</CardTitle>
              <CardDescription>
                Consultar arqueos de caja realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Ver Arqueos
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
