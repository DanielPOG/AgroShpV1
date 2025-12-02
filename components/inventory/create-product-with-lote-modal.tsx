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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Loader2, Package, Upload, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

interface Category {
  id: number
  nombre: string
  color: string
}

interface UnidadProductiva {
  id: number
  nombre: string
  codigo: string
}

interface CreateProductWithLoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categorias: Category[]
  unidades: UnidadProductiva[]
}

export function CreateProductWithLoteModal({
  isOpen,
  onClose,
  onSuccess,
  categorias,
  unidades,
}: CreateProductWithLoteModalProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)

  // Datos del Producto
  const [codigo, setCodigo] = useState("")
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [categoriaId, setCategoriaId] = useState("")
  const [unidadProductivaId, setUnidadProductivaId] = useState("")
  const [tipoMedida, setTipoMedida] = useState("")
  const [unidad, setUnidad] = useState("")
  const [precioUnitario, setPrecioUnitario] = useState("")
  const [precioMayorista, setPrecioMayorista] = useState("")
  const [stockMinimo, setStockMinimo] = useState("10")
  const [esPerecedero, setEsPerecedero] = useState(false)
  const [diasVencimiento, setDiasVencimiento] = useState("")
  const [imagenUrl, setImagenUrl] = useState("")
  const [unidadesSugeridas, setUnidadesSugeridas] = useState<string[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Datos del Lote Inicial
  const [codigoLote, setCodigoLote] = useState("")
  const [cantidadInicial, setCantidadInicial] = useState("")
  const [fechaProduccion, setFechaProduccion] = useState<Date>(new Date())

  // Auto-generar código de lote cuando se ingresa el código del producto
  useEffect(() => {
    if (codigo && !codigoLote) {
      const prefix = codigo.substring(0, 3).toUpperCase()
      const date = format(new Date(), "yyyyMM")
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
      setCodigoLote(`${prefix}-${date}-${random}`)
    }
  }, [codigo, codigoLote])

  // Actualizar sugerencias de unidades según tipo de medida
  useEffect(() => {
    const sugerencias: Record<string, string[]> = {
      unidad: ["und", "unidades", "paquete", "caja", "docena"],
      peso: ["kg", "g", "lb", "ton", "oz"],
      volumen: ["L", "ml", "gal", "m³", "cc"],
      lote: ["lote", "batch", "producción", "tandas"]
    }
    setUnidadesSugeridas(sugerencias[tipoMedida] || [])
    
    // Auto-completar la primera sugerencia si el campo está vacío
    if (tipoMedida && !unidad && sugerencias[tipoMedida]) {
      setUnidad(sugerencias[tipoMedida][0])
    }
  }, [tipoMedida])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      })
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Error al subir imagen")
      }

      const data = await res.json()
      setImagenUrl(data.url)

      toast({
        title: "Imagen subida",
        description: "La imagen se ha cargado correctamente",
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive",
      })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setImagenUrl("")
    toast({
      title: "Imagen eliminada",
      description: "La imagen ha sido removida",
    })
  }

  const handleClose = () => {
    // Reset form
    setCodigo("")
    setNombre("")
    setDescripcion("")
    setCategoriaId("")
    setUnidadProductivaId("")
    setTipoMedida("")
    setUnidad("")
    setPrecioUnitario("")
    setPrecioMayorista("")
    setStockMinimo("10")
    setEsPerecedero(false)
    setDiasVencimiento("")
    setImagenUrl("")
    setCodigoLote("")
    setCantidadInicial("")
    setFechaProduccion(new Date())
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      // Validaciones
      if (!codigo || !nombre || !categoriaId || !unidadProductivaId || !tipoMedida || !unidad) {
        toast({
          title: "Error",
          description: "Completa todos los campos obligatorios del producto",
          variant: "destructive",
        })
        setIsCreating(false)
        return
      }

      if (!precioUnitario || parseFloat(precioUnitario) <= 0) {
        toast({
          title: "Error",
          description: "El precio debe ser mayor a 0",
          variant: "destructive",
        })
        setIsCreating(false)
        return
      }

      if (esPerecedero && !diasVencimiento) {
        toast({
          title: "Error",
          description: "Los productos perecederos requieren días de vencimiento",
          variant: "destructive",
        })
        setIsCreating(false)
        return
      }

      if (!codigoLote || !cantidadInicial || parseFloat(cantidadInicial) <= 0) {
        toast({
          title: "Error",
          description: "Completa los datos del lote inicial (código y cantidad)",
          variant: "destructive",
        })
        setIsCreating(false)
        return
      }

      // 1. Crear producto
      const productRes = await fetch("/api/productos/con-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto: {
            codigo,
            nombre,
            descripcion,
            categoria_id: parseInt(categoriaId),
            unidad_productiva_id: parseInt(unidadProductivaId),
            tipo_medida: tipoMedida,
            unidad,
            precio_unitario: parseFloat(precioUnitario),
            precio_mayorista: precioMayorista ? parseFloat(precioMayorista) : null,
            stock_minimo: parseFloat(stockMinimo),
            es_perecedero: esPerecedero,
            dias_vencimiento: diasVencimiento ? parseInt(diasVencimiento) : null,
            imagen_url: imagenUrl || null,
          },
          lote: {
            codigo_lote: codigoLote,
            cantidad: parseFloat(cantidadInicial),
            fecha_produccion: fechaProduccion.toISOString(),
            unidad_productiva_id: parseInt(unidadProductivaId),
          },
        }),
      })

      if (!productRes.ok) {
        const error = await productRes.json()
        throw new Error(error.error || "Error al crear producto con lote")
      }

      const result = await productRes.json()

      toast({
        title: "¡Éxito!",
        description: `Producto "${nombre}" creado con lote inicial de ${cantidadInicial} ${unidad}`,
      })

      handleClose()
      onSuccess()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear producto con lote",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Crear Producto con Lote Inicial
          </DialogTitle>
          <DialogDescription>
            Define el nuevo producto y registra su primer lote de producción. Todos los productos
            requieren trazabilidad mediante lotes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: DATOS DEL PRODUCTO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <h3 className="text-sm font-semibold text-muted-foreground">DATOS DEL PRODUCTO</h3>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Código y Nombre */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codigo"
                  placeholder="YOG-FRESA-250"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Yogurt de Fresa 250ml"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Descripción del producto..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
              />
            </div>

            {/* Categoría y Unidad Productiva */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">
                  Categoría <span className="text-destructive">*</span>
                </Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias && categorias.length > 0 ? (
                      categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.nombre}
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        Cargando categorías...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidad_productiva">
                  Unidad Productiva <span className="text-destructive">*</span>
                </Label>
                <Select value={unidadProductivaId} onValueChange={setUnidadProductivaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades && unidades.length > 0 ? (
                      unidades.map((unidad) => (
                        <SelectItem key={unidad.id} value={unidad.id.toString()}>
                          {unidad.nombre} ({unidad.codigo})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        Cargando unidades...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de Medida y Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_medida">
                  Tipo de Medida <span className="text-destructive">*</span>
                </Label>
                <Select value={tipoMedida} onValueChange={setTipoMedida}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="peso">Peso</SelectItem>
                    <SelectItem value="volumen">Volumen</SelectItem>
                    <SelectItem value="lote">Lote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidad">
                  Unidad <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="unidad"
                  placeholder="kg, L, und, etc."
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  required
                />
                {unidadesSugeridas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {unidadesSugeridas.map((sugerencia) => (
                      <Button
                        key={sugerencia}
                        type="button"
                        variant={unidad === sugerencia ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setUnidad(sugerencia)}
                      >
                        {sugerencia}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Precios */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precio_unitario">
                  Precio Unitario <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="precio_unitario"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_mayorista">Precio Mayorista</Label>
                <Input
                  id="precio_mayorista"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={precioMayorista}
                  onChange={(e) => setPrecioMayorista(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                <Input
                  id="stock_minimo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="10"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                />
              </div>
            </div>

            {/* Perecedero */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="es_perecedero">Producto Perecedero</Label>
                <p className="text-sm text-muted-foreground">
                  Requiere control de vencimiento
                </p>
              </div>
              <Switch
                id="es_perecedero"
                checked={esPerecedero}
                onCheckedChange={setEsPerecedero}
              />
            </div>

            {esPerecedero && (
              <div className="space-y-2">
                <Label htmlFor="dias_vencimiento">
                  Días de Vencimiento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dias_vencimiento"
                  type="number"
                  min="1"
                  placeholder="15"
                  value={diasVencimiento}
                  onChange={(e) => setDiasVencimiento(e.target.value)}
                  required={esPerecedero}
                />
                <p className="text-xs text-muted-foreground">
                  Vida útil del producto desde su fecha de producción
                </p>
              </div>
            )}

            {/* Imagen del Producto */}
            <div className="space-y-2">
              <Label htmlFor="imagen">Imagen del Producto</Label>
              
              {!imagenUrl ? (
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingImage}
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Imagen
                      </>
                    )}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o WebP (máx. 5MB)
                  </p>
                </div>
              ) : (
                <div className="relative w-full h-48 rounded-lg border overflow-hidden">
                  <Image
                    src={imagenUrl}
                    alt="Imagen del producto"
                    fill
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* SECCIÓN 2: LOTE INICIAL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <h3 className="text-sm font-semibold text-muted-foreground">LOTE INICIAL</h3>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Código de Lote */}
            <div className="space-y-2">
              <Label htmlFor="codigo_lote">
                Código de Lote <span className="text-destructive">*</span>
              </Label>
              <Input
                id="codigo_lote"
                placeholder="YOG-202512-001"
                value={codigoLote}
                onChange={(e) => setCodigoLote(e.target.value.toUpperCase())}
                required
              />
              <p className="text-xs text-muted-foreground">
                Código único para trazabilidad (se genera automáticamente)
              </p>
            </div>

            {/* Cantidad y Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cantidad_inicial">
                  Cantidad Inicial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cantidad_inicial"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={cantidadInicial}
                  onChange={(e) => setCantidadInicial(e.target.value)}
                  required
                />
              </div>
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
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                📦 La fecha de vencimiento se calculará automáticamente{" "}
                {esPerecedero && diasVencimiento
                  ? `(${diasVencimiento} días después de la producción)`
                  : "si el producto es perecedero"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Producto y Lote"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
