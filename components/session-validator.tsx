"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

/**
 * Componente para verificar la sesión periódicamente
 * y redirigir a login si expira
 */
export function SessionValidator() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Si la sesión está en estado unauthenticated, redirigir a login
    if (status === "unauthenticated") {
      // Guardar la URL actual para redirigir después del login
      const currentPath = window.location.pathname + window.location.search
      router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`)
    }
  }, [status, router])

  useEffect(() => {
    // Verificar sesión cada 5 minutos
    const interval = setInterval(() => {
      if (status === "authenticated" && !session) {
        // Si está autenticado pero no hay sesión, algo está mal
        router.replace("/login")
      }
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [status, session, router])

  // Este componente no renderiza nada
  return null
}
