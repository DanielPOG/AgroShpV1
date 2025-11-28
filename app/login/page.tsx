"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/login-form"
import { Loader2 } from "lucide-react"

/**
 * Página de Login
 * 
 * - Si ya está autenticado, redirige al dashboard
 * - Si no, muestra el formulario de login
 * - Ya no usa localStorage (todo en NextAuth)
 */
export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    // Si ya está autenticado, redirigir al dashboard
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-chart-4 to-orange-accent">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si ya está autenticado, no mostrar nada (se está redirigiendo)
  if (isAuthenticated) {
    return null
  }

  // Mostrar formulario de login
  return <LoginForm />
}
