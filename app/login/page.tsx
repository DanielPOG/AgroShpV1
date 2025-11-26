"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import type { UserRole } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ email: string; name: string; role: UserRole } | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("agroshop_user")
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
      setIsAuthenticated(true)
      router.push("/dashboard")
    }
  }, [router])

  const handleLogin = (email: string, name: string, role: UserRole) => {
    const userData = { email, name, role }
    localStorage.setItem("agroshop_user", JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
    router.push("/dashboard")
  }

  if (isAuthenticated && user) {
    return null
  }

  return <LoginForm onLogin={handleLogin} />
}
