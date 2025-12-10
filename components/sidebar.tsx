"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ShoppingCart,
  BarChart3,
  Globe,
  Leaf,
  Menu,
  X,
  PackageCheck,
  Settings,
  Wallet,
  Banknote,
  Receipt,
  Calculator,
  Clock,
} from "lucide-react"

interface SidebarProps {
  userRole: string
  userName: string
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Admin", "Inventarista", "Cajero", "Consulta"],
  },
  { 
    name: "Inventario", 
    href: "/dashboard/inventario", 
    icon: Package, 
    roles: ["Admin", "Inventarista"] 
  },
  { 
    name: "Lotes", 
    href: "/dashboard/lotes", 
    icon: PackageCheck, 
    roles: ["Admin", "Inventarista"],
    description: "Trazabilidad y vencimientos"
  },
  { 
    name: "Movimientos", 
    href: "/dashboard/movimientos", 
    icon: ArrowLeftRight, 
    roles: ["Admin", "Inventarista"] 
  },
  { 
    name: "Punto de Venta", 
    href: "/dashboard/pos", 
    icon: ShoppingCart, 
    roles: ["Admin", "Cajero"] 
  },
  { 
    name: "Movimientos de Caja", 
    href: "/dashboard/caja/movimientos", 
    icon: Wallet, 
    roles: ["Admin", "Cajero"],
    description: "Ingresos y egresos adicionales"
  },
  { 
    name: "Retiros de Caja", 
    href: "/dashboard/caja/retiros", 
    icon: Banknote, 
    roles: ["Admin", "Cajero"],
    description: "Solicitudes y autorizaciones de retiros"
  },
  { 
    name: "Gastos de Caja", 
    href: "/dashboard/caja/gastos", 
    icon: Receipt, 
    roles: ["Admin", "Cajero"],
    description: "Registro de gastos operativos"
  },
  { 
    name: "Arqueos de Caja", 
    href: "/dashboard/caja/arqueos", 
    icon: Calculator, 
    roles: ["Admin", "Cajero", "Supervisor"],
    description: "Conteo físico y cierre de caja"
  },
  { 
    name: "Turnos de Caja", 
    href: "/dashboard/caja/turnos", 
    icon: Clock, 
    roles: ["Admin", "Cajero", "Supervisor"],
    description: "Gestión de turnos y relevos"
  },
  { 
    name: "Reportes", 
    href: "/dashboard/reportes", 
    icon: BarChart3, 
    roles: ["Admin", "Inventarista", "Consulta"] 
  },
  { 
    name: "Configuración", 
    href: "/dashboard/configuracion/cajas", 
    icon: Settings, 
    roles: ["Admin"],
    description: "Gestión de cajas y configuración"
  },
  { 
    name: "Catálogo Público", 
    href: "/", 
    icon: Globe, 
    roles: ["Admin", "Inventarista", "Cajero", "Consulta"] 
  },
]

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Filtrar navegación según rol del usuario
  const filteredNavigation = navigation.filter((item) => item.roles.includes(userRole))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-br from-primary/5 to-chart-4/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-lg">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-foreground">AgroShop</h2>
            <p className="text-xs text-muted-foreground">Centro Agropecuario</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 py-4">
        <div className="space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Navegación</p>
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-chart-4 text-white shadow-md scale-[1.02]"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-[1.01]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>

      <Separator className="shrink-0" />

      <div className="p-3 sm:p-4 shrink-0 bg-card">
        <div className="px-2 sm:px-3 py-2 sm:py-3 rounded-lg bg-gradient-to-br from-secondary to-accent border border-border">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Usuario Activo</p>
          <p className="text-xs sm:text-sm font-semibold text-foreground mt-1 truncate">{userName}</p>
          <p className="text-[10px] sm:text-xs text-primary capitalize font-medium">{userRole}</p>
        </div>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-2">
          Cerrar sesión desde el menú de usuario
        </p>
      </div>
    </div>
  )

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed top-2 left-2 z-50 lg:hidden shadow-lg bg-card h-9 w-9 sm:h-10 sm:w-10"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
      </Button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 border-r border-border bg-card flex flex-col transition-transform duration-300 lg:hidden overflow-hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar - sticky positioning */}
      <aside className="hidden lg:flex lg:flex-col h-screen w-64 border-r border-border bg-card sticky top-0 overflow-hidden">
        <SidebarContent />
      </aside>
    </>
  )
}
