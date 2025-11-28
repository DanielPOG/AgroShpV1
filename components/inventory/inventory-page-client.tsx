"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Grid3x3, List, Package } from "lucide-react"
import { ProductCard } from "@/components/inventory/product-card"
import { ProductDetailModal } from "@/components/inventory/product-detail-modal"
import { CreateProductModal } from "@/components/inventory/create-product-modal"
import { InventoryFilters, type FilterState } from "@/components/inventory/inventory-filters"
import { mockProducts, type Product } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"

/**
 * Componente de Cliente para la página de Inventario
 * Contiene toda la lógica interactiva (estado, filtros, modals)
 * 
 * TODO: En Fase 2, conectar con API real y eliminar mockProducts
 */
export function InventoryPageClient() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(mockProducts)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...products]

    if (filters.category) {
      filtered = filtered.filter((p) => p.category === filters.category)
    }

    if (filters.unit) {
      filtered = filtered.filter((p) => p.unitId === filters.unit)
    }

    if (filters.status) {
      filtered = filtered.filter((p) => p.status === filters.status)
    }

    if (filters.type) {
      filtered = filtered.filter((p) => p.measureType === filters.type)
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search),
      )
    }

    setFilteredProducts(filtered)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailOpen(true)
  }

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
    setFilteredProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
    toast({
      title: "Producto actualizado",
      description: `${updatedProduct.name} ha sido actualizado correctamente`,
    })
  }

  const handleProductCreate = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev])
    setFilteredProducts((prev) => [newProduct, ...prev])
    toast({
      title: "Producto creado",
      description: `${newProduct.name} ha sido creado correctamente`,
    })
  }

  const handleProductDelete = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    setFilteredProducts((prev) => prev.filter((p) => p.id !== productId))
    toast({
      title: "Producto eliminado",
      description: "El producto ha sido eliminado correctamente",
      variant: "destructive",
    })
  }

  return (
    <>
      {/* Filters Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <InventoryFilters onFilterChange={handleFilterChange} />
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="flex-1 sm:flex-initial">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Products Grid/List */}
      <div
        className={
          viewMode === "grid"
            ? "grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "space-y-4"
        }
      >
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode={viewMode}
            onClick={() => handleProductClick(product)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron productos</h3>
          <p className="text-sm text-muted-foreground">Intenta ajustar los filtros o crear un nuevo producto</p>
        </div>
      )}

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedProduct(null)
        }}
        onUpdate={handleProductUpdate}
        onDelete={handleProductDelete}
      />

      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleProductCreate}
      />
    </>
  )
}

