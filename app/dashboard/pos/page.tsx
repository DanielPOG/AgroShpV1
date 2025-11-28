"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BarcodeScanner } from "@/components/pos/barcode-scanner"
import { ProductGrid } from "@/components/pos/product-grid"
import { Cart } from "@/components/pos/cart"
import { CheckoutModal, type PaymentData } from "@/components/pos/checkout-modal"
import { ManualEntryModal } from "@/components/pos/manual-entry-modal"
import { mockProducts, type Product } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { Search, Zap, X, Plus, ShoppingCart, ChevronUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  unit: string
}

export default function POSPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [availableProducts] = useState(mockProducts.filter((p) => p.stock > 0))

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    
    // Verificar que tenga permisos de POS
    if (!isLoading && isAuthenticated && !hasPermission('pos') && !hasPermission('all')) {
      router.push("/dashboard")
      return
    }
  }, [isAuthenticated, isLoading, hasPermission, router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault()
        document.getElementById("search")?.focus()
      }
      if (e.key === "Enter" && cartItems.length > 0 && !isCheckoutOpen) {
        e.preventDefault()
        setIsCheckoutOpen(true)
      }
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

  const handleBarcodeScan = (barcode: string) => {
    const product = mockProducts.find((p) => p.barcode === barcode)
    if (product) {
      addToCart(product)
      toast({
        title: "Producto Agregado",
        description: `${product.name} añadido al carrito`,
      })
    } else {
      toast({
        title: "Producto No Encontrado",
        description: `No se encontró el código de barras: ${barcode}`,
        variant: "destructive",
      })
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find((item) => item.id === product.id)
    if (existingItem) {
      setCartItems(cartItems.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCartItems([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
          unit: product.unit,
        },
      ])
    }
  }

  const handleManualEntry = (product: { name: string; price: number }) => {
    const manualProduct: CartItem = {
      id: `manual-${Date.now()}`,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: "/generic-product-display.png",
      unit: "unidad",
    }

    setCartItems([...cartItems, manualProduct])

    toast({
      title: "Producto Agregado",
      description: `${product.name} agregado manualmente al carrito`,
    })
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return
    setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const removeItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id))
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) return
    setIsCheckoutOpen(true)
    setIsCartOpen(false)
  }

  const handleCheckoutComplete = (paymentData: PaymentData) => {
    toast({
      title: "Venta Completada",
      description: `Venta registrada con método: ${paymentData.method}`,
    })
    setCartItems([])
    setIsCheckoutOpen(false)
  }

  const filteredProducts = availableProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando POS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userRole={user.role as string} userName={user.name || "Usuario"} />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-2 sm:p-4 lg:p-6 border-b border-border bg-card shrink-0">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Punto de Venta</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Terminal POS AgroShop</p>
              </div>
              <div className="flex gap-1 sm:gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setIsManualEntryOpen(true)}
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCartItems([])}
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <BarcodeScanner onScan={handleBarcodeScan} />

              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar... (F2)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 sm:pl-10 text-sm h-8 sm:h-10"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 min-h-0">
            {filteredProducts.length > 0 ? (
              <ProductGrid products={filteredProducts} onSelectProduct={addToCart} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs sm:text-sm text-muted-foreground">No se encontraron productos</p>
              </div>
            )}
          </div>

          <div className="p-2 sm:p-3 border-t border-border bg-card shrink-0 hidden sm:block">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">
                <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] sm:text-xs">Enter</kbd> Finalizar
              </span>
            </div>
          </div>
        </div>

        <div className="hidden lg:block w-96 border-l border-border bg-card shrink-0 overflow-hidden">
          <Cart
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
          />
        </div>
      </main>

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

      <CheckoutModal
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={cartTotal * 1.19}
        items={cartItems}
        onComplete={handleCheckoutComplete}
      />

      <ManualEntryModal
        open={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
        onAdd={handleManualEntry}
      />
    </div>
  )
}
