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
import { Loader2, Save, AlertCircle, Upload, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCategoriesSelect } from "@/hooks/use-categories"
import { useUnitsSelect } from "@/hooks/use-units"
import { useProveedoresSelect } from "@/hooks/use-proveedores"
import { useProduct, useProductMutations } from "@/hooks/use-products"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

interface UpdateProductModalProps {
  productId: number | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function UpdateProductModal({ productId, isOpen, onClose, onUpdate }: UpdateProductModalProps) {
  const { toast } = useToast()
  const { categories, isLoading: loadingCategories } = useCategoriesSelect()
  const { units, isLoading: loadingUnits } = useUnitsSelect()
  const { proveedores, isLoading: loadingProveedores } = useProveedoresSelect()
  
  // Siempre llamar al hook, pero solo cuando haya productId
  const { product, isLoading: loadingProduct } = useProduct(productId)
  
  console.log('UpdateProductModal render:', { 
    productId, 
    isOpen, 
    hasProduct: !!product, 
    loadingProduct 
  })
  
  const { updateProduct, isUpdating, error: mutationError } = useProductMutations()
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
    stock_minimo: "",
    stock_maximo: "",
    es_perecedero: false,
    dias_vencimiento: "",
    imagen_url: "",
    es_produccion_propia: true,
    proveedor_id: "",
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Limpiar formulario cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      console.log('🧹 Limpiando formulario al cerrar modal')
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
        stock_minimo: "",
        stock_maximo: "",
        es_perecedero: false,
        dias_vencimiento: "",
        imagen_url: "",
        es_produccion_propia: true,
        proveedor_id: "",
      })
      setImagePreview(null)
    }
  }, [isOpen])

  // Cargar datos del producto cuando se abre el modal
  useEffect(() => {
    console.log('=== UpdateProductModal useEffect ===', { 
      productId, 
      isOpen, 
      hasProduct: !!product,
      loadingProduct,
      productData: product ? {
        id: product.id,
        codigo: product.codigo,
        nombre: product.nombre
      } : null
    })

    if (product && isOpen) {
      console.log('✅ Cargando producto completo para edición:', product)
      setFormData({
        codigo: product.codigo || "",
        nombre: product.nombre || "",
        descripcion: product.descripcion || "",
        categoria_id: product.categoria_id?.toString() || "",
        unidad_productiva_id: product.unidad_productiva_id?.toString() || "",
        tipo_medida: product.tipo_medida || "",
        unidad: product.unidad || "",
        precio_unitario: product.precio_unitario?.toString() || "",
        precio_mayorista: product.precio_mayorista?.toString() || "",
        stock_minimo: product.stock_minimo?.toString() || "",
        stock_maximo: product.stock_maximo?.toString() || "",
        es_perecedero: product.es_perecedero || false,
        dias_vencimiento: product.dias_vencimiento?.toString() || "",
        imagen_url: product.imagen_url || "",
        es_produccion_propia: product.es_produccion_propia ?? true,
        proveedor_id: product.proveedor_id?.toString() || "",
      })
      setImagePreview(product.imagen_url || null)
      console.log('✅ FormData actualizado con datos del producto')
    } else if (isOpen && !product && !loadingProduct) {
      console.warn('⚠️ Modal abierto pero no hay datos de producto y no está cargando')
    }
  }, [product, isOpen, productId, loadingProduct])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Archivo inválido",
        description: "Por favor selecciona una imagen (JPG, PNG o WebP)",
      })
      return
    }

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
      
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al subir imagen')
      }

      const { url } = await response.json()
      
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

    if (!productId) return

    try {
      await updateProduct(productId, {
        codigo: formData.codigo,
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        categoria_id: Number(formData.categoria_id),
        unidad_productiva_id: Number(formData.unidad_productiva_id),
        tipo_medida: formData.tipo_medida as "unidad" | "peso" | "volumen" | "lote",
        unidad: formData.unidad,
        precio_unitario: Number(formData.precio_unitario),
        precio_mayorista: formData.precio_mayorista ? Number(formData.precio_mayorista) : undefined,
        stock_minimo: Number(formData.stock_minimo),
        stock_maximo: formData.stock_maximo ? Number(formData.stock_maximo) : undefined,
        es_perecedero: formData.es_perecedero,
        dias_vencimiento: formData.dias_vencimiento ? Number(formData.dias_vencimiento) : undefined,
        imagen_url: formData.imagen_url || undefined,
        es_produccion_propia: formData.es_produccion_propia,
        proveedor_id: formData.proveedor_id ? Number(formData.proveedor_id) : undefined,
      })

      toast({
        title: "Producto Actualizado",
        description: `${formData.nombre} ha sido actualizado correctamente`,
      })

      onUpdate()
      onClose()
    } catch (error) {
      console.error("Error updating product:", error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el producto'
      toast({
        variant: "destructive",
        title: "Error al actualizar producto",
        description: errorMessage,
      })
    }
  }

  if (!isOpen || !productId) return null

  if (loadingProduct) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Editar Producto</DialogTitle>
            <DialogDescription>Cargando información del producto...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" key={`edit-product-${productId}`}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Producto</DialogTitle>
          <DialogDescription>Actualiza la información del producto en el inventario.</DialogDescription>
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
              {/* TODO: Campos bloqueados - No se deben editar después de creación
                  - codigo: Identificador único del producto, usado en transacciones
                  - tipo_medida: Cambiaría el significado del stock actual
                  - unidad: Cambiaría el significado del stock actual
                  - categoria_id: Podría considerarse editable según reglas de negocio
                  - unidad_productiva_id: Podría considerarse editable según reglas de negocio
              */}
              
              <div className="space-y-2">
                <Label htmlFor="codigo">Código del Producto * (Bloqueado)</Label>
                <Input
                  id="codigo"
                  placeholder="Ej: PROD-001, YOG-DES-500"
                  value={formData.codigo}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  title="El código no puede modificarse una vez creado el producto"
                />
                <p className="text-xs text-muted-foreground">El código no puede modificarse</p>
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
                  key={`categoria-${productId}-${formData.categoria_id}`}
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
                  key={`unidad-${productId}-${formData.unidad_productiva_id}`}
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

          {/* Información de Precio */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">2. Medidas y Precio</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_medida">Tipo de Medida * (Bloqueado)</Label>
                <Select
                  key={`tipo-medida-${productId}-${formData.tipo_medida}`}
                  value={formData.tipo_medida}
                  disabled
                >
                  <SelectTrigger className="bg-muted cursor-not-allowed">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="peso">Peso</SelectItem>
                    <SelectItem value="volumen">Volumen</SelectItem>
                    <SelectItem value="lote">Lote</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">No puede modificarse (afecta stock actual)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad de Medida * (Bloqueada)</Label>
                <Input
                  id="unidad"
                  placeholder="kg, L, unidades, cajas"
                  value={formData.unidad}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  title="La unidad no puede modificarse (afecta stock actual)"
                />
                <p className="text-xs text-muted-foreground">No puede modificarse (afecta stock actual)</p>
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

              {!formData.es_produccion_propia && (
                <div className="space-y-2">
                  <Label htmlFor="proveedor_id">
                    Proveedor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    key={`proveedor-${productId}-${formData.proveedor_id}`}
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
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>Imagen del Producto</Label>
                <div className="space-y-3">
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
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isUpdating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating} className="flex-1 bg-gradient-to-r from-primary to-chart-4">
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Actualizar Producto
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
