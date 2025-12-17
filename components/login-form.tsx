"use client"

import type React from "react"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, Loader2, Sparkles, Lock, Home, ArrowLeft } from "lucide-react"
import { type UserRole, getRoleLabel, getRoleDescription } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"

interface LoginFormProps {
  // Sin props necesarios ahora que usamos NextAuth
}

const roleColors = {
  admin: "bg-gradient-to-r from-primary to-chart-4 text-white border-0",
  inventarista: "bg-gradient-to-r from-chart-4 to-chart-3 text-white border-0",
  cajero: "bg-gradient-to-r from-orange-accent to-chart-2 text-white border-0",
  consulta: "bg-gradient-to-r from-chart-3 to-chart-5 text-white border-0",
}

export function LoginForm({}: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Credenciales inválidas. Verifica tu email y contraseña.")
      } else if (result?.ok) {
        // Login exitoso, redirigir al dashboard
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("Error al iniciar sesión. Intenta nuevamente.")
      console.error("Error en login:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("agroshop2024")
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: demoEmail,
        password: "agroshop2024",
        redirect: false,
      })

      if (result?.error) {
        setError("Error al iniciar sesión con cuenta de demostración")
      } else if (result?.ok) {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("Error al iniciar sesión")
      console.error("Error en quick login:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-chart-4 to-orange-accent p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-accent/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-48 h-48 bg-chart-4/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        <div className="hidden lg:flex flex-col gap-8 text-white animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl animate-pulse-glow">
              <Leaf className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">AgroShop</h1>
              <p className="text-white/80 text-lg">SENA Centro Agropecuario</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-orange-accent" />
              <h2 className="text-3xl font-bold">Sistema de Gestión Integral</h2>
            </div>
            <p className="text-white/90 text-lg leading-relaxed">
              Plataforma completa para la gestión de ventas, inventario y producción de las unidades productivas del
              Centro Agropecuario SENA. Control total en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "100%", label: "Control de inventario", delay: "0s" },
              { value: "24/7", label: "Acceso al sistema", delay: "0.1s" },
              { value: "8+", label: "Unidades productivas", delay: "0.2s" },
              { value: "Real", label: "Tiempo real", delay: "0.3s" },
            ].map((stat, index) => (
              <div
                key={index}
                className="p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 animate-slide-up"
                style={{ animationDelay: stat.delay }}
              >
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <Lock className="h-5 w-5 text-white/80" />
            <p className="text-sm text-white/80">Plataforma segura con roles y permisos diferenciados</p>
          </div>

          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-full bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white transition-all duration-300"
          >
            <Home className="mr-2 h-4 w-4" />
            Ver Catálogo Público
          </Button>
        </div>

        <Card className="shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl animate-scale-in">
          <CardHeader className="space-y-4 pb-6">
            <div className="lg:hidden flex items-center gap-3 justify-center pb-2">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-lg">
                <Leaf className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">AgroShop</h1>
                <p className="text-xs text-muted-foreground">SENA Centro Agropecuario</p>
              </div>
            </div>
            <CardTitle className="text-3xl text-center lg:text-left">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center lg:text-left">
              Ingresa con tu correo institucional SENA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@sena.edu.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 animate-slide-up">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-primary to-chart-4 hover:from-primary/90 hover:to-chart-4/90 transition-all duration-300 hover:scale-[1.02] shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">O</span>
              </div>
            </div>

            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full h-11 border-2 hover:bg-primary/5 transition-all duration-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Catálogo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
