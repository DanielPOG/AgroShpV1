"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

/**
 * Wrapper de autenticación para Client Components legacy
 * 
 * Uso temporal mientras migramos a Server Components
 * 
 * Uso:
 * ```tsx
 * export default function Page() {
 *   return (
 *     <AuthWrapper requiredPermission="inventario">
 *       <YourPageContent />
 *     </AuthWrapper>
 *   )
 * }
 * ```
 */
interface AuthWrapperProps {
  children: React.ReactNode
  requiredPermission?: string
}

export function AuthWrapper({ children, requiredPermission }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredPermission) {
      if (!hasPermission(requiredPermission) && !hasPermission('all')) {
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, hasPermission, requiredPermission, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requiredPermission && !hasPermission(requiredPermission) && !hasPermission('all')) {
    return null
  }

  return <>{children}</>
}

