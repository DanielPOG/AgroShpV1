const PROTECTED_ROLE_NAMES = new Set([
  'Admin',
  'Administrador',
  'Cajero',
  'Inventarista',
  'Consulta',
  'Supervisor',
])

export function canDeactivateUser(actorUserId: number, targetUserId: number): boolean {
  return actorUserId !== targetUserId
}

export function isProtectedRoleName(roleName: string): boolean {
  return PROTECTED_ROLE_NAMES.has(roleName.trim())
}

export function canDeleteRole(roleName: string, assignedUsers: number): { allowed: boolean; reason?: string } {
  if (assignedUsers > 0) {
    return {
      allowed: false,
      reason: 'No se puede eliminar un rol con usuarios asignados',
    }
  }

  if (isProtectedRoleName(roleName)) {
    return {
      allowed: false,
      reason: 'No se puede eliminar un rol base del sistema',
    }
  }

  return { allowed: true }
}
