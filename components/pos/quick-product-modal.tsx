"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { PackagePlus, Plus } from "lucide-react"

interface QuickProductModalProps {
  open: boolean
  onClose: () => void
  onAddProduct: (product: {
    id: number
    nombre: string
    precio: number
    cantidad: number
    unidad: string
    stock: number
  }) => void
}

export function QuickProductModal({ open, onClose, onAddProduct }: QuickProductModalProps) {
  const { toast } = useToast()
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [cantidad, setCantidad] = useState("1")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!nombre.trim()) {
      toast({
        title: "⚠️ Campo requerido",
        description: "Debes ingresar un nombre para el producto",
        variant: "destructive",
      })
      return
    }

    const precioNum = Number.parseFloat(precio)
    if (!precio || precioNum <= 0) {
      toast({
        title: "⚠️ Precio inválido",
        description: "El precio debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    const cantidadNum = Number.parseInt(cantidad)
    if (!cantidad || cantidadNum <= 0) {
      toast({
        title: "⚠️ Cantidad inválida",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    // Crear producto ficticio con ID negativo (para diferenciarlo de productos reales)
    const ficticioId = -Date.now() // ID negativo único basado en timestamp
    
    onAddProduct({
      id: ficticioId,
      nombre: nombre.trim(),
      precio: precioNum,
      cantidad: cantidadNum,
      unidad: "Unidad",
      stock: 999, // Stock ficticio alto para que no limite la venta
    })

    toast({
      title: "✅ Producto Agregado",
      description: `${nombre} agregado al carrito`,
    })

    // Reset y cerrar
    handleClose()
  }

  const handleClose = () => {
    setNombre("")
    setPrecio("")
    setCantidad("1")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Agregar Producto Rápido
          </DialogTitle>
          <DialogDescription>
            Para productos no registrados en inventario
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del producto */}
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre del Producto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Producto Especial"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              className="h-11"
            />
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <Label htmlFor="precio">
              Precio Unitario <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="precio"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="h-11 pl-7"
              />
            </div>
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="cantidad">
              Cantidad <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cantidad"
              type="number"
              min="1"
              placeholder="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>Nota:</strong> Este producto no se registrará en el inventario. 
              Solo se usará para esta venta específica.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-emerald-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar al Carrito
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
