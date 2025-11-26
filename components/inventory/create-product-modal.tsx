"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CreateProductModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const generateProductCode = (category: string, unit: string): string => {
  const categoryCode = category.substring(0, 3).toUpperCase()
  const unitCode = unit.substring(0, 2).toUpperCase()
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `${categoryCode}-${unitCode}-${randomNum}`
}

export function CreateProductModal({ open, onClose, onSuccess }: CreateProductModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [productCode, setProductCode] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    productiveUnit: "",
    type: "",
    unit: "",
    price: "",
    stock: "",
    minStock: "",
    barcode: "",
    expiryDate: "",
  })

  const handleCategoryChange = (category: string) => {
    setFormData({ ...formData, category })
    if (category && formData.productiveUnit) {
      const code = generateProductCode(category, formData.productiveUnit)
      setProductCode(code)
    }
  }

  const handleUnitChange = (productiveUnit: string) => {
    setFormData({ ...formData, productiveUnit })
    if (formData.category && productiveUnit) {
      const code = generateProductCode(formData.category, productiveUnit)
      setProductCode(code)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    toast({
      title: "Producto Creado",
      description: `${formData.name} ha sido agregado al inventario con código ${productCode}`,
    })

    setIsLoading(false)
    onSuccess()
    onClose()

    // Reset form
    setFormData({
      name: "",
      description: "",
      category: "",
      productiveUnit: "",
      type: "",
      unit: "",
      price: "",
      stock: "",
      minStock: "",
      barcode: "",
      expiryDate: "",
    })
    setProductCode("")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Crear Nuevo Producto</DialogTitle>
          <DialogDescription>
            Completa la información del producto. El código se genera automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {productCode && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-chart-4/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Código del Producto</p>
                  <p className="text-2xl font-bold gradient-text mt-1">{productCode}</p>
                </div>
                <Badge className="bg-gradient-to-r from-primary to-chart-4 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Auto-generado
                </Badge>
              </div>
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">1. Información Básica</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Yogurt deslactosado, Tomate chonto"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descripción Corta</Label>
                <Textarea
                  id="description"
                  placeholder="Ej: Producto fresco producido por la unidad Bovinos"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría del Producto *</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lácteos">Lácteos</SelectItem>
                    <SelectItem value="Frutas">Frutas</SelectItem>
                    <SelectItem value="Vegetales">Vegetales</SelectItem>
                    <SelectItem value="Cárnicos">Cárnicos</SelectItem>
                    <SelectItem value="Insumos">Insumos</SelectItem>
                    <SelectItem value="Procesados">Procesados</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productiveUnit">Unidad Productiva de Origen *</Label>
                <Select value={formData.productiveUnit} onValueChange={handleUnitChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bovinos">Unidad Bovinos</SelectItem>
                    <SelectItem value="Lácteos">Unidad Lácteos</SelectItem>
                    <SelectItem value="Porcinos">Unidad Porcinos</SelectItem>
                    <SelectItem value="Avícola">Unidad Avícola</SelectItem>
                    <SelectItem value="Hortofrutícola">Unidad Hortofrutícola</SelectItem>
                    <SelectItem value="Agroindustria">Unidad Agroindustria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Información de Stock y Precio */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">2. Stock y Precio</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Producto *</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liquido">Líquido</SelectItem>
                    <SelectItem value="solido">Sólido</SelectItem>
                    <SelectItem value="lote">Por Lote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unidad de Medida *</Label>
                <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                    <SelectItem value="litros">Litros (L)</SelectItem>
                    <SelectItem value="unidades">Unidades</SelectItem>
                    <SelectItem value="lote">Lote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Precio Unitario *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="15000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Inicial *</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="50"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Stock Mínimo *</Label>
                <Input
                  id="minStock"
                  type="number"
                  placeholder="10"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras (Opcional)</Label>
                <Input
                  id="barcode"
                  placeholder="7891234567890"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">3. Información Adicional</h3>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Fecha de Vencimiento (Si aplica)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-gradient-to-r from-primary to-chart-4">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Crear Producto
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
