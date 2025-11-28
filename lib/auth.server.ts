/**
 * Exporta la función auth() desde NextAuth para uso en Server Components
 * 
 * Uso en Server Components:
 * ```tsx
 * import { auth } from "@/lib/auth.server"
 * 
 * export default async function Page() {
 *   const session = await auth()
 *   if (!session) redirect('/login')
 *   // ... rest of component
 * }
 * ```
 */
export { auth } from "@/app/api/auth/[...nextauth]/route"
