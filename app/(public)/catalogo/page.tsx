import { HomeClientPage } from "@/components/catalog/home-client-page"
import { getCachedConfig } from "@/lib/config-cache"
import type { Metadata } from "next"

// Revalidar cada 10 segundos
export const revalidate = 10

export async function generateMetadata(): Promise<Metadata> {
  const config = await getCachedConfig()
  const storeName = config.nombre_tienda ?? 'AgroShop SENA'
  
  const description = `PEPE PODEROSO selección de productos agropecuarios - ${storeName}`

  return {
    title: `${storeName} - Catálogo`,
    description,
    openGraph: {
      title: `${storeName} - Catálogo`,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: storeName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${storeName} - Catálogo`,
      description,
      images: ['/api/og'],
    },
  }
}

export default async function CatalogoPage() {
  const config = await getCachedConfig()
  
  return (
    <>
      <HomeClientPage 
        storeName={config.nombre_tienda ?? 'AgroShop SENA'}
        ciudad={config.ciudad_tienda}
        telefono={config.telefono_tienda}
        email={config.email_tienda}
        direccion={config.direccion_tienda}
      />
    </>
  )
}
