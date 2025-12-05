"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Grid3x3, List, Package, Loader2, AlertCircle } from "lucide-react"
import { ProductCard } from "@/components/inventory/product-card"
import { ProductDetailModal } from "@/components/inventory/product-detail-modal"
import { CreateProductModal } from "@/components/inventory/create-product-modal"
import { UpdateProductModal } from "@/components/inventory/update-product-modal"
import { ProductHistoryModal } from "@/components/inventory/product-history-modal"
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal"
import { DeactivateProductModal } from "@/components/inventory/deactivate-product-modal"
import { PermanentDeleteProductDialog } from "@/components/inventory/permanent-delete-product-dialog"
import { CreateLoteModal } from "@/components/inventory/create-lote-modal"
import { CreateProductWithLoteModal } from "@/components/inventory/create-product-with-lote-modal"
import { InventoryFilters, type FilterState } from "@/components/inventory/inventory-filters"
import { useToast } from "@/hooks/use-toast"
import { useProducts, useProductMutations } from "@/hooks/use-products"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ProductFilters } from "@/lib/validations/product.schema"

/**
 * Componente de Cliente para la página de Inventario
 * Conectado a API real con estados de carga y error
 */
export function InventoryPageClient() {
  const { toast } = useToast()
  const [showInactive, setShowInactive] = useState(false)
  const [unidadesProductivas, setUnidadesProductivas] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filters, setFilters] = useState<ProductFilters>({ 
    page: 1, 
    limit: 20, 
    sortBy: null,
    activo: true  // Solo mostrar productos activos por defecto
  })
  const { products, pagination, isLoading, error, refetch, updateLocalProduct, addLocalProduct, removeLocalProduct } = useProducts(filters)
  const { deleteProduct, isDeleting } = useProductMutations()
  
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [productToDelete, setProductToDelete] = useState<{ id: number; nombre: string } | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false)
  const [productToPermanentDelete, setProductToPermanentDelete] = useState<{ id: number; nombre: string } | null>(null)
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false)
  const [isCreateLoteOpen, setIsCreateLoteOpen] = useState(false)
  const [isCreateWithLoteOpen, setIsCreateWithLoteOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Cargar unidades productivas y categorías
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [unidadesRes, categoriasRes] = await Promise.all([
          fetch('/api/unidades?limit=100'),
          fetch('/api/categorias?limit=100')
        ])
        
        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json()
          // Las APIs devuelven { data: [...], pagination: {...} }
          setUnidadesProductivas(unidadesData.data || unidadesData)
        }
        
        if (categoriasRes.ok) {
          const categoriasData = await categoriasRes.json()
          // Las APIs devuelven { data: [...], pagination: {...} }
          setCategories(categoriasData.data || categoriasData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  // Efecto para cambiar filtro de activos/inactivos
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      activo: !showInactive,  // Si showInactive es true, activo es false
      page: 1  // Resetear página al cambiar
    }))
  }, [showInactive])

  const handleFilterChange = (newFilters: FilterState) => {
    const apiFilters: ProductFilters = {
      page: 1,
      limit: 20,
      sortBy: null,
      activo: !showInactive,  // Respetar el estado de showInactive
    }

    if (newFilters.search) {
      apiFilters.search = newFilters.search
    }

    if (newFilters.categoria_id && newFilters.categoria_id !== 'all') {
      apiFilters.categoria_id = Number(newFilters.categoria_id)
    }

    if (newFilters.unidad_productiva_id && newFilters.unidad_productiva_id !== 'all') {
      apiFilters.unidad_productiva_id = Number(newFilters.unidad_productiva_id)
    }

    if (newFilters.tipo_medida && newFilters.tipo_medida !== 'all') {
      apiFilters.tipo_medida = newFilters.tipo_medida as 'unidad' | 'peso' | 'volumen' | 'lote'
    }

    if (newFilters.stock_status && newFilters.stock_status !== 'all') {
      apiFilters.stock_status = newFilters.stock_status as 'bajo' | 'disponible' | 'agotado'
    }

    setFilters(apiFilters)
  }

  const handleProductClick = (productId: number) => {
    setSelectedProductId(productId)
    setIsDetailOpen(true)
  }

  const handleProductEdit = (productId: number) => {
    setSelectedProductId(productId)
    setIsEditOpen(true)
  }

  const handleProductDelete = (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setProductToDelete({ id: productId, nombre: product.nombre })
      setIsDeactivateModalOpen(true)
    }
  }

  const handleDeactivateSuccess = () => {
    if (productToDelete) {
      // Actualización optimista: remover del estado local inmediatamente
      removeLocalProduct(productToDelete.id)
    }
    
    setIsDeactivateModalOpen(false)
    setProductToDelete(null)
    
    // Refetch silencioso para actualizar la lista
    setTimeout(() => refetch(true), 200)
  }

  const handleReactivate = async (productId: number, productName: string) => {
    try {
      const response = await fetch(`/api/productos/${productId}/reactivar`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al reactivar producto')
      }

      toast({
        title: "Producto reactivado",
        description: `${productName} ha sido reactivado exitosamente.`,
      })

      // Refetch silencioso para actualizar la lista
      refetch(true)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo reactivar el producto",
        variant: "destructive",
      })
    }
  }

  const handlePermanentDelete = async () => {
    if (!productToPermanentDelete) return

    setIsPermanentDeleting(true)
    try {
      const response = await fetch(`/api/productos/${productToPermanentDelete.id}/eliminar-permanente`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar producto')
      }

      const result = await response.json()

      toast({
        title: "Producto eliminado permanentemente",
        description: result.message,
        variant: "destructive",
      })

      // Actualización optimista: remover del estado local
      removeLocalProduct(productToPermanentDelete.id)
      
      setIsPermanentDeleteDialogOpen(false)
      setProductToPermanentDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el producto",
        variant: "destructive",
      })
    } finally {
      setIsPermanentDeleting(false)
    }
  }

  const handleProductHistory = (productId: number) => {
    setSelectedProductId(productId)
    setIsHistoryOpen(true)
  }

  const handleProductAdjustStock = (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setSelectedProductId(productId)
      setSelectedProduct(product)
      setIsAdjustStockOpen(true)
    }
  }

  const handleProductCreated = () => {
    toast({
      title: "Producto creado",
      description: "El producto ha sido creado correctamente",
    })
    // Refetch silencioso sin mostrar loading
    setTimeout(() => refetch(true), 200)
  }

  const handleProductUpdated = () => {
    toast({
      title: "Producto actualizado",
      description: "El producto ha sido actualizado correctamente",
    })
    // Refetch silencioso sin mostrar loading
    setTimeout(() => refetch(true), 200)
  }

  const handleProductDeleted = () => {
    if (selectedProductId) {
      // Actualización optimista: remover del estado local inmediatamente
      removeLocalProduct(selectedProductId)
    }
    
    toast({
      title: "Producto eliminado",
      description: "El producto ha sido eliminado correctamente",
      variant: "destructive",
    })
    setIsDetailOpen(false)
    setSelectedProductId(null)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <>
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Skeleton className="h-10 w-full sm:w-[300px]" />
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error al cargar productos</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {/* Filters Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <InventoryFilters onFilterChange={handleFilterChange} />
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          {/* Toggle Ver Inactivos */}
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className="h-10"
          >
            {showInactive ? "Ver Activos" : "Ver Inactivos"}
          </Button>
          
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
          <Button 
            onClick={() => setIsCreateWithLoteOpen(true)} 
            className="flex-1 sm:flex-initial"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto con Lote
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
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode={viewMode}
            onClick={() => handleProductClick(product.id)}
            onEdit={!showInactive ? () => handleProductEdit(product.id) : undefined}
            onDelete={!showInactive ? () => handleProductDelete(product.id) : undefined}
            onHistory={!showInactive ? () => handleProductHistory(product.id) : undefined}
            onAdjustStock={!showInactive ? () => handleProductAdjustStock(product.id) : undefined}
            onReactivate={showInactive ? () => handleReactivate(product.id, product.nombre) : undefined}
            onPermanentDelete={showInactive ? () => {
              setProductToPermanentDelete({ id: product.id, nombre: product.nombre })
              setIsPermanentDeleteDialogOpen(true)
            } : undefined}
            showInactive={showInactive}
          />
        ))}
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron productos</h3>
          <p className="text-sm text-muted-foreground">Intenta ajustar los filtros o crear un nuevo producto</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Modals */}
      {isDetailOpen && selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedProductId(null)
          }}
          onUpdate={handleProductUpdated}
          onDelete={handleProductDeleted}
          onAdjustStock={() => {
            const product = products.find(p => p.id === selectedProductId)
            if (product) {
              setSelectedProduct(product)
              setIsDetailOpen(false)
              setIsAdjustStockOpen(true)
            }
          }}
          onCreateLote={() => {
            setIsDetailOpen(false)
            setIsCreateLoteOpen(true)
          }}
        />
      )}

      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleProductCreated}
      />

      {isEditOpen && selectedProductId && (
        <UpdateProductModal
          productId={selectedProductId}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false)
            setSelectedProductId(null)
          }}
          onUpdate={handleProductUpdated}
        />
      )}

      {isHistoryOpen && selectedProductId && (
        <ProductHistoryModal
          productId={selectedProductId}
          isOpen={isHistoryOpen}
          onClose={() => {
            setIsHistoryOpen(false)
            setSelectedProductId(null)
          }}
        />
      )}

      {isAdjustStockOpen && selectedProductId && selectedProduct && (
        <AdjustStockModal
          productId={selectedProductId}
          productName={selectedProduct.nombre}
          currentStock={selectedProduct.stock_actual}
          unit={selectedProduct.unidad}
          tipoMedida={selectedProduct.tipo_medida}
          isOpen={isAdjustStockOpen}
          onClose={() => {
            setIsAdjustStockOpen(false)
            setSelectedProductId(null)
            setSelectedProduct(null)
          }}
          onSuccess={() => {
            // Refetch silencioso sin mostrar loading
            setTimeout(() => refetch(true), 200)
          }}
        />
      )}

      {productToDelete && (
        <DeactivateProductModal
          productId={productToDelete.id}
          productName={productToDelete.nombre}
          isOpen={isDeactivateModalOpen}
          onClose={() => {
            setIsDeactivateModalOpen(false)
            setProductToDelete(null)
          }}
          onSuccess={handleDeactivateSuccess}
        />
      )}

      {productToPermanentDelete && (
        <PermanentDeleteProductDialog
          isOpen={isPermanentDeleteDialogOpen}
          isDeleting={isPermanentDeleting}
          productName={productToPermanentDelete.nombre}
          onClose={() => {
            setIsPermanentDeleteDialogOpen(false)
            setProductToPermanentDelete(null)
          }}
          onConfirm={handlePermanentDelete}
        />
      )}

      {isCreateLoteOpen && (
        <CreateLoteModal
          isOpen={isCreateLoteOpen}
          onClose={() => {
            setIsCreateLoteOpen(false)
            setSelectedProductId(null)
          }}
          onSuccess={() => {
            toast({
              title: "Lote creado",
              description: "El lote ha sido creado exitosamente",
            })
            setIsCreateLoteOpen(false)
            setSelectedProductId(null)
            // Refetch silencioso
            setTimeout(() => refetch(true), 200)
          }}
          productos={products}
          unidades={unidadesProductivas}
          preselectedProductId={selectedProductId || undefined}
        />
      )}

      {isCreateWithLoteOpen && (
        <CreateProductWithLoteModal
          isOpen={isCreateWithLoteOpen}
          onClose={() => setIsCreateWithLoteOpen(false)}
          onSuccess={() => {
            setIsCreateWithLoteOpen(false)
            // Refetch silencioso
            setTimeout(() => refetch(true), 200)
          }}
          categorias={categories}
          unidades={unidadesProductivas}
        />
      )}
    </>
  )
}

