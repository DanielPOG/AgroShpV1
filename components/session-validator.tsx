"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

/**
 * Componente para verificar la sesión periódicamente
 * y redirigir a login si expira
 */
export function SessionValidator() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Solo redirigir si el status es definitivamente unauthenticated
    // y no estamos en proceso de carga
    if (status === "unauthenticated" && !hasRedirected.current) {
      // Esperar un momento para asegurar que no es un estado transitorio
      const timeout = setTimeout(() => {
        if (status === "unauthenticated") {
          hasRedirected.current = true
          const currentPath = window.location.pathname + window.location.search
          router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`)
        }
      }, 100)

      return () => clearTimeout(timeout)
    }

    // Resetear flag si vuelve a estar autenticado
    if (status === "authenticated") {
      hasRedirected.current = false
    }
  }, [status, router])

  // Este componente no renderiza nada
  return null
}
