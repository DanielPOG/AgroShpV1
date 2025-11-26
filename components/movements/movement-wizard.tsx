"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { productiveUnits, mockProducts, type Product } from "@/lib/mock-data"
import { ArrowRight, CheckCircle2, Package } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

interface MovementWizardProps {
  open: boolean
  onClose: () => void
  onComplete: (movement: MovementData) => void
}

interface MovementData {
  from: string
  to: string
  products: Array<{ productId: string; quantity: number }>
}

export function MovementWizard({ open, onClose, onComplete }: MovementWizardProps) {
  const [step, setStep] = useState(1)
  const [fromUnit, setFromUnit] = useState("")
  const [toUnit, setToUnit] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Array<{ product: Product; quantity: number }>>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")

  const availableProducts = mockProducts.filter((p) => p.productiveUnit === fromUnit && p.stock > 0)

  const handleAddProduct = () => {
    if (!selectedProductId || !quantity) return

    const product = mockProducts.find((p) => p.id === selectedProductId)
    if (!product) return

    const qty = Number.parseInt(quantity)
    if (qty <= 0 || qty > product.stock) return

    setSelectedProducts([...selectedProducts, { product, quantity: qty }])
    setSelectedProductId("")
    setQuantity("")
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product.id !== productId))
  }

  const handleComplete = () => {
    const movementData: MovementData = {
      from: fromUnit,
      to: toUnit,
      products: selectedProducts.map((p) => ({ productId: p.product.id, quantity: p.quantity })),
    }
    onComplete(movementData)
    handleClose()
  }

  const handleClose = () => {
    setStep(1)
    setFromUnit("")
    setToUnit("")
    setSelectedProducts([])
    setSelectedProductId("")
    setQuantity("")
    onClose()
  }

  const canProceedStep1 = fromUnit && toUnit && fromUnit !== toUnit
  const canProceedStep2 = selectedProducts.length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl lg:text-2xl">Nuevo Movimiento</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Transfiere productos entre unidades productivas
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <div
              className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              1
            </div>
            <span className="text-[10px] sm:text-sm font-medium hidden xs:inline">Origen/Destino</span>
          </div>
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          <div className="flex items-center gap-1 sm:gap-2">
            <div
              className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <span className="text-[10px] sm:text-sm font-medium hidden xs:inline">Productos</span>
          </div>
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          <div className="flex items-center gap-1 sm:gap-2">
            <div
              className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </div>
            <span className="text-[10px] sm:text-sm font-medium hidden xs:inline">Confirmación</span>
          </div>
        </div>

        <Separator />

        {/* Step 1: Select Units */}
        {step === 1 && (
          <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="from" className="text-xs sm:text-sm">
                Unidad de Origen
              </Label>
              <Select value={fromUnit} onValueChange={setFromUnit}>
                <SelectTrigger id="from" className="text-xs sm:text-sm">
                  <SelectValue placeholder="Selecciona origen" />
                </SelectTrigger>
                <SelectContent>
                  {productiveUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="text-xs sm:text-sm">
                      {unit.icon} {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromUnit && (
                <p className="text-[10px] sm:text-sm text-muted-foreground">
                  {productiveUnits.find((u) => u.id === fromUnit)?.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to" className="text-xs sm:text-sm">
                Unidad de Destino
              </Label>
              <Select value={toUnit} onValueChange={setToUnit}>
                <SelectTrigger id="to" className="text-xs sm:text-sm">
                  <SelectValue placeholder="Selecciona destino" />
                </SelectTrigger>
                <SelectContent>
                  {productiveUnits
                    .filter((u) => u.id !== fromUnit)
                    .map((unit) => (
                      <SelectItem key={unit.id} value={unit.id} className="text-xs sm:text-sm">
                        {unit.icon} {unit.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {toUnit && (
                <p className="text-[10px] sm:text-sm text-muted-foreground">
                  {productiveUnits.find((u) => u.id === toUnit)?.description}
                </p>
              )}
            </div>

            <Button onClick={() => setStep(2)} className="w-full text-xs sm:text-sm" disabled={!canProceedStep1}>
              Continuar
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Select Products */}
        {step === 2 && (
          <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
            <div className="bg-secondary/50 rounded-lg p-3 sm:p-4 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Movimiento</p>
                <p className="font-semibold text-xs sm:text-base">
                  {productiveUnits.find((u) => u.id === fromUnit)?.icon}{" "}
                  <span className="hidden xs:inline">{productiveUnits.find((u) => u.id === fromUnit)?.name}</span>
                  {" → "}
                  {productiveUnits.find((u) => u.id === toUnit)?.icon}{" "}
                  <span className="hidden xs:inline">{productiveUnits.find((u) => u.id === toUnit)?.name}</span>
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">
                Cambiar
              </Button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Label className="text-xs sm:text-sm">Agregar Productos</Label>
              <div className="flex flex-col xs:flex-row gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 text-xs sm:text-sm">
                    <SelectValue placeholder="Producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id} className="text-xs sm:text-sm">
                        {product.name} ({product.stock} {product.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Cantidad"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-20 xs:w-28 text-xs sm:text-sm"
                    min="1"
                    max={availableProducts.find((p) => p.id === selectedProductId)?.stock || 0}
                  />
                  <Button
                    onClick={handleAddProduct}
                    disabled={!selectedProductId || !quantity}
                    size="sm"
                    className="text-xs"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-xs sm:text-sm">Seleccionados ({selectedProducts.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedProducts.map((item) => (
                    <Card key={item.product.id}>
                      <CardContent className="p-2 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="relative h-10 w-10 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                            <Image
                              src={item.product.image || "/placeholder.svg"}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{item.product.name}</p>
                            <p className="text-[10px] sm:text-sm text-muted-foreground">
                              {item.quantity} {item.product.unit}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(item.product.id)}
                            className="text-xs shrink-0"
                          >
                            ✕
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 text-xs sm:text-sm">
                Atrás
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1 text-xs sm:text-sm" disabled={!canProceedStep2}>
                Continuar
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold">Confirmar Movimiento</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Revisa los detalles</p>
            </div>

            <Card>
              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Origen</p>
                    <p className="font-semibold text-xs sm:text-base truncate">
                      {productiveUnits.find((u) => u.id === fromUnit)?.icon}{" "}
                      <span className="hidden xs:inline">{productiveUnits.find((u) => u.id === fromUnit)?.name}</span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                  <div className="space-y-1 text-right flex-1 min-w-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Destino</p>
                    <p className="font-semibold text-xs sm:text-base truncate">
                      {productiveUnits.find((u) => u.id === toUnit)?.icon}{" "}
                      <span className="hidden xs:inline">{productiveUnits.find((u) => u.id === toUnit)?.name}</span>
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium">Productos a Mover</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedProducts.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between py-1.5 sm:py-2 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded overflow-hidden bg-muted shrink-0">
                            <Image
                              src={item.product.image || "/placeholder.svg"}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="text-xs sm:text-sm truncate">{item.product.name}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                          {item.quantity} {item.product.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 text-xs sm:text-sm">
                Atrás
              </Button>
              <Button onClick={handleComplete} className="flex-1 text-xs sm:text-sm">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
