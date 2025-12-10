import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-config"

/**
 * Handler principal de NextAuth.js v4
 * La configuración está en @/lib/auth-config
 */

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

/**
 * Export auth() para uso en Server Components
 * Esta función permite obtener la sesión en Server Components
 */
export async function auth() {
    const { getServerSession } = await import("next-auth/next")
    return getServerSession(authOptions)
}

