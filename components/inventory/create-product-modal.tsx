"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles, AlertCircle, Upload, X, Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCategoriesSelect } from "@/hooks/use-categories"
import { useUnitsSelect } from "@/hooks/use-units"
import { useProveedoresSelect } from "@/hooks/use-proveedores"
import { useProductMutations } from "@/hooks/use-products"
import { useConfig } from "@/hooks/use-config"
import Image from "next/image"

interface CreateProductModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: () => void
}

export function CreateProductModal({ isOpen, onClose, onCreate }: CreateProductModalProps) {
  const { toast } = useToast()
  const { config } = useConfig()
  const { categories, isLoading: loadingCategories } = useCategoriesSelect()
  const { units, isLoading: loadingUnits } = useUnitsSelect()
  const { proveedores, isLoading: loadingProveedores } = useProveedoresSelect()
  const { createProduct, isCreating, error: mutationError } = useProductMutations()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria_id: "",
    unidad_productiva_id: "",
    tipo_medida: "",
    unidad: "",
    precio_unitario: "",
    precio_mayorista: "",
    stock_inicial: "",
    stock_minimo: String(config.stock_minimo_default),
    stock_maximo: "",
    es_perecedero: false,
    dias_vencimiento: "",
    imagen_url: "",
    es_produccion_propia: true,
    proveedor_id: "",
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const resetForm = () => {
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      categoria_id: "",
      unidad_productiva_id: "",
      tipo_medida: "",
      unidad: "",
      precio_unitario: "",
      precio_mayorista: "",
      stock_inicial: "",
      stock_minimo: String(config.stock_minimo_default),
      stock_maximo: "",
      es_perecedero: false,
      dias_vencimiento: "",
      imagen_url: "",
      es_produccion_propia: true,
      proveedor_id: "",
    })
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Archivo inválido",
        description: "Por favor selecciona una imagen (JPG, PNG o WebP)",
      })
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo muy grande",
        description: "La imagen no debe superar los 5MB",
      })
      return
    }

    try {
      setUploading(true)
      
      // Crear FormData para enviar el archivo
      const formData = new FormData()
      formData.append('file', file)

      // Subir imagen
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al subir imagen')
      }

      const { url } = await response.json()
      
      // Actualizar form data con la URL
      setFormData(prev => ({ ...prev, imagen_url: url }))
      setImagePreview(url)

      toast({
        title: "Imagen subida",
        description: "La imagen se ha cargado correctamente",
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        variant: "destructive",
        title: "Error al subir imagen",
        description: error instanceof Error ? error.message : "Intenta de nuevo",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imagen_url: "" }))
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createProduct({
        codigo: formData.codigo,
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        categoria_id: Number(formData.categoria_id),
        unidad_productiva_id: Number(formData.unidad_productiva_id),
        tipo_medida: formData.tipo_medida as "unidad" | "peso" | "volumen" | "lote",
        unidad: formData.unidad,
        precio_unitario: Number(formData.precio_unitario),
        precio_mayorista: formData.precio_mayorista ? Number(formData.precio_mayorista) : undefined,
        stock_inicial: formData.stock_inicial ? Number(formData.stock_inicial) : undefined,
        stock_minimo: Number(formData.stock_minimo),
        stock_maximo: formData.stock_maximo ? Number(formData.stock_maximo) : undefined,
        es_perecedero: formData.es_perecedero,
        dias_vencimiento: formData.dias_vencimiento ? Number(formData.dias_vencimiento) : undefined,
        imagen_url: formData.imagen_url || undefined,
        es_produccion_propia: formData.es_produccion_propia,
        proveedor_id: formData.proveedor_id ? Number(formData.proveedor_id) : undefined,
      })

      toast({
        title: "Producto Creado",
        description: `${formData.nombre} ha sido agregado al inventario`,
      })

      resetForm()
      onCreate()
      onClose()
    } catch (error) {
      console.error("Error creating product:", error)
      
      // Mostrar error específico al usuario
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el producto'
      toast({
        variant: "destructive",
        title: "Error al crear producto",
        description: errorMessage,
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Crear Nuevo Producto</DialogTitle>
          <DialogDescription>Completa la información del producto para agregarlo al inventario.</DialogDescription>
        </DialogHeader>

        {mutationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">1. Información Básica</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código del Producto *</Label>
                <Input
                  id="codigo"
                  placeholder="Ej: PROD-001, YOG-DES-500"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  required
                  maxLength={50}
                  pattern="[A-Z0-9\-]+"
                  title="Solo letras mayúsculas, números y guiones"
                />
                <p className="text-xs text-muted-foreground">Solo mayúsculas, números y guiones</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Producto *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Yogurt deslactosado, Tomate chonto"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripción Corta</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Ej: Producto fresco producido por la unidad Bovinos"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría del Producto *</Label>
                <Select
                  value={formData.categoria_id}
                  onValueChange={(val) => setFormData({ ...formData, categoria_id: val })}
                  required
                  disabled={loadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.icono && `${cat.icono} `}
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidad_productiva">Unidad Productiva de Origen *</Label>
                <Select
                  value={formData.unidad_productiva_id}
                  onValueChange={(val) => setFormData({ ...formData, unidad_productiva_id: val })}
                  required
                  disabled={loadingUnits}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.nombre}
                        {unit.tipo && ` (${unit.tipo})`}
                      </SelectItem>
                    ))}
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
                <Label htmlFor="tipo_medida">Tipo de Medida *</Label>
                <Select
                  value={formData.tipo_medida}
                  onValueChange={(val) => setFormData({ ...formData, tipo_medida: val })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
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
                <Label htmlFor="unidad">Unidad de Medida *</Label>
                <Input
                  id="unidad"
                  placeholder="kg, L, unidades, cajas"
                  value={formData.unidad}
                  onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio_unitario">Precio Unitario *</Label>
                <Input
                  id="precio_unitario"
                  type="number"
                  step="0.01"
                  placeholder="15000"
                  value={formData.precio_unitario}
                  onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio_mayorista">Precio Mayorista</Label>
                <Input
                  id="precio_mayorista"
                  type="number"
                  step="0.01"
                  placeholder="12000"
                  value={formData.precio_mayorista}
                  onChange={(e) => setFormData({ ...formData, precio_mayorista: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_inicial">Stock Inicial</Label>
                <Input
                  id="stock_inicial"
                  type="number"
                  placeholder="50"
                  value={formData.stock_inicial}
                  onChange={(e) => setFormData({ ...formData, stock_inicial: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_minimo">Stock Mínimo *</Label>
                <Input
                  id="stock_minimo"
                  type="number"
                  placeholder="10"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_maximo">Stock Máximo</Label>
                <Input
                  id="stock_maximo"
                  type="number"
                  placeholder="200"
                  value={formData.stock_maximo}
                  onChange={(e) => setFormData({ ...formData, stock_maximo: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">3. Información Adicional</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Producto Perecedero */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="es_perecedero"
                    checked={formData.es_perecedero}
                    onChange={(e) => setFormData({ ...formData, es_perecedero: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="es_perecedero" className="cursor-pointer">
                    Producto Perecedero
                  </Label>
                </div>
              </div>

              {/* Producción Propia */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="es_produccion_propia"
                    checked={formData.es_produccion_propia}
                    onChange={(e) => setFormData({ ...formData, es_produccion_propia: e.target.checked, proveedor_id: "" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="es_produccion_propia" className="cursor-pointer">
                    Producción Propia
                  </Label>
                </div>
              </div>

              {formData.es_perecedero && (
                <div className="space-y-2">
                  <Label htmlFor="dias_vencimiento">Días hasta Vencimiento</Label>
                  <Input
                    id="dias_vencimiento"
                    type="number"
                    placeholder="30"
                    value={formData.dias_vencimiento}
                    onChange={(e) => setFormData({ ...formData, dias_vencimiento: e.target.value })}
                  />
                </div>
              )}

              {/* Proveedor (solo si NO es producción propia) */}
              {!formData.es_produccion_propia && (
                <div className="space-y-2">
                  <Label htmlFor="proveedor_id">
                    Proveedor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.proveedor_id}
                    onValueChange={(value) => setFormData({ ...formData, proveedor_id: value })}
                    disabled={loadingProveedores}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingProveedores ? "Cargando..." : "Selecciona un proveedor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((proveedor) => (
                        <SelectItem key={proveedor.id} value={proveedor.id.toString()}>
                          {proveedor.nombre}
                          {proveedor.nit && ` (NIT: ${proveedor.nit})`}
                        </SelectItem>
                      ))}
                      {proveedores.length === 0 && !loadingProveedores && (
                        <SelectItem value="none" disabled>
                          No hay proveedores disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {proveedores.length === 0 && !loadingProveedores && (
                    <p className="text-xs text-muted-foreground text-destructive">
                      No hay proveedores registrados. Crea uno primero en el módulo de Proveedores.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>Imagen del Producto</Label>
                <div className="space-y-3">
                  {/* Preview de la imagen */}
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-lg border-2 border-border overflow-hidden bg-muted">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Botón de carga */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex-1"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Input oculto */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o WebP. Máximo 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isCreating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating} className="flex-1 bg-gradient-to-r from-primary to-chart-4">
              {isCreating ? (
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
