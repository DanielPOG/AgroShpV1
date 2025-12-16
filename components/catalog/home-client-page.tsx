"use client"

import { useState, useEffect } from "react"
import { CatalogHeader } from "@/components/catalog/catalog-header"
import { ProductCatalogCard } from "@/components/catalog/product-catalog-card"
import { CategoryFilter } from "@/components/catalog/category-filter"
import { InquiryModal } from "@/components/catalog/inquiry-modal"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Leaf, TrendingUp, Award, Clock, Loader2 } from "lucide-react"

interface ProductoCatalogo {
  id: string
  nombre: string
  descripcion: string
  codigo: string
  categoria: string
  categoriaId: number | null
  categoriaIcono: string | null
  categoriaColor: string | null
  unidadProductiva: string
  unidadProductivaId: number | null
  unidadProductivaDescripcion: string | null
  unidadProductivaTipo: string | null
  tipoMedida: string
  unidad: string
  precio: number
  precioMayorista: number | null
  stock: number
  stockMinimo: number
  imagen: string
  esPerecedero: boolean
  diasVencimiento: number | null
  estado: "disponible" | "bajo-stock" | "agotado" | "proximo-vencer"
  loteProximo: {
    id: number
    numeroLote: string
    fechaVencimiento: string | null
    cantidadDisponible: number
  } | null
}

interface UnidadProductiva {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  tipo: string | null
  ubicacion: string | null
  icono: string
  totalProductos: number
}

interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  icono: string | null
  color: string | null
  totalProductos: number
}

interface Stats {
  totalProductos: number
  totalCategorias: number
  totalUnidades: number
}

interface HomeClientPageProps {
  storeName: string
  ciudad?: string
  telefono?: string
  email?: string
  direccion?: string
}

export function HomeClientPage({ storeName, ciudad, telefono, email, direccion }: HomeClientPageProps) {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [unidades, setUnidades] = useState<UnidadProductiva[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [stats, setStats] = useState<Stats>({ totalProductos: 0, totalCategorias: 0, totalUnidades: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("Todas")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<ProductoCatalogo | null>(null)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)

  // Cargar datos del catálogo
  useEffect(() => {
    async function loadCatalogData() {
      try {
        setLoading(true)

        const [productosRes, unidadesRes, categoriasRes, statsRes] = await Promise.all([
          fetch("/api/catalogo/productos"),
          fetch("/api/catalogo/unidades"),
          fetch("/api/catalogo/categorias"),
          fetch("/api/catalogo/stats"),
        ])

        const [productosData, unidadesData, categoriasData, statsData] = await Promise.all([
          productosRes.json(),
          unidadesRes.json(),
          categoriasRes.json(),
          statsRes.json(),
        ])

        if (productosData.success) {
          setProductos(productosData.data)
        }

        if (unidadesData.success) {
          setUnidades(unidadesData.data)
        }

        if (categoriasData.success) {
          setCategorias(categoriasData.data)
        }

        if (statsData.success) {
          setStats(statsData.data)
        }
      } catch (error) {
        console.error("Error al cargar datos del catálogo:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCatalogData()
  }, [])

  // Obtener nombres únicos de categorías
  const categoryNames = ["Todas", ...categorias.map((c) => c.nombre)]

  // Filtrar productos
  const filteredProducts = productos.filter((product) => {
    const matchesCategory = selectedCategory === "Todas" || product.categoria === selectedCategory
    const matchesSearch =
      product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleInquire = (product: ProductoCatalogo) => {
    setSelectedProduct(product)
    setIsInquiryOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <CatalogHeader storeName={storeName} ciudad={ciudad} telefono={telefono} />

      <section className="border-b border-border bg-gradient-to-r from-primary/10 via-chart-4/10 to-orange-accent/10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-accent/5 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/20 backdrop-blur-sm text-primary text-xs sm:text-sm font-medium mb-2 animate-pulse-glow">
              <Leaf className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Productos Frescos del Campo</span>
              <span className="xs:hidden">Frescos del Campo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance px-4">
              Catálogo de Productos <span className="gradient-text">Agropecuarios</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-pretty leading-relaxed px-4">
              Descubre nuestra selección de productos frescos cultivados en {storeName}
            </p>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 sm:pt-6 max-w-2xl mx-auto px-3">
              {loading ? (
                <div className="col-span-3 flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {[
                    { icon: Award, value: stats.totalProductos.toString(), label: "Productos", delay: "0s" },
                    { icon: TrendingUp, value: stats.totalUnidades.toString(), label: "Unidades", delay: "0.1s" },
                    { icon: Clock, value: "24/7", label: "Disponible", delay: "0.2s" },
                  ].map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <div
                        key={index}
                        className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-white/80 backdrop-blur-sm border border-primary/20 hover:bg-white hover:scale-105 transition-all duration-300 animate-slide-up shadow-lg"
                        style={{ animationDelay: stat.delay }}
                      >
                        <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-primary mx-auto mb-1 sm:mb-2" />
                        <div className="text-lg sm:text-2xl font-bold text-primary">{stat.value}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        <div className="space-y-6 sm:space-y-8">
          <Card className="animate-scale-in shadow-lg">
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-primary transition-all"
                  disabled={loading}
                />
              </div>
              <CategoryFilter
                categories={categoryNames}
                activeCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div>
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-4 sm:mb-6 animate-slide-up px-1">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                {selectedCategory === "Todas" ? "Todos los Productos" : selectedCategory}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Cargando productos...</p>
                </div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {filteredProducts.map((product, index) => (
                  <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <ProductCatalogCard product={product} onInquire={handleInquire} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="animate-scale-in">
                <CardContent className="p-8 sm:p-12 text-center">
                  <p className="text-sm sm:text-base text-muted-foreground">
                    No se encontraron productos que coincidan con tu búsqueda.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unidades Productivas */}
          {!loading && unidades.length > 0 && (
            <section className="animate-slide-up">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-4 sm:mb-6 px-1">
                Nuestras Unidades Productivas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                {unidades.map((unit, index) => (
                  <Card
                    key={unit.id}
                    className="hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 animate-slide-up border-2 hover:border-primary/50"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardContent className="p-3 sm:p-4 md:p-6 text-center space-y-1 sm:space-y-2">
                      <div className="text-3xl sm:text-4xl md:text-5xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                        {unit.icono}
                      </div>
                      <h3 className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{unit.nombre}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{unit.descripcion}</p>
                      <p className="text-[10px] text-primary font-medium">{unit.totalProductos} productos</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className="border-t border-border bg-gradient-to-br from-card to-secondary/50 mt-12 sm:mt-16">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 text-center md:text-left">
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2 sm:mb-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                  <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">{storeName}</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Productos agropecuarios de calidad
              </p>
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <h3 className="font-semibold text-sm sm:text-base text-foreground mb-2 sm:mb-3">Contacto</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {telefono || '+57 300 123 4567'}
                <br />
                {email || 'agroshop@sena.edu.co'}
              </p>
              {direccion && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  {direccion}
                </p>
              )}
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <h3 className="font-semibold text-sm sm:text-base text-foreground mb-2 sm:mb-3">Horario</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Lunes a Sábado
                <br />
                8:00 AM - 6:00 PM
              </p>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border text-center text-xs sm:text-sm text-muted-foreground">
            © 2025 {storeName}. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      <InquiryModal 
        product={selectedProduct} 
        open={isInquiryOpen} 
        onClose={() => setIsInquiryOpen(false)}
        storeName={storeName}
        telefono={telefono}
        email={email}
        direccion={direccion}
      />
    </div>
  )
}
