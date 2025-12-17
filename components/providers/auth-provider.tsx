"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refrescar sesión cada 5 minutos
      refetchOnWindowFocus={true} // Refrescar al enfocar ventana
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}
