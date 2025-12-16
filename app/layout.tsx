import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "@/components/providers/session-provider"
import { getCachedConfig } from "@/lib/config-cache"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const config = await getCachedConfig()
  const storeName = config.nombre_tienda ?? 'AgroShop SENA'
  
  return {
    title: `${storeName} - Sistema de Gestión`,
    description: `Sistema integral de gestión de ventas, inventario y producción - ${storeName}`,
    generator: "v0.app",
    icons: {
      icon: [
        {
          url: "/icon-light-32x32.png",
          media: "(prefers-color-scheme: light)",
        },
        {
          url: "/icon-dark-32x32.png",
          media: "(prefers-color-scheme: dark)",
        },
        {
          url: "/icon.svg",
          type: "image/svg+xml",
        },
      ],
      apple: "/apple-icon.png",
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
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
