"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Plus, Grid3x3, List } from "lucide-react"
import { ProductCard } from "@/components/inventory/product-card"
import { ProductDetailModal } from "@/components/inventory/product-detail-modal"
import { CreateProductModal } from "@/components/inventory/create-product-modal"
import { InventoryFilters, type FilterState } from "@/components/inventory/inventory-filters"
import { mockProducts, type Product } from "@/lib/mock-data"
import type { User } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function InventarioPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(mockProducts)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    const storedUser = localStorage.getItem("agroshop_user")
    if (!storedUser) {
      router.push("/")
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("agroshop_user")
    router.push("/")
  }

  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...products]

    if (filters.category !== "Todas") {
      filtered = filtered.filter((p) => p.category === filters.category)
    }

    if (filters.productiveUnit !== "Todas") {
      filtered = filtered.filter((p) => p.productiveUnit === filters.productiveUnit)
    }

    if (filters.type !== "Todos") {
      const typeMap: Record<string, string> = {
        Líquido: "liquido",
        Sólido: "solido",
        Lote: "lote",
      }
      filtered = filtered.filter((p) => p.type === typeMap[filters.type])
    }

    if (filters.status !== "Todos") {
      const statusMap: Record<string, string> = {
        Disponible: "disponible",
        "Bajo Stock": "bajo-stock",
        Agotado: "agotado",
        "Próximo a Vencer": "proximo-vencer",
      }
      filtered = filtered.filter((p) => p.status === statusMap[filters.status])
    }

    setFilteredProducts(filtered)
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    toast({
      title: "Editar Producto",
      description: `Editando ${product.name}...`,
    })
  }

  const handleDeleteProduct = (productId: string) => {
    toast({
      title: "Producto Eliminado",
      description: "El producto ha sido eliminado del inventario.",
      variant: "destructive",
    })
  }

  const handleProductCreated = () => {
    toast({
      title: "¡Éxito!",
      description: "El producto ha sido creado y agregado al inventario.",
    })
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} userName={user.name} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <DashboardHeader title="Gestión de Inventario" description="Control completo de productos y stock" />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-accent" : ""}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-accent" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-gradient-to-r from-primary to-chart-4 flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <InventoryFilters onFilterChange={handleFilterChange} />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredProducts.length} de {products.length} productos
              </p>
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                  : "space-y-4"
              }
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={handleViewProduct}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No se encontraron productos con los filtros seleccionados.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <ProductDetailModal product={selectedProduct} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
      <CreateProductModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={handleProductCreated} />
    </div>
  )
}
