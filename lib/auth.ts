import { ROLES, PERMISSIONS } from "@/lib/constants"

/**
 * Tipos de roles del sistema
 */
export type UserRole = "Admin" | "Inventarista" | "Cajero" | "Consulta"

/**
 * Interfaz de usuario (compatible con sesión de NextAuth)
 */
export interface User {
    id: string
    email: string
    name: string
    role: UserRole
}

/**
 * NOTA: La función auth() se exporta desde app/api/auth/[...nextauth]/route.ts
 * Importarla desde allí cuando necesites verificar sesión en el servidor
 * 
 * Ejemplo:
 * import { auth } from "@/app/api/auth/[...nextauth]/route"
 * const session = await auth()
 */

/**
 * Verificar si un rol tiene un permiso específico
 */
export function hasPermission(role: UserRole, permission: string): boolean {
    const rolePermissions = PERMISSIONS[role as keyof typeof PERMISSIONS]
    
    if (!rolePermissions) return false
    
    // Si tiene permiso 'all', tiene todos los permisos
    if ('all' in rolePermissions && rolePermissions.all) return true
    
    // Verificar permiso específico
    return permission in rolePermissions && Boolean(rolePermissions[permission as keyof typeof rolePermissions])
}

/**
 * Obtener etiqueta legible del rol
 */
export function getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
        "Admin": "Administrador",
        "Inventarista": "Inventarista",
        "Cajero": "Cajero",
        "Consulta": "Consulta",
    }
    return labels[role] || role
}

/**
 * Obtener descripción del rol
 */
export function getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
        "Admin": "Acceso total al sistema",
        "Inventarista": "Gestión de inventario y movimientos",
        "Cajero": "Punto de venta y operaciones",
        "Consulta": "Solo lectura y reportes",
    }
    return descriptions[role] || ""
}

/**
 * Verificar si el usuario actual tiene un permiso
 * @param session - Sesión de NextAuth
 * @param permission - Permiso a verificar (ej: 'inventario', 'pos', 'ventas')
 */
export function userHasPermission(
    session: { user: { role: string } } | null,
    permission: string
): boolean {
    if (!session?.user?.role) return false
    return hasPermission(session.user.role as UserRole, permission)
}

/**
 * Verificar si el usuario es admin
 */
export function isAdmin(session: { user: { role: string } } | null): boolean {
    return session?.user?.role === ROLES.ADMIN
}

/**
 * Verificar si el usuario puede acceder al POS
 */
export function canUsePOS(session: { user: { role: string } } | null): boolean {
    if (!session?.user?.role) return false
    const role = session.user.role as UserRole
    return hasPermission(role, 'pos') || isAdmin(session)
}

/**
 * Verificar si el usuario puede gestionar inventario
 */
export function canManageInventory(session: { user: { role: string } } | null): boolean {
    if (!session?.user?.role) return false
    const role = session.user.role as UserRole
    return hasPermission(role, 'inventario') || isAdmin(session)
}

/**
 * Verificar si el usuario puede ver reportes
 */
export function canViewReports(session: { user: { role: string } } | null): boolean {
    if (!session?.user?.role) return false
    const role = session.user.role as UserRole
    return hasPermission(role, 'reportes') || isAdmin(session)
}
