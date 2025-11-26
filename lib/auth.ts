// Mock authentication system
export type UserRole = "admin" | "inventarista" | "cajero" | "consulta"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

// Mock users for demo
const mockUsers: User[] = [
  { id: "1", email: "admin@sena.edu.co", name: "Administrador SENA", role: "admin" },
  { id: "2", email: "inventario@sena.edu.co", name: "Juan Inventarista", role: "inventarista" },
  { id: "3", email: "cajero@sena.edu.co", name: "María Cajera", role: "cajero" },
  { id: "4", email: "consulta@sena.edu.co", name: "Pedro Consultor", role: "consulta" },
]

export async function login(email: string, password: string): Promise<User | null> {
  // Mock authentication - in production use real auth
  await new Promise((resolve) => setTimeout(resolve, 500))

  const user = mockUsers.find((u) => u.email === email)
  if (user && password.length > 0) {
    return user
  }
  return null
}

export function getRolePermissions(role: UserRole) {
  const permissions = {
    admin: {
      canViewDashboard: true,
      canManageInventory: true,
      canMoveProducts: true,
      canUsePOS: true,
      canViewReports: true,
      canManageUsers: true,
    },
    inventarista: {
      canViewDashboard: true,
      canManageInventory: true,
      canMoveProducts: true,
      canUsePOS: false,
      canViewReports: true,
      canManageUsers: false,
    },
    cajero: {
      canViewDashboard: true,
      canManageInventory: false,
      canMoveProducts: false,
      canUsePOS: true,
      canViewReports: false,
      canManageUsers: false,
    },
    consulta: {
      canViewDashboard: true,
      canManageInventory: false,
      canMoveProducts: false,
      canUsePOS: false,
      canViewReports: true,
      canManageUsers: false,
    },
  }

  return permissions[role]
}

export function getRoleLabel(role: UserRole): string {
  const labels = {
    admin: "Administrador",
    inventarista: "Inventarista",
    cajero: "Cajero",
    consulta: "Consulta",
  }
  return labels[role]
}

export function getRoleDescription(role: UserRole): string {
  const descriptions = {
    admin: "Acceso total al sistema",
    inventarista: "Gestión de inventario y movimientos",
    cajero: "Punto de venta y operaciones",
    consulta: "Solo lectura y reportes",
  }
  return descriptions[role]
}
