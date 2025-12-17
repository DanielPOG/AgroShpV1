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
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Rutas completamente públicas que no necesitan middleware
    const isPublicPage = pathname === '/' || pathname.startsWith('/catalogo')
    const isPublicAsset = pathname.startsWith('/_next') || 
                          pathname.startsWith('/favicon') ||
                          pathname.includes('.')
    const isAuthPage = pathname.startsWith('/login')
    const isDashboard = pathname.startsWith('/dashboard')
    const isApiRoute = pathname.startsWith('/api')
    const isAuthApi = pathname.startsWith('/api/auth')
    const isPublicApi = pathname.startsWith('/api/public') || 
                        pathname.startsWith('/api/config/public') ||
                        pathname.startsWith('/api/catalogo')
    const isCronRoute = pathname === '/api/lotes/check-vencimientos'
    
    // Si es página pública o asset, dejar pasar sin procesar
    if (isPublicPage || isPublicAsset || isAuthApi) {
        return NextResponse.next()
    }

    // Permitir rutas públicas de API sin autenticación
    if (isPublicApi || isCronRoute) {
        return NextResponse.next()
    }

    // Obtener token de sesión solo para rutas protegidas
    let token = null
    try {
        token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === 'production',
            cookieName: process.env.NODE_ENV === 'production' 
                ? '__Secure-next-auth.session-token'
                : 'next-auth.session-token'
        })
    } catch (error) {
        console.error('Error al obtener token:', error)
        // Si hay error obteniendo token, redirigir a login
        if (isDashboard) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        if (isApiRoute) {
            return NextResponse.json(
                { error: 'Sesión inválida o expirada' },
                { status: 401 }
            )
        }
    }

    // Proteger rutas de API
    if (isApiRoute) {
        if (!token) {
            return NextResponse.json(
                { error: 'No autorizado - Se requiere iniciar sesión' },
                { status: 401 }
            )
        }
        return NextResponse.next()
    }

    // Redirigir a login si intenta acceder al dashboard sin autenticación
    if (isDashboard && !token) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    // Redirigir a dashboard si ya está autenticado e intenta ir a login
    if (isAuthPage && token) {
        const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
        const redirectUrl = callbackUrl && callbackUrl.startsWith('/dashboard') 
            ? callbackUrl 
            : '/dashboard'
        return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    // Si está en login sin token, permitir acceso
    if (isAuthPage) {
        return NextResponse.next()
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
