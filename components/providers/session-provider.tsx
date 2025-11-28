"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

/**
 * Wrapper del SessionProvider de NextAuth
 * Permite usar useSession() en componentes de cliente
 */
export function SessionProvider({
    children,
    session,
}: {
    children: React.ReactNode
    session: Session | null
}) {
    return (
        <NextAuthSessionProvider session={session}>
            {children}
        </NextAuthSessionProvider>
    )
}

