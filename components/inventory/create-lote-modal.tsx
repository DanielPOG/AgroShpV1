"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Loader2, Package } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useLotesMutations } from "@/hooks/use-lotes"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: number
  nombre: string
  codigo: string
  unidad: string
  es_perecedero: boolean
}

interface UnidadProductiva {
  id: number
  nombre: string
  codigo: string
}

interface CreateLoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  productos: Product[]
  unidades: UnidadProductiva[]
  preselectedProductId?: number
}

export function CreateLoteModal({
  isOpen,
  onClose,
  onSuccess,
  productos,
  unidades,
  preselectedProductId,
}: CreateLoteModalProps) {
  const { toast } = useToast()
  const { createLote, isCreating } = useLotesMutations()

  const [productoId, setProductoId] = useState<string>(
    preselectedProductId?.toString() || ""
  )
  const [codigoLote, setCodigoLote] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [fechaProduccion, setFechaProduccion] = useState<Date>(new Date())
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | undefined>()
  const [unidadProductivaId, setUnidadProductivaId] = useState("")

  // Obtener producto seleccionado
  const selectedProduct = productos.find((p) => p.id.toString() === productoId)

  // Auto-generar código de lote sugerido
  useEffect(() => {
    if (selectedProduct && !codigoLote) {
      const prefix = selectedProduct.codigo.substring(0, 3).toUpperCase()
      const date = format(new Date(), "yyyyMM")
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
      setCodigoLote(`${prefix}-${date}-${random}`)
    }
  }, [selectedProduct, codigoLote])

  // Resetear al cambiar producto
  useEffect(() => {
    if (productoId) {
      setCodigoLote("")
      setFechaVencimiento(undefined)
    }
  }, [productoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!productoId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un producto",
        variant: "destructive",
      })
      return
    }

    if (!codigoLote || codigoLote.length < 5) {
      toast({
        title: "Error",
        description: "El código de lote debe tener al menos 5 caracteres",
        variant: "destructive",
      })
      return
    }

    if (!cantidad || parseFloat(cantidad) <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    if (!unidadProductivaId) {
      toast({
        title: "Error",
        description: "Debes seleccionar una unidad productiva",
        variant: "destructive",
      })
      return
    }

    // Si es perecedero, fecha de vencimiento es obligatoria
    if (selectedProduct?.es_perecedero && !fechaVencimiento) {
      toast({
        title: "Error",
        description: "Los productos perecederos requieren fecha de vencimiento",
        variant: "destructive",
      })
      return
    }

    try {
      await createLote({
        producto_id: parseInt(productoId),
        codigo_lote: codigoLote.toUpperCase(),
        cantidad: parseFloat(cantidad),
        fecha_produccion: fechaProduccion.toISOString(),
        fecha_vencimiento: fechaVencimiento?.toISOString() || null,
        unidad_productiva_id: parseInt(unidadProductivaId),
        estado: "disponible",
      })

      toast({
        title: "Lote creado",
        description: `El lote ${codigoLote} ha sido creado exitosamente`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo crear el lote",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setProductoId(preselectedProductId?.toString() || "")
    setCodigoLote("")
    setCantidad("")
    setFechaProduccion(new Date())
    setFechaVencimiento(undefined)
    setUnidadProductivaId("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Crear Nuevo Lote</DialogTitle>
              <DialogDescription>
                Registra un nuevo lote de producción para trazabilidad
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Producto */}
          <div className="space-y-2">
            <Label htmlFor="producto">
              Producto <span className="text-destructive">*</span>
            </Label>
            <Select
              value={productoId}
              onValueChange={setProductoId}
              disabled={!!preselectedProductId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(productos) && productos.length > 0 ? (
                  productos.map((producto) => (
                    <SelectItem key={producto.id} value={producto.id.toString()}>
                      {producto.nombre} ({producto.codigo})
                      {producto.es_perecedero && " 🍃"}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    No hay productos disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Código de Lote */}
          <div className="space-y-2">
            <Label htmlFor="codigo_lote">
              Código de Lote <span className="text-destructive">*</span>
            </Label>
            <Input
              id="codigo_lote"
              placeholder="Ej: YOG-202512-001"
              value={codigoLote}
              onChange={(e) => setCodigoLote(e.target.value.toUpperCase())}
              required
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Solo letras mayúsculas, números y guiones
            </p>
          </div>

          {/* Cantidad y Unidad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">
                Cantidad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input
                value={selectedProduct?.unidad || "Selecciona producto"}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Fecha de Producción <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaProduccion && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaProduccion ? (
                      format(fechaProduccion, "PPP", { locale: es })
                    ) : (
                      <span>Selecciona fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaProduccion}
                    onSelect={(date) => date && setFechaProduccion(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>
                Fecha de Vencimiento
                {selectedProduct?.es_perecedero && (
                  <span className="text-destructive"> *</span>
                )}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaVencimiento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaVencimiento ? (
                      format(fechaVencimiento, "PPP", { locale: es })
                    ) : (
                      <span>Selecciona fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaVencimiento}
                    onSelect={setFechaVencimiento}
                    initialFocus
                    locale={es}
                    disabled={(date) => date < fechaProduccion}
                  />
                </PopoverContent>
              </Popover>
              {selectedProduct?.es_perecedero && (
                <p className="text-xs text-muted-foreground">
                  Obligatorio para productos perecederos
                </p>
              )}
            </div>
          </div>

          {/* Unidad Productiva */}
          <div className="space-y-2">
            <Label htmlFor="unidad_productiva">
              Unidad Productiva <span className="text-destructive">*</span>
            </Label>
            <Select value={unidadProductivaId} onValueChange={setUnidadProductivaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona unidad productiva" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(unidades) && unidades.length > 0 ? (
                  unidades.map((unidad) => (
                    <SelectItem key={unidad.id} value={unidad.id.toString()}>
                      {unidad.nombre} ({unidad.codigo})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    No hay unidades disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Lote"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
