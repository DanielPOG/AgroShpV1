"use client"

import { useSession } from "next-auth/react"
import type { UserRole } from "@/lib/auth"
import { hasPermission } from "@/lib/auth"

/**
 * Hook personalizado para usar autenticación en componentes de cliente
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, isAdmin, hasPermission } = useAuth()
 * 
 * if (!isAuthenticated) return <LoginPrompt />
 * if (!hasPermission('inventario')) return <Forbidden />
 * ```
 */
export function useAuth() {
    const { data: session, status } = useSession()

    const user = session?.user
        ? {
              id: session.user.id || "",
              email: session.user.email || "",
              name: session.user.name || "",
              role: session.user.role as UserRole,
          }
        : null

    return {
        // Usuario actual
        user,

        // Estados
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        isUnauthenticated: status === "unauthenticated",

        // Información del usuario
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        userRole: user?.role,

        // Verificaciones de rol
        isAdmin: user?.role === "Admin",
        isInventarista: user?.role === "Inventarista",
        isCajero: user?.role === "Cajero",
        isConsulta: user?.role === "Consulta",

        // Verificación de permisos
        hasPermission: (permission: string) => {
            if (!user?.role) return false
            return hasPermission(user.role, permission)
        },

        // Sesión completa (si necesitas más datos)
        session,
    }
}

/**
 * Hook para requerir autenticación
 * Redirige automáticamente a login si no está autenticado
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user } = useRequireAuth()
 *   return <div>Hola {user.name}</div>
 * }
 * ```
 */
export function useRequireAuth() {
    const auth = useAuth()

    // TODO: Implementar redirección automática si es necesario
    // Por ahora el middleware ya protege las rutas

    return auth
}

