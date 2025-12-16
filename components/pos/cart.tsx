"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Minus, ShoppingCart, Package, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useConfig } from "@/hooks/use-config"

interface CartItem {
  id: number
  nombre: string
  precio: number
  cantidad: number
  imagen?: string
  unidad: string
  stock: number
  codigo: string
  es_perecedero: boolean
  categoria?: {
    nombre: string
    color: string
    icono?: string
  }
}

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (id: number, quantity: number) => void
  onRemoveItem: (id: number) => void
  onCheckout: () => void
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) {
  const { config } = useConfig()
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const tax = subtotal * (config.iva_porcentaje / 100)
  const total = subtotal + tax
  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0)

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header Premium con gradiente */}
            <div className="hidden lg:block bg-gradient-to-r from-primary via-primary to-emerald-600 border-b-2 border-primary/30 p-3 sm:p-4 lg:p-6 relative overflow-hidden shadow-lg">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
        
        <div className="flex items-center justify-between relative z-10 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 sm:p-2 shadow-md flex-shrink-0">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-black text-lg sm:text-xl drop-shadow-md">Carrito</h2>
              <p className="text-white/80 text-xs sm:text-sm font-semibold mt-0.5 truncate">
                {totalItems} artículo{totalItems !== 1 ? 's' : ''} · {items.length} producto{items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Total</p>
            <p className="text-white font-black text-xl sm:text-2xl drop-shadow-lg">${total.toLocaleString("es-CO")}</p>
          </div>
        </div>
      </div>

      {/* Lista de items con scroll mejorado */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto cart-items-container p-3 sm:p-4 space-y-3 min-h-0 overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 animate-in fade-in duration-500">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4 shadow-lg animate-bounce-subtle">
                <Package className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-base font-bold mb-2">Carrito vacío</p>
              <p className="text-sm text-muted-foreground max-w-[200px]">Escanea o selecciona productos para comenzar tu venta</p>
            </div>
          ) : (
            <>
              {/* Indicador de scroll si hay muchos items */}
              {items.length > 5 && (
                <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-transparent pb-2 mb-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
                    <span className="font-semibold">📋 Lista de productos</span>
                    <span className="bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                </div>
              )}
              
              {items.map((item, index) => (
                <Card
                  key={item.id}
                  className="overflow-hidden border-2 hover:border-primary/40 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm animate-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                <CardContent className="p-3 relative">
                  {/* Badge de posición si hay muchos items */}
                  {items.length > 10 && (
                    <div className="absolute top-1 right-1 bg-primary/90 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">
                      #{index + 1}
                    </div>
                  )}
                  
                  <div className="flex gap-2 sm:gap-3">
                    {/* Imagen mejorada con badge de categoría */}
                    <div className="relative h-16 w-16 sm:h-18 sm:w-18 rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex-shrink-0 border-2 border-border shadow-md hover:scale-105 transition-transform">
                      <Image 
                        src={item.imagen || "/placeholder.svg"} 
                        alt={item.nombre} 
                        fill 
                        className="object-cover" 
                      />
                      {item.categoria && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5">
                          <span className="text-white text-[8px] sm:text-[9px] font-bold line-clamp-1">{item.categoria.nombre}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight mb-1">{item.nombre}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-[11px] sm:text-xs font-semibold text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-full">
                            ${item.precio.toLocaleString("es-CO")}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground">/ {item.unidad}</span>
                        </div>
                        {/* Indicador de stock bajo */}
                        {item.stock <= 5 && (
                          <div className="mt-1 text-[10px] text-orange-600 font-semibold flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Stock: {item.stock}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 mt-2">
                        <div className="flex items-center gap-0.5 bg-gradient-to-r from-muted to-muted/80 rounded-lg p-0.5 shadow-sm border border-border">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/20 hover:text-primary hover:scale-110 transition-all"
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.cantidad - 1))}
                          >
                            <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => onUpdateQuantity(item.id, Number.parseInt(e.target.value) || 1)}
                            className="h-7 w-12 sm:h-8 sm:w-14 text-center text-xs sm:text-sm p-0 border-0 bg-transparent font-bold"
                            min="1"
                            max={item.stock}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/20 hover:text-primary hover:scale-110 transition-all disabled:opacity-30"
                            onClick={() => onUpdateQuantity(item.id, item.cantidad + 1)}
                            disabled={item.cantidad >= item.stock}
                          >
                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 sm:h-8 sm:w-8 ml-auto text-destructive hover:bg-destructive/10 hover:scale-110 transition-all"
                          onClick={() => onRemoveItem(item.id)}
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col justify-between py-1">
                      <div>
                        <p className="font-black text-sm sm:text-base text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg">
                          ${(item.precio * item.cantidad).toLocaleString("es-CO")}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 font-medium">Subtotal</p>
                      </div>
                      {item.cantidad > 1 && (
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground bg-muted/50 px-1 sm:px-1.5 py-0.5 rounded text-xs">
                          {item.cantidad}x ${item.precio.toLocaleString("es-CO")}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          }
            </>
          )}
        </div>

        {/* Resumen mejorado con glassmorphism */}
        {items.length > 0 && (
          <div className="shrink-0 border-t-2 border-primary/20 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.15)] relative">
            {/* Efecto de brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
            
            <div className="bg-gradient-to-b from-card via-primary/5 to-primary/10 backdrop-blur-sm p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center py-1 px-1.5 sm:px-2 rounded-lg hover:bg-white/50 transition-colors">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="font-bold">${subtotal.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between items-center py-1 px-1.5 sm:px-2 rounded-lg hover:bg-white/50 transition-colors">
                  <span className="text-muted-foreground font-medium">IVA ({config.iva_porcentaje}%)</span>
                  <span className="font-bold">${tax.toLocaleString("es-CO")}</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-1"></div>
                
                {/* Total destacado con gradiente premium */}
                <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-primary via-emerald-600 to-primary p-2.5 sm:p-3 shadow-lg">
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  
                  <div className="flex justify-between items-center relative z-10 gap-2">
                    <span className="text-white font-black text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                      <span className="text-base sm:text-lg">💰</span>
                      <span className="hidden xs:inline">Total a Pagar</span>
                      <span className="xs:hidden">Total</span>
                    </span>
                    <span className="text-white font-black text-xl sm:text-2xl drop-shadow-lg">
                      ${total.toLocaleString("es-CO")}
                    </span>
                  </div>
                  
                  {/* Indicador de items total */}
                  <div className="mt-1 sm:mt-1.5 text-white/80 text-[10px] sm:text-xs font-semibold flex items-center gap-1 relative z-10 flex-wrap">
                    <span>🛒</span>
                    <span>{totalItems} art.</span>
                    <span className="mx-0.5 sm:mx-1">·</span>
                    <span className="hidden xs:inline">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                    <span className="xs:hidden">{items.length} prod.</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={onCheckout}
                disabled={items.length === 0}
                className="w-full relative overflow-hidden h-11 sm:h-12 bg-gradient-to-r from-primary via-emerald-600 to-primary hover:from-primary/90 hover:via-emerald-600/90 hover:to-primary/90 text-white font-black text-sm sm:text-base shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                {/* Shimmer effect en hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity"></div>
                
                <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden xs:inline">Finalizar Venta</span>
                  <span className="xs:hidden">Finalizar</span>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
