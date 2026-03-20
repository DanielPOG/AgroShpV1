import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth.server'
import { isAdminRole } from '@/lib/security/authorize'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!isAdminRole(session.user.role)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
