/**
 * Helpers de autorizacion para endpoints sensibles/financieros.
 */

const ADMIN_ROLES = new Set(['Admin', 'Administrador'])
const FINANCIAL_REPORT_ROLES = new Set(['Admin', 'Administrador', 'Supervisor'])

export function normalizeRole(role: string | null | undefined): string {
  return (role || '').trim()
}

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.has(normalizeRole(role))
}

export function isAdminOrSupervisor(role: string | null | undefined): boolean {
  return FINANCIAL_REPORT_ROLES.has(normalizeRole(role))
}

export function canAccessFinancialReports(role: string | null | undefined): boolean {
  return FINANCIAL_REPORT_ROLES.has(normalizeRole(role))
}
