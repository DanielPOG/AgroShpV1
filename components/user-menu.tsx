"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LogOut, User, Settings, Shield } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { getRoleLabel } from "@/lib/auth"

/**
 * Menú desplegable del usuario actual
 * Muestra información del usuario y opción de logout
 */
export function UserMenu() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const handleLogout = async () => {
        setIsSigningOut(true)
        try {
            await signOut({
                redirect: false,
            })
            router.push("/login")
            router.refresh()
        } catch (error) {
            console.error("Error al cerrar sesión:", error)
            setIsSigningOut(false)
        }
    }

    if (isLoading || !user) {
        return (
            <Button variant="ghost" size="icon" disabled>
                <User className="h-4 w-4" />
            </Button>
        )
    }

    // Obtener iniciales del nombre
    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)

    // Color del badge según el rol
    const roleColors = {
        Admin: "bg-gradient-to-r from-primary to-chart-4 text-white border-0",
        Inventarista: "bg-gradient-to-r from-chart-4 to-chart-3 text-white border-0",
        Cajero: "bg-gradient-to-r from-orange-accent to-chart-2 text-white border-0",
        Consulta: "bg-gradient-to-r from-chart-3 to-chart-5 text-white border-0",
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-10 gap-2 hover:bg-accent"
                    disabled={isSigningOut}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-chart-4 text-white text-sm font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start text-sm">
                        <span className="font-medium text-foreground">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 z-[100]" align="end" sideOffset={5}>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-primary to-chart-4 text-white font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="text-sm font-medium leading-none mb-1">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <Badge className={`text-xs font-medium ${roleColors[user.role as keyof typeof roleColors]}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(user.role)}
                        </Badge>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isSigningOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isSigningOut ? "Cerrando sesión..." : "Cerrar Sesión"}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

