"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, CheckCircle2, Package, Loader2, AlertCircle, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MovementWizardProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

interface UnidadProductiva {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  tipo: string | null
}

interface Lote {
  id: number
  codigo_lote: string
  cantidad: number
  fecha_produccion: Date
  fecha_vencimiento: Date | null
  estado: string
}

interface ProductoConLotes {
  id: number
  codigo: string
  nombre: string
  tipo_medida: string
  unidad: string | null
  stock_actual: number
  es_perecedero: boolean | null
  imagen_url: string | null
  lotes: Lote[]
}

interface ProductoSeleccionado {
  producto: ProductoConLotes
  lote: Lote
  cantidad: number
}

export function MovementWizard({ open, onClose, onComplete }: MovementWizardProps) {
  const { toast } = useToast()
  
  // Estados para pasos del wizard
  const [step, setStep] = useState(1)
  
  // Estados para datos
  const [unidades, setUnidades] = useState<UnidadProductiva[]>([])
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoConLotes[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Estados para selección
  const [unidadOrigenId, setUnidadOrigenId] = useState<number | null>(null)
  const [unidadDestinoId, setUnidadDestinoId] = useState<number | null>(null)
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([])
  const [motivo, setMotivo] = useState("")
  const [observaciones, setObservaciones] = useState("")
  
  // Estados para agregar producto
  const [productoIdSeleccionado, setProductoIdSeleccionado] = useState<number | null>(null)
  const [loteIdSeleccionado, setLoteIdSeleccionado] = useState<number | null>(null)
  const [cantidadInput, setCantidadInput] = useState("")

  // Cargar unidades productivas al abrir
  useEffect(() => {
    if (open) {
      cargarUnidades()
    }
  }, [open])

  // Cargar productos cuando se selecciona unidad origen
  useEffect(() => {
    if (unidadOrigenId) {
      cargarProductosDeUnidad(unidadOrigenId)
    } else {
      setProductosDisponibles([])
    }
  }, [unidadOrigenId])

  const cargarUnidades = async () => {
    setLoadingUnidades(true)
    try {
      const response = await fetch('/api/unidades-productivas')
      if (!response.ok) throw new Error('Error al cargar unidades')
      
      const data = await response.json()
      setUnidades(data.data || [])
    } catch (error) {
      console.error('Error al cargar unidades:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las unidades productivas",
        variant: "destructive"
      })
    } finally {
      setLoadingUnidades(false)
    }
  }

  const cargarProductosDeUnidad = async (unidadId: number) => {
    setLoadingProductos(true)
    setProductoIdSeleccionado(null)
    setLoteIdSeleccionado(null)
    try {
      const response = await fetch(`/api/unidades-productivas/${unidadId}/productos`)
      if (!response.ok) throw new Error('Error al cargar productos')
      
      const data = await response.json()
      setProductosDisponibles(data.data || [])
    } catch (error) {
      console.error('Error al cargar productos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos disponibles",
        variant: "destructive"
      })
    } finally {
      setLoadingProductos(false)
    }
  }

  const handleAgregarProducto = () => {
    if (!productoIdSeleccionado || !loteIdSeleccionado || !cantidadInput) {
      toast({
        title: "Campos incompletos",
        description: "Debes seleccionar producto, lote y cantidad",
        variant: "destructive"
      })
      return
    }

    const producto = productosDisponibles.find(p => p.id === productoIdSeleccionado)
    if (!producto) return

    const lote = producto.lotes.find(l => l.id === loteIdSeleccionado)
    if (!lote) return

    const cantidad = parseFloat(cantidadInput)
    
    if (cantidad <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      })
      return
    }

    if (cantidad > lote.cantidad) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${lote.cantidad} ${producto.unidad} disponibles en este lote`,
        variant: "destructive"
      })
      return
    }

    // Verificar si ya está agregado el mismo lote
    const yaExiste = productosSeleccionados.find(p => p.lote.id === loteIdSeleccionado)
    if (yaExiste) {
      toast({
        title: "Lote ya agregado",
        description: "Este lote ya está en la lista",
        variant: "destructive"
      })
      return
    }

    setProductosSeleccionados([
      ...productosSeleccionados,
      { producto, lote, cantidad }
    ])

    // Limpiar campos
    setProductoIdSeleccionado(null)
    setLoteIdSeleccionado(null)
    setCantidadInput("")
  }

  const handleEliminarProducto = (loteId: number) => {
    setProductosSeleccionados(productosSeleccionados.filter(p => p.lote.id !== loteId))
  }

  const handleSubmit = async () => {
    if (!unidadOrigenId || !unidadDestinoId || productosSeleccionados.length === 0) {
      toast({
        title: "Error",
        description: "Faltan datos para completar el movimiento",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidad_origen_id: unidadOrigenId,
          unidad_destino_id: unidadDestinoId,
          motivo: motivo || 'Transferencia entre unidades',
          observaciones: observaciones || undefined,
          detalles: productosSeleccionados.map(p => ({
            producto_id: p.producto.id,
            lote_id: p.lote.id,
            cantidad: p.cantidad,
            unidad: p.producto.unidad || 'unidad'
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Error al crear movimiento')
      }

      toast({
        title: "✅ Movimiento registrado",
        description: `Código: ${data.data.codigo_movimiento}`,
      })

      handleCerrar()
      onComplete()

    } catch (error) {
      console.error('Error al crear movimiento:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo completar el movimiento",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCerrar = () => {
    setStep(1)
    setUnidadOrigenId(null)
    setUnidadDestinoId(null)
    setProductosSeleccionados([])
    setProductoIdSeleccionado(null)
    setLoteIdSeleccionado(null)
    setCantidadInput("")
    setMotivo("")
    setObservaciones("")
    onClose()
  }

  const unidadOrigen = unidades.find(u => u.id === unidadOrigenId)
  const unidadDestino = unidades.find(u => u.id === unidadDestinoId)
  const productoSeleccionado = productosDisponibles.find(p => p.id === productoIdSeleccionado)
  const loteSeleccionado = productoSeleccionado?.lotes.find(l => l.id === loteIdSeleccionado)

  const puedeAvanzarPaso1 = unidadOrigenId && unidadDestinoId && unidadOrigenId !== unidadDestinoId
  const puedeAvanzarPaso2 = productosSeleccionados.length > 0

  return (
    <Dialog open={open} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl lg:text-2xl">Nuevo Movimiento</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Transfiere productos entre unidades productivas con control de lotes
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
            {loadingUnidades ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="from" className="text-xs sm:text-sm">
                    Unidad de Origen
                  </Label>
                  <Select 
                    value={unidadOrigenId?.toString() || ''} 
                    onValueChange={(val) => setUnidadOrigenId(parseInt(val))}
                  >
                    <SelectTrigger id="from" className="text-xs sm:text-sm">
                      <SelectValue placeholder="Selecciona origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidad) => (
                        <SelectItem key={unidad.id} value={unidad.id.toString()} className="text-xs sm:text-sm">
                          {unidad.nombre} {unidad.codigo && `(${unidad.codigo})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {unidadOrigen && unidadOrigen.descripcion && (
                    <p className="text-[10px] sm:text-sm text-muted-foreground">
                      {unidadOrigen.descripcion}
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
                  <Select 
                    value={unidadDestinoId?.toString() || ''} 
                    onValueChange={(val) => setUnidadDestinoId(parseInt(val))}
                  >
                    <SelectTrigger id="to" className="text-xs sm:text-sm">
                      <SelectValue placeholder="Selecciona destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades
                        .filter((u) => u.id !== unidadOrigenId)
                        .map((unidad) => (
                          <SelectItem key={unidad.id} value={unidad.id.toString()} className="text-xs sm:text-sm">
                            {unidad.nombre} {unidad.codigo && `(${unidad.codigo})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {unidadDestino && unidadDestino.descripcion && (
                    <p className="text-[10px] sm:text-sm text-muted-foreground">
                      {unidadDestino.descripcion}
                    </p>
                  )}
                </div>

                <Button 
                  onClick={() => setStep(2)} 
                  className="w-full text-xs sm:text-sm" 
                  disabled={!puedeAvanzarPaso1}
                >
                  Continuar
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Select Products */}
        {step === 2 && (
          <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
            <div className="bg-secondary/50 rounded-lg p-3 sm:p-4 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Movimiento</p>
                <p className="font-semibold text-xs sm:text-base">
                  {unidadOrigen?.nombre} → {unidadDestino?.nombre}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">
                Cambiar
              </Button>
            </div>

            {loadingProductos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : productosDisponibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                <AlertCircle className="h-12 w-12" />
                <p className="text-sm">No hay productos disponibles en esta unidad</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 sm:space-y-4">
                  <Label className="text-xs sm:text-sm font-semibold">Agregar Productos</Label>
                  
                  {/* Selector de Producto */}
                  <div className="space-y-2">
                    <Label htmlFor="producto" className="text-xs">Producto</Label>
                    <Select 
                      value={productoIdSeleccionado?.toString() || ''} 
                      onValueChange={(val) => {
                        setProductoIdSeleccionado(parseInt(val))
                        setLoteIdSeleccionado(null)
                        setCantidadInput("")
                      }}
                    >
                      <SelectTrigger id="producto" className="text-xs sm:text-sm">
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {productosDisponibles.map((producto) => (
                          <SelectItem key={producto.id} value={producto.id.toString()} className="text-xs sm:text-sm">
                            {producto.nombre} - {producto.lotes.length} lote(s) disponible(s)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de Lote */}
                  {productoSeleccionado && (
                    <div className="space-y-2">
                      <Label htmlFor="lote" className="text-xs">Lote</Label>
                      <Select 
                        value={loteIdSeleccionado?.toString() || ''} 
                        onValueChange={(val) => setLoteIdSeleccionado(parseInt(val))}
                      >
                        <SelectTrigger id="lote" className="text-xs sm:text-sm">
                          <SelectValue placeholder="Selecciona un lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {productoSeleccionado.lotes.map((lote) => (
                            <SelectItem key={lote.id} value={lote.id.toString()} className="text-xs sm:text-sm">
                              {lote.codigo_lote} - Disponible: {lote.cantidad} {productoSeleccionado.unidad}
                              {lote.fecha_vencimiento && ` - Vence: ${format(new Date(lote.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Input de Cantidad */}
                  {loteSeleccionado && (
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="cantidad" className="text-xs">
                          Cantidad (máx: {loteSeleccionado.cantidad} {productoSeleccionado?.unidad})
                        </Label>
                        <Input
                          id="cantidad"
                          type="number"
                          placeholder="Cantidad"
                          value={cantidadInput}
                          onChange={(e) => setCantidadInput(e.target.value)}
                          className="text-xs sm:text-sm"
                          min="0.01"
                          step="0.01"
                          max={loteSeleccionado.cantidad}
                        />
                      </div>
                      <Button
                        onClick={handleAgregarProducto}
                        disabled={!loteIdSeleccionado || !cantidadInput}
                        className="mt-6"
                      >
                        Agregar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Lista de Productos Seleccionados */}
                {productosSeleccionados.length > 0 && (
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs sm:text-sm font-semibold">
                      Productos Seleccionados ({productosSeleccionados.length})
                    </Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {productosSeleccionados.map((item) => (
                        <Card key={item.lote.id}>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-start gap-3">
                              <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                                {item.producto.imagen_url ? (
                                  <Image
                                    src={item.producto.imagen_url}
                                    alt={item.producto.nombre}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs sm:text-sm truncate">{item.producto.nombre}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  Lote: {item.lote.codigo_lote}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {item.cantidad} {item.producto.unidad}
                                  </Badge>
                                  {item.lote.fecha_vencimiento && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Vence: {format(new Date(item.lote.fecha_vencimiento), 'dd/MM/yy')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEliminarProducto(item.lote.id)}
                                className="shrink-0 h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 text-xs sm:text-sm">
                    Atrás
                  </Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    className="flex-1 text-xs sm:text-sm" 
                    disabled={!puedeAvanzarPaso2}
                  >
                    Continuar
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
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
              <p className="text-xs sm:text-sm text-muted-foreground">Revisa los detalles antes de confirmar</p>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Origen</p>
                    <p className="font-semibold text-sm sm:text-base">{unidadOrigen?.nombre}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="space-y-1 text-right flex-1">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Destino</p>
                    <p className="font-semibold text-sm sm:text-base">{unidadDestino?.nombre}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs">Motivo (opcional)</Label>
                  <Input
                    placeholder="Ej: Reposición de stock"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Observaciones (opcional)</Label>
                  <Textarea
                    placeholder="Notas adicionales sobre este movimiento..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="text-xs sm:text-sm"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium">Productos a Transferir</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {productosSeleccionados.map((item) => (
                      <div key={item.lote.id} className="flex items-center justify-between py-2 gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                            {item.producto.imagen_url ? (
                              <Image
                                src={item.producto.imagen_url}
                                alt={item.producto.nombre}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm truncate font-medium">{item.producto.nombre}</p>
                            <p className="text-[10px] text-muted-foreground">Lote: {item.lote.codigo_lote}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                          {item.cantidad} {item.producto.unidad}
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
              <Button 
                onClick={handleSubmit} 
                className="flex-1 text-xs sm:text-sm" 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Movimiento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
