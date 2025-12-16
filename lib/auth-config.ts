import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getColombiaDate } from "@/lib/date-utils"

/**
 * Configuración centralizada de NextAuth.js v4
 * 
 * Este archivo exporta authOptions para ser usado en:
 * - app/api/auth/[...nextauth]/route.ts (handler principal)
 * - Otros API routes que necesitan validar sesión
 * - Server Components con getServerSession
 */

export const authOptions: NextAuthOptions = {
    // adapter: PrismaAdapter(prisma), // Comentado: no necesario para CredentialsProvider
    
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                try {
                    // Buscar usuario en BD
                    const user = await prisma.usuarios.findUnique({
                        where: { 
                            email: credentials.email 
                        },
                        include: { 
                            rol: true 
                        }
                    })

                    // Verificar que usuario existe y está activo
                    if (!user || !user.activo) {
                        console.log('Usuario no encontrado o inactivo:', credentials.email)
                        return null
                    }

                    // Verificar contraseña
                    const isValidPassword = await bcrypt.compare(
                        credentials.password,
                        user.password_hash
                    )

                    if (!isValidPassword) {
                        console.log('Contraseña inválida para:', credentials.email)
                        return null
                    }

                    // Actualizar último acceso
                    await prisma.usuarios.update({
                        where: { id: user.id },
                        data: { ultimo_acceso: getColombiaDate() }
                    })

                    // Retornar usuario para la sesión
                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: `${user.nombre} ${user.apellido}`,
                        role: user.rol?.nombre || 'Consulta',
                    }
                } catch (error) {
                    console.error('Error en authorize:', error)
                    return null
                }
            }
        })
    ],

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 días
        updateAge: 24 * 60 * 60, // Actualizar cada 24 horas
    },

    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    },

    pages: {
        signIn: "/login",
        error: "/login",
    },

    callbacks: {
        async jwt({ token, user }) {
            // Agregar role al token en el primer login
            if (user) {
                token.role = user.role
                token.id = user.id
            }
            return token
        },

        async session({ session, token }) {
            // Agregar role e id a la sesión
            if (session.user) {
                session.user.role = token.role as string
                session.user.id = token.id as string
            }
            return session
        },
    },

    debug: process.env.NODE_ENV === 'development',
}
