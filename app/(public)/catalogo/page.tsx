import { HomeClientPage } from "@/components/catalog/home-client-page"
import { getCachedConfig } from "@/lib/config-cache"
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"

// Revalidar cada 10 segundos
export const revalidate = 10

export async function generateMetadata(): Promise<Metadata> {
  const config = await getCachedConfig()
  const storeName = config.nombre_tienda ?? 'AgroShop SENA'
  
  return {
    title: `${storeName} - Catálogo`,
    description: `Descubre nuestra selección de productos agropecuarios - ${storeName}`,
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
      <Analytics />
    </>
  )
}
