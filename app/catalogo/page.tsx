"use client"

import { useState } from "react"
import { CatalogHeader } from "@/components/catalog/catalog-header"
import { ProductCatalogCard } from "@/components/catalog/product-catalog-card"
import { CategoryFilter } from "@/components/catalog/category-filter"
import { InquiryModal } from "@/components/catalog/inquiry-modal"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { mockProducts, productiveUnits, type Product } from "@/lib/mock-data"
import { Search, Leaf, TrendingUp, Award, Clock } from "lucide-react"

export default function CatalogoPage() {
  const [selectedCategory, setSelectedCategory] = useState("Todas")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)

  const categories = Array.from(new Set(mockProducts.map((p) => p.category)))

  const filteredProducts = mockProducts.filter((product) => {
    const matchesCategory = selectedCategory === "Todas" || product.category === selectedCategory
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleInquire = (product: Product) => {
    setSelectedProduct(product)
    setIsInquiryOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <CatalogHeader />

      <section className="border-b border-border bg-gradient-to-r from-primary/10 via-chart-4/10 to-orange-accent/10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-accent/5 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm text-primary text-sm font-medium mb-2 animate-pulse-glow">
              <Leaf className="h-4 w-4" />
              Productos Frescos del Campo
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground text-balance">
              Catálogo de Productos <span className="gradient-text">Agropecuarios</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground text-pretty leading-relaxed">
              Descubre nuestra selección de productos frescos cultivados y producidos por los aprendices del SENA Centro
              Agropecuario
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6 max-w-2xl mx-auto">
              {[
                { icon: Award, value: "100+", label: "Productos", delay: "0s" },
                { icon: TrendingUp, value: "8", label: "Unidades", delay: "0.1s" },
                { icon: Clock, value: "24/7", label: "Disponible", delay: "0.2s" },
              ].map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-primary/20 hover:bg-white hover:scale-105 transition-all duration-300 animate-slide-up shadow-lg"
                    style={{ animationDelay: stat.delay }}
                  >
                    <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="space-y-8">
          <Card className="animate-scale-in shadow-lg">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base sm:text-lg focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <CategoryFilter
                categories={categories}
                activeCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-6 animate-slide-up">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {selectedCategory === "Todas" ? "Todos los Productos" : selectedCategory}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product, index) => (
                  <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <ProductCatalogCard product={product} onInquire={handleInquire} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="animate-scale-in">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No se encontraron productos que coincidan con tu búsqueda.</p>
                </CardContent>
              </Card>
            )}
          </div>

          <section className="animate-slide-up">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Nuestras Unidades Productivas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {productiveUnits.map((unit, index) => (
                <Card
                  key={unit.id}
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 animate-slide-up border-2 hover:border-primary/50"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-4 sm:p-6 text-center space-y-2">
                    <div className="text-4xl sm:text-5xl mb-2 group-hover:scale-110 transition-transform duration-300">
                      {unit.icon}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">{unit.name}</h3>
                    <p className="text-xs text-muted-foreground">{unit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-border bg-gradient-to-br from-card to-secondary/50 mt-16">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 text-center md:text-left">
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-foreground">AgroShop SENA</h3>
              </div>
              <p className="text-sm text-muted-foreground">Productos agropecuarios de calidad del Centro SENA</p>
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <h3 className="font-semibold text-foreground mb-3">Contacto</h3>
              <p className="text-sm text-muted-foreground">
                +57 300 123 4567
                <br />
                agroshop@sena.edu.co
              </p>
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <h3 className="font-semibold text-foreground mb-3">Horario</h3>
              <p className="text-sm text-muted-foreground">
                Lunes a Sábado
                <br />
                8:00 AM - 6:00 PM
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2025 AgroShop SENA Centro Agropecuario. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      <InquiryModal product={selectedProduct} open={isInquiryOpen} onClose={() => setIsInquiryOpen(false)} />
    </div>
  )
}
