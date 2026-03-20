import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { getCachedConfig } from "@/lib/config-cache"
import { AuthProvider } from "@/components/providers/auth-provider"
import { ReactQueryProvider } from "@/components/providers/react-query-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const config = await getCachedConfig()
  const storeName = config.nombre_tienda ?? 'AgroShop SENA'
  
  const description = `Sistema integral de gestión de ventas, inventario y producción - ${storeName}`

  return {
    title: `${storeName} - Sistema de Gestión`,
    description,
    metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://agroshop.vercel.app'),
    openGraph: {
      title: `${storeName} - Sistema de Gestión`,
      description,
      siteName: storeName,
      locale: 'es_CO',
      type: 'website',
      images: [{
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: storeName,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${storeName} - Sistema de Gestión`,
      description,
      images: ['/api/og'],
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
        <Toaster />
      </body>
    </html>
  )
}
