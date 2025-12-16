"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { AlertasPollingProvider } from "@/components/providers/alertas-polling-provider"

/**
 * Dashboard Providers - Solo para páginas autenticadas
 * Envuelve el contenido del dashboard con SessionProvider
 */
export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <AlertasPollingProvider pollingInterval={300000}>
        {children}
      </AlertasPollingProvider>
    </NextAuthSessionProvider>
  )
}
