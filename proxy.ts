import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Proxy para proteger rutas y manejar autenticación (Next.js 15)
 * 
 * Rutas protegidas:
 * - /dashboard/* - Requiere autenticación
 * 
 * Rutas públicas:
 * - / - Catálogo público
 * - /catalogo - Catálogo público alternativo
 * - /login - Página de login
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Obtener token de sesión
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    })

    const isAuthPage = pathname.startsWith('/login')
    const isDashboard = pathname.startsWith('/dashboard')
    const isApiRoute = pathname.startsWith('/api')
    const isPublicApi = pathname.startsWith('/api/public')

    // Permitir rutas públicas de API sin autenticación
    if (isPublicApi) {
        return NextResponse.next()
    }

    // Proteger rutas de API (excepto auth)
    if (isApiRoute && !pathname.startsWith('/api/auth')) {
        if (!token) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }
    }

    // Redirigir a login si intenta acceder al dashboard sin autenticación
    if (isDashboard && !token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Redirigir a dashboard si ya está autenticado e intenta ir a login
    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

/**
 * Configuración del matcher
 * Define qué rutas deben pasar por el middleware
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
