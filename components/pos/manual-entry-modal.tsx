"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Delete, Check } from "lucide-react"

interface ManualEntryModalProps {
  open: boolean
  onClose: () => void
  onAdd: (product: { name: string; price: number }) => void
}

export function ManualEntryModal({ open, onClose, onAdd }: ManualEntryModalProps) {
  const { toast } = useToast()
  const [productName, setProductName] = useState("")
  const [priceInput, setPriceInput] = useState("")

  const handleNumberClick = (num: string) => {
    setPriceInput((prev) => prev + num)
  }

  const handleClear = () => {
    setPriceInput("")
  }

  const handleBackspace = () => {
    setPriceInput((prev) => prev.slice(0, -1))
  }

  const handleSubmit = () => {
    if (!productName.trim() || !priceInput) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      })
      return
    }

    const price = Number.parseFloat(priceInput)
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Error",
        description: "El precio debe ser un número válido mayor a 0",
        variant: "destructive",
      })
      return
    }

    onAdd({ name: productName, price })

    // Reset form
    setProductName("")
    setPriceInput("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Entrada Manual de Producto</DialogTitle>
          <DialogDescription>Registra un producto que no está en el sistema</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Nombre del Producto</Label>
            <Input
              id="productName"
              placeholder="Ej: Producto especial"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio</Label>
            <div className="text-3xl font-bold text-center p-4 bg-secondary rounded-lg min-h-[4rem] flex items-center justify-center">
              ${priceInput || "0"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                onClick={() => handleNumberClick(num)}
                className="h-14 text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              onClick={handleClear}
              className="h-14 text-lg font-semibold hover:bg-destructive hover:text-destructive-foreground bg-transparent"
            >
              C
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleNumberClick("0")}
              className="h-14 text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            >
              0
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleBackspace}
              className="h-14 hover:bg-orange-accent hover:text-white bg-transparent"
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-chart-4">
              <Check className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
