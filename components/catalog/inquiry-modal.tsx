"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { type Product, productiveUnits } from "@/lib/mock-data"
import Image from "next/image"
import { MapPin, Package, DollarSign, Store, Phone, MessageCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface InquiryModalProps {
  product: Product | null
  open: boolean
  onClose: () => void
}

export function InquiryModal({ product, open, onClose }: InquiryModalProps) {
  if (!product) return null

  const unit = productiveUnits.find((u) => u.id === product.productiveUnit)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Información del Producto</DialogTitle>
          <DialogDescription>Consulta disponibilidad y visítanos en la tienda</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative h-64 rounded-xl overflow-hidden bg-muted group animate-scale-in">
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {product.stock > 0 && (
                <Badge className="absolute top-3 right-3 bg-gradient-to-r from-primary to-chart-4 text-white border-0 shadow-lg animate-pulse-glow">
                  Disponible
                </Badge>
              )}
            </div>

            <div className="space-y-4 animate-slide-up">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{product.name}</h3>
                <p className="text-muted-foreground">{product.category}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-chart-4/5 hover:from-primary/10 hover:to-chart-4/10 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio</p>
                    <p className="text-xl font-bold gradient-text">${product.price.toLocaleString("es-CO")}</p>
                    <p className="text-xs text-muted-foreground">por {product.unit}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-chart-4/5 to-chart-3/5 hover:from-chart-4/10 hover:to-chart-3/10 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-chart-4 to-chart-3 flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Disponibilidad</p>
                    <p className="font-semibold text-foreground">
                      {product.stock > 0 ? `${product.stock} ${product.unit} disponibles` : "Agotado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-accent/5 to-chart-2/5 hover:from-orange-accent/10 hover:to-chart-2/10 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-accent to-chart-2 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unidad Productiva</p>
                    <p className="font-semibold text-foreground">
                      {unit?.icon} {unit?.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-gradient-to-br from-primary/10 to-chart-4/10 border-primary/30 animate-slide-up shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground mb-2 text-lg">Visítanos en la Tienda</h4>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Actualmente no realizamos ventas en línea. Te invitamos a visitarnos en el Centro Agropecuario SENA
                    para adquirir este producto fresco.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/50 backdrop-blur-sm">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">Centro Agropecuario SENA - Local Principal</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/50 backdrop-blur-sm">
                      <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">+57 300 123 4567</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/50 backdrop-blur-sm">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">Lunes a Sábado: 8:00 AM - 6:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 hover:bg-secondary transition-all duration-300 bg-transparent"
            >
              Cerrar
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-primary to-chart-4 hover:from-primary/90 hover:to-chart-4/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contactar por WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
