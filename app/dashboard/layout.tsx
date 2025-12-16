import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth.server'
import { Sidebar } from '@/components/sidebar'
import { DashboardProviders } from '@/components/providers/dashboard-providers'

/**
 * Layout del Dashboard - Server Component
 * 
 * ✅ Verifica autenticación en el servidor
 * ✅ Incluye Sidebar en todas las páginas del dashboard
 * ✅ Usa auth() de NextAuth para sesión segura
 * ✅ Incluye polling automático de alertas cada 5 minutos
 * ✅ SessionProvider solo en rutas del dashboard
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar sesión en el servidor
  const session = await auth()

  // Si no hay sesión, redirigir a login
  if (!session || !session.user) {
    redirect('/login')
  }

  return (
    <DashboardProviders>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar con datos de la sesión */}
        <Sidebar
          userRole={session.user.role || 'Consulta'}
          userName={session.user.name || 'Usuario'}
        />

        {/* Contenido principal con scroll */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardProviders>
  )
}
