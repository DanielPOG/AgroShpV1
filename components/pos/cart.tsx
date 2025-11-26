"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Minus, ShoppingCart, Package } from "lucide-react"
import Image from "next/image"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  unit: string
}

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
  onCheckout: () => void
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.19
  const total = subtotal + tax

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="hidden lg:block bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary/20 p-4 lg:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Pedido Actual</h3>
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "producto" : "productos"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Carrito vacío</p>
              <p className="text-xs text-muted-foreground">Escanea o selecciona productos para comenzar</p>
            </div>
          ) : (
            items.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden border-2 hover:border-primary/30 hover:shadow-lg transition-all duration-200"
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border-2 border-border shadow-sm">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="font-semibold text-sm text-foreground truncate leading-tight">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ${item.price.toLocaleString("es-CO")} / {item.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => onUpdateQuantity(item.id, Number.parseInt(e.target.value) || 1)}
                            className="h-7 w-12 text-center text-sm p-0 border-0 bg-transparent font-semibold"
                            min="1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 ml-auto text-destructive hover:bg-destructive/10"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col justify-center">
                      <p className="font-bold text-sm text-primary">
                        ${(item.price * item.quantity).toLocaleString("es-CO")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 border-t-2 border-border shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
            <div className="bg-gradient-to-b from-muted/30 to-muted/50 p-4 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${subtotal.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">IVA (19%)</span>
                  <span className="font-semibold">${tax.toLocaleString("es-CO")}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center py-2 px-3 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-bold text-xl text-primary">${total.toLocaleString("es-CO")}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-base h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                onClick={onCheckout}
              >
                Finalizar Venta
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
