"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useProducts } from "@/hooks/use-products"
import { useCartStore } from "@/store/cart-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BarcodeScanner } from "@/components/pos/barcode-scanner"
import { ProductGrid } from "@/components/pos/product-grid"
import { Cart } from "@/components/pos/cart"
import { CheckoutModal, type PaymentData } from "@/components/pos/checkout-modal"
import { QuickProductModal } from "@/components/pos/quick-product-modal"
import { CashSessionStatus, type CashSessionStatusRef } from "@/components/pos/cash-session-status"
import { useToast } from "@/hooks/use-toast"
import { Search, Zap, X, ShoppingCart, ChevronUp, Loader2, PackagePlus } from "lucide-react"
import { cn } from "@/lib/utils"

export default function POSPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading: authLoading, hasPermission } = useAuth()
  
  // ✨ NUEVO: Referencia para refrescar el estado de caja
  const cashSessionRef = useRef<CashSessionStatusRef>(null)
  
  // Store de Zustand para el carrito
  const { items: cartItems, addItem, updateQuantity, removeItem, clearCart, getItemCount } = useCartStore()
  
  // Estado local
  const [searchQuery, setSearchQuery] = useState("")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCashPanelExpanded, setIsCashPanelExpanded] = useState(false) // ✨ NUEVO: Estado del panel de caja
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false) // ✨ NUEVO: Estado del modal de producto rápido

  // Cargar productos con lotes disponibles
  // Un producto debe aparecer en POS solo si tiene al menos un lote con estado "disponible"
  const { products, isLoading: productsLoading, error, refetch: refetchProducts } = useProducts({
    limit: 100,
    page: 1,
    sortBy: null,
  })

  // Filtrar solo productos con lotes disponibles
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  
  useEffect(() => {
    const filterProductsWithAvailableLotes = async () => {
      if (!products || products.length === 0) {
        setAvailableProducts([])
        return
      }

      // Verificar cada producto si tiene lotes disponibles
      const productsWithLotes = await Promise.all(
        products
          .filter((p) => Number(p.stock_actual) > 0)
          .map(async (product) => {
            try {
              const response = await fetch(`/api/lotes?producto_id=${product.id}&estado=disponible&limit=1`)
              if (response.ok) {
                const data = await response.json()
                return data.data && data.data.length > 0 ? product : null
              }
            } catch (error) {
              console.error(`Error verificando lotes del producto ${product.id}:`, error)
            }
            return null
          })
      )

      setAvailableProducts(productsWithLotes.filter(Boolean))
    }

    filterProductsWithAvailableLotes()
  }, [products])

  // Verificar lotes vencidos al cargar POS
  useEffect(() => {
    const checkVencimientos = async () => {
      try {
        const response = await fetch('/api/lotes/check-vencimientos')
        if (response.ok) {
          const data = await response.json()
          if (data.vencidos > 0) {
            console.log(`🚫 ${data.vencidos} lotes vencidos actualizados`)
          }
        }
      } catch (error) {
        console.error('Error al verificar vencimientos:', error)
      }
    }

    if (isAuthenticated) {
      checkVencimientos()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    
    // Verificar que tenga permisos de POS
    if (!authLoading && isAuthenticated && !hasPermission('pos') && !hasPermission('all')) {
      router.push("/dashboard")
      return
    }
  }, [isAuthenticated, authLoading, hasPermission, router])

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus en búsqueda
      if (e.key === "F2") {
        e.preventDefault()
        document.getElementById("search")?.focus()
      }
      // F4: Abrir cajón de dinero
      if (e.key === "F4") {
        e.preventDefault()
        handleOpenDrawer()
      }
      // Enter: Abrir checkout si hay items
      if (e.key === "Enter" && cartItems.length > 0 && !isCheckoutOpen) {
        e.preventDefault()
        setIsCheckoutOpen(true)
      }
      // Escape: Cerrar modal o limpiar búsqueda
      if (e.key === "Escape") {
        e.preventDefault()
        if (isCheckoutOpen) {
          setIsCheckoutOpen(false)
        } else {
          setSearchQuery("")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cartItems.length, isCheckoutOpen])

  /**
   * Manejar escaneo de código de barras
   */
  const handleBarcodeScan = async (barcode: string) => {
    // Primero intentar buscar por código de producto
    let product = availableProducts.find((p) => p.codigo === barcode)
    
    // Si no se encuentra, buscar por código de lote
    if (!product) {
      try {
        const response = await fetch(`/api/lotes?codigo_lote=${barcode}&estado=disponible&limit=1`)
        if (response.ok) {
          const data = await response.json()
          if (data.data && data.data.length > 0) {
            const lote = data.data[0]
            // Buscar el producto asociado al lote
            product = availableProducts.find((p) => p.id === lote.producto_id)
            
            if (product) {
              handleAddToCart(product)
              toast({
                title: "Producto Agregado",
                description: `${product.nombre} del lote ${lote.codigo_lote} añadido al carrito`,
              })
              return
            }
          }
        }
      } catch (error) {
        console.error('Error buscando lote:', error)
      }
    } else {
      handleAddToCart(product)
      toast({
        title: "Producto Agregado",
        description: `${product.nombre} añadido al carrito`,
      })
      return
    }
    
    // Si no se encontró ni por código de producto ni por código de lote
    toast({
      title: "Producto No Encontrado",
      description: `No se encontró el código: ${barcode}`,
      variant: "destructive",
    })
  }

  /**
   * Agregar producto al carrito
   */
  const handleAddToCart = (product: any) => {
    // Validar stock disponible
    const currentItem = cartItems.find((item) => item.id === product.id)
    const currentQuantity = currentItem?.cantidad || 0
    const stockDisponible = Number(product.stock_actual)

    if (currentQuantity >= stockDisponible) {
      toast({
        title: "Stock Insuficiente",
        description: `Solo hay ${stockDisponible} unidades disponibles de ${product.nombre}`,
        variant: "destructive",
      })
      return
    }

    // Agregar al store de Zustand
    addItem({
      id: product.id,
      nombre: product.nombre,
      codigo: product.codigo,
      precio: Number(product.precio_unitario),
      stock: stockDisponible,
      imagen: product.imagen_url,
      unidad: product.unidad,
      es_perecedero: product.es_perecedero,
      categoria: product.categoria ? {
        nombre: product.categoria.nombre,
        color: product.categoria.color,
        icono: product.categoria.icono || undefined,
      } : undefined,
    })
  }

  /**
   * Abrir modal de checkout
   */
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Carrito Vacío",
        description: "Agrega productos antes de proceder al pago",
        variant: "destructive",
      })
      return
    }
    setIsCheckoutOpen(true)
    setIsCartOpen(false)
  }

  /**
   * ✨ NUEVO: Callback después de venta exitosa para refrescar datos
   */
  const handleSaleComplete = async () => {
    console.log('🔄 Refrescando datos después de venta...')
    
    // 1. Refrescar el estado de caja
    if (cashSessionRef.current) {
      await cashSessionRef.current.refresh()
      console.log('✅ Estado de caja actualizado')
    }
    
    // 2. Refrescar productos para actualizar stock
    if (refetchProducts) {
      await refetchProducts(true) // true = silent refresh (sin loading)
      console.log('✅ Stock de productos actualizado')
    }
    
    // Mostrar notificación
    toast({
      title: "🎉 Venta Completada",
      description: "La venta ha sido registrada exitosamente",
    })
  }

  /**
   * ✨ NUEVO: Abrir cajón de dinero manualmente (F4)
   */
  const handleOpenDrawer = async () => {
    try {
      const response = await fetch('/api/caja/abrir-cajon', {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "💰 Cajón Abierto",
          description: "El cajón de dinero se abrió correctamente",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error al Abrir Cajón",
          description: error.error || "No se pudo abrir el cajón",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error al abrir cajón:', error)
      toast({
        title: "Error",
        description: "No se pudo comunicar con la impresora",
        variant: "destructive",
      })
    }
  }

  /**
   * Limpiar todo el carrito
   */
  const handleClearCart = () => {
    if (cartItems.length === 0) return
    
    clearCart()
    toast({
      title: "Carrito Limpiado",
      description: "Todos los productos han sido eliminados",
    })
  }

  /**
   * Agregar producto ficticio desde modal rápido
   */
  const handleAddQuickProduct = (product: {
    id: number
    nombre: string
    precio: number
    cantidad: number
    unidad: string
    stock: number
  }) => {
    addItem(product)
    setIsQuickProductOpen(false)
  }

  /**
   * Filtrar productos por búsqueda
   */
  const filteredProducts = availableProducts.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoria?.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Estados de carga
  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando POS...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-destructive font-semibold">Error al cargar productos</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const cartItemCount = getItemCount()

  return (
    <>
      {/* Layout Principal */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Fijo - Título */}
        <div className="p-2 sm:p-4 lg:p-6 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                Punto de Venta
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Terminal POS AgroShop - {user.name}
              </p>
            </div>
            <div className="flex gap-1 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsQuickProductOpen(true)}
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/10 hover:bg-primary/20 border-primary/30"
                title="Agregar producto rápido"
              >
                <PackagePlus className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenDrawer}
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30"
                title="Abrir cajón (F4)"
              >
                <span className="text-xs sm:text-sm font-bold text-amber-600">💰</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleClearCart}
                size="icon"
                disabled={cartItems.length === 0}
                className="h-8 w-8 sm:h-10 sm:w-10"
                title="Limpiar carrito"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Panel de Caja - Acordeón Vertical */}
        <div className="shrink-0">
          <CashSessionStatus 
            ref={cashSessionRef}
            isExpanded={isCashPanelExpanded}
            onToggleExpand={() => setIsCashPanelExpanded(!isCashPanelExpanded)}
          />
        </div>

        {/* Contenedor de Productos y Carrito */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Panel Izquierdo - Productos */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Barra de búsqueda y scanner */}
            <div className="p-2 sm:p-4 lg:p-6 border-b border-border bg-card shrink-0">
              <div className="space-y-2 sm:space-y-3">
                <BarcodeScanner onScan={handleBarcodeScan} />

                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar productos... (F2)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 sm:pl-10 text-sm h-8 sm:h-10"
                  />
                  {searchQuery && (
                    <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                      {filteredProducts.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Grid de productos */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 min-h-0">
              {productsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando productos...</p>
                  </div>
                </div>
              ) : filteredProducts.length > 0 ? (
                <ProductGrid products={filteredProducts} onSelectProduct={handleAddToCart} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">No se encontraron productos</p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? "Intenta con otra búsqueda" : "No hay productos disponibles con stock"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard shortcuts info */}
            <div className="p-2 sm:p-3 border-t border-border bg-card shrink-0 hidden sm:block">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">
                  <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] sm:text-xs">Enter</kbd> Finalizar
                  {' · '}
                  <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] sm:text-xs">F2</kbd> Buscar
                  {' · '}
                  <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] sm:text-xs">F4</kbd> Abrir Cajón
                  {' · '}
                  <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] sm:text-xs">Esc</kbd> Cancelar
                </span>
              </div>
            </div>
          </div>

          {/* Panel Derecho - Carrito (Desktop) */}
          <div className="hidden lg:flex w-96 border-l border-border bg-card shrink-0 overflow-hidden">
            <Cart
              items={cartItems}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cartItems.length > 0 && (
        <Button
          size="lg"
          className="fixed bottom-4 right-4 lg:hidden h-14 w-14 rounded-full shadow-xl z-30"
          onClick={() => setIsCartOpen(true)}
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {cartItemCount}
            </Badge>
          </div>
        </Button>
      )}

      {/* Mobile Cart Drawer */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 bg-gradient-to-b from-card to-card/95 border-t-4 border-primary shadow-[0_-10px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 lg:hidden rounded-t-3xl overflow-hidden",
          isCartOpen ? "translate-y-0" : "translate-y-full",
        )}
        style={{ height: "85vh", maxHeight: "85vh" }}
      >
        <div className="flex flex-col h-full max-h-full">
          <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b-2 border-primary/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Carrito de Compras</h2>
                <p className="text-xs text-muted-foreground">
                  {cartItemCount} {cartItemCount === 1 ? "producto" : "productos"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCartOpen(false)}
              className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <Cart
              items={cartItems}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {/* Backdrop for mobile cart */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        clearCart={clearCart}
        onSaleComplete={handleSaleComplete}
      />

      {/* Quick Product Modal */}
      <QuickProductModal
        open={isQuickProductOpen}
        onClose={() => setIsQuickProductOpen(false)}
        onAddProduct={handleAddQuickProduct}
      />
    </>
  )
}
