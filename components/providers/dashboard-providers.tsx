"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { AlertasPollingProvider } from "@/components/providers/alertas-polling-provider"
import type { Session } from "next-auth"

interface DashboardProvidersProps {
  children: React.ReactNode
  session: Session | null
}

/**
 * Dashboard Providers - Solo para páginas autenticadas
 * Envuelve el contenido del dashboard con SessionProvider
 * Recibe la sesión del servidor para evitar el estado de loading inicial
 */
export function DashboardProviders({ children, session }: DashboardProvidersProps) {
  return (
    <NextAuthSessionProvider session={session}>
      <AlertasPollingProvider pollingInterval={300000}>
        {children}
      </AlertasPollingProvider>
    </NextAuthSessionProvider>
  )
}
