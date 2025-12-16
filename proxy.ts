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

    // Rutas completamente públicas que no necesitan middleware
    const isPublicPage = pathname === '/' || pathname.startsWith('/catalogo')
    const isPublicAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon')
    
    // Si es página pública, dejar pasar sin procesar token
    if (isPublicPage || isPublicAsset) {
        return NextResponse.next()
    }

    // Obtener token de sesión solo para rutas protegidas
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    })

    const isAuthPage = pathname.startsWith('/login')
    const isDashboard = pathname.startsWith('/dashboard')
    const isApiRoute = pathname.startsWith('/api')
    const isPublicApi = pathname.startsWith('/api/public') || pathname.startsWith('/api/config/public')
    const isCronRoute = pathname === '/api/lotes/check-vencimientos'

    // Permitir rutas públicas de API sin autenticación
    if (isPublicApi) {
        return NextResponse.next()
    }

    // Permitir Vercel Cron para verificación de lotes vencidos
    if (isCronRoute) {
        return NextResponse.next()
    }

    // Proteger rutas de API (excepto auth y cron)
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
         * Solo ejecutar middleware en:
         * - /dashboard/* (rutas protegidas)
         * - /api/* (APIs protegidas, excepto públicas que se manejan dentro)
         * - /login (página de autenticación)
         * 
         * NO ejecutar en:
         * - / (catálogo público)
         * - /catalogo (catálogo público)
         * - _next/static (archivos estáticos)
         * - _next/image (optimización de imágenes)
         * - favicon.ico
         * - archivos públicos (imágenes, etc.)
         */
        '/dashboard/:path*',
        '/api/:path*',
        '/login',
    ],
}
