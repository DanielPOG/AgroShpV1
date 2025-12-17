"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { Package, Calendar, AlertCircle, CheckCircle, XCircle, Clock, Building2, User, MapPin, Pencil, Download, Barcode } from "lucide-react"
import dynamic from "next/dynamic"

// Importar Barcode dinámicamente para evitar errores de SSR
const BarcodeComponent = dynamic(() => import('react-barcode'), { ssr: false })
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useLoteById } from "@/hooks/use-lotes"
import { EditCostosLoteModal } from "./edit-costos-lote-modal"
import { useConfig } from "@/hooks/use-config"

interface LoteDetailModalProps {
  loteId: number | null
  isOpen: boolean
  onClose: () => void
}

export function LoteDetailModal({ loteId, isOpen, onClose }: LoteDetailModalProps) {
  const { config } = useConfig()
  
  // Estados para el modal de edición de costos
  const [isEditCostosOpen, setIsEditCostosOpen] = useState(false)
  const barcodeRef = useRef<HTMLDivElement>(null)
  
  // Función para descargar el código de barras como imagen
  const handleDownloadBarcode = () => {
    if (!barcodeRef.current || !lote) return
    
    const svg = barcodeRef.current.querySelector('svg')
    if (!svg) return
    
    // Convertir SVG a canvas y descargar
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const data = new XMLSerializer().serializeToString(svg)
    const img = new window.Image()
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a')
          link.download = `codigo-barras-${lote.codigo_lote}.png`
          link.href = URL.createObjectURL(blob)
          link.click()
          URL.revokeObjectURL(link.href)
        }
      })
      
      URL.revokeObjectURL(url)
    }
    
    img.src = url
  }
  
  // Solo llamar al hook si hay un loteId válido
  const shouldFetch = isOpen && loteId !== null
  const { lote, isLoading, error, refetch } = useLoteById(shouldFetch ? loteId : null)

  // No renderizar el modal si no hay ID o no está abierto
  if (!isOpen || !loteId) return null

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando...</DialogTitle>
            <DialogDescription>Obteniendo información del lote</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !lote) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>No se pudo cargar el lote</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "No se pudo cargar el lote"}</AlertDescription>
          </Alert>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogContent>
      </Dialog>
    )
  }

  const getEstadoBadge = () => {
    switch (lote.estado) {
      case 'disponible':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          className: "bg-green-500 text-white",
          label: "Disponible",
        }
      case 'vencido':
        return {
          icon: <XCircle className="h-4 w-4" />,
          className: "bg-destructive text-destructive-foreground",
          label: "Vencido",
        }
      case 'retirado':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          className: "bg-gray-500 text-white",
          label: "Retirado",
        }
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          className: "bg-muted text-muted-foreground",
          label: "Desconocido",
        }
    }
  }

  const estadoBadge = getEstadoBadge()
  const producto = lote.producto

  // Calcular días hasta vencimiento
  const diasHastaVencimiento = lote.fecha_vencimiento
    ? Math.ceil((new Date(lote.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl">Detalles del Lote</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Información completa del lote y producto asociado
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-3 sm:space-y-4">
          {/* Información del Lote */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-1">Lote {lote.codigo_lote}</h3>
                <p className="text-xs text-muted-foreground">
                  Creado {lote.created_at ? format(new Date(lote.created_at), "dd 'de' MMMM, yyyy", { locale: es }) : format(new Date(lote.fecha_produccion), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <Badge className={`text-xs ${estadoBadge.className}`}>
                {estadoBadge.icon}
                <span className="ml-1">{estadoBadge.label}</span>
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Cantidad Actual</p>
                  <p className="font-semibold">{Number(lote.cantidad).toFixed(2)} {producto?.unidad || 'kg'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Cantidad Inicial</p>
                  <p className="font-semibold">
                    {lote.costos_produccion?.[0]?.cantidad_producida 
                      ? Number(lote.costos_produccion[0].cantidad_producida).toFixed(2)
                      : Number(lote.cantidad).toFixed(2)
                    } {producto?.unidad || 'kg'}
                  </p>
                </div>
              </div>

              {lote.fecha_vencimiento && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de Vencimiento</p>
                    <p className="font-semibold">
                      {format(new Date(lote.fecha_vencimiento), "dd/MM/yyyy", { locale: es })}
                    </p>
                    {diasHastaVencimiento !== null && (
                      <p className={`text-xs ${diasHastaVencimiento < 0 ? 'text-destructive' : diasHastaVencimiento <= config.dias_alerta_vencimiento ? 'text-orange-500' : 'text-green-600'}`}>
                        {diasHastaVencimiento < 0 
                          ? `Vencido hace ${Math.abs(diasHastaVencimiento)} días`
                          : diasHastaVencimiento === 0
                          ? 'Vence hoy'
                          : `Vence en ${diasHastaVencimiento} días`
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}

              {lote.precio_compra && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Precio de Compra</p>
                    <p className="font-semibold">${lote.precio_compra.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              )}
            </div>

            {lote.observaciones && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                <p className="text-sm">{lote.observaciones}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Información del Producto Asociado */}
          {producto && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Producto Asociado</h3>
              
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                {/* Imagen del producto */}
                <div className="relative w-full h-32 sm:h-40 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={producto.imagen_url || "/placeholder.svg"}
                    alt={producto.nombre}
                    fill
                    className="object-cover"
                  />
                  {!producto.activo && (
                    <Badge className="absolute top-2 right-2 text-xs bg-gray-500 text-white">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactivo
                    </Badge>
                  )}
                </div>

                {/* Info básica del producto */}
                <div>
                  <h4 className="text-base font-semibold mb-1">{producto.nombre}</h4>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="outline" className="text-xs">
                      Código: {producto.codigo}
                    </Badge>
                    {producto.categoria && (
                      <Badge variant="secondary" className="text-xs">
                        {producto.categoria.icono && `${producto.categoria.icono} `}
                        {producto.categoria.nombre}
                      </Badge>
                    )}
                  </div>
                  {producto.descripcion && (
                    <p className="text-xs text-muted-foreground">{producto.descripcion}</p>
                  )}
                </div>

                {/* Grid de información */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Stock Total</p>
                      <p className="font-semibold">{producto.stock_actual} {producto.unidad}</p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {producto.stock_minimo} {producto.unidad}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Precio Unitario</p>
                      <p className="font-semibold text-primary">
                        ${producto.precio_unitario.toLocaleString('es-CO')}
                      </p>
                      {producto.precio_mayorista && (
                        <p className="text-xs text-muted-foreground">
                          Mayorista: ${producto.precio_mayorista.toLocaleString('es-CO')}
                        </p>
                      )}
                    </div>
                  </div>

                  {producto.unidad_productiva && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Unidad Productiva</p>
                        <p className="font-semibold">{producto.unidad_productiva.nombre}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo de Medida</p>
                      <p className="font-semibold capitalize">{producto.tipo_medida}</p>
                    </div>
                  </div>
                </div>

                {producto.es_perecedero && (
                  <Alert className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-xs">
                      <span className="font-medium">Producto Perecedero</span>
                      {producto.dias_vencimiento && (
                        <span> - Días hasta vencimiento: {producto.dias_vencimiento}</span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Código de Barras */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Barcode className="h-5 w-5 text-primary" />
              Código de Barras
            </h3>
            
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  Escanea este código en el POS para agregar el producto de este lote al carrito
                </AlertDescription>
              </Alert>
              
              <div ref={barcodeRef} className="flex justify-center items-center bg-white p-4 rounded-lg">
                <BarcodeComponent 
                  value={lote.codigo_lote}
                  format="CODE128"
                  width={2}
                  height={80}
                  displayValue={true}
                  fontSize={14}
                  margin={10}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadBarcode}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Código de Barras
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Código: <span className="font-mono font-semibold">{lote.codigo_lote}</span>
              </p>
            </div>
          </div>

          {/* Información de Costos de Producción */}
          {lote.costos_produccion && lote.costos_produccion.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    💰 Costos de Producción
                  </h3>
                  {lote.estado === 'disponible' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditCostosOpen(true)}
                      className="h-8 text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar Costos
                    </Button>
                  )}
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  {lote.costos_produccion.map((costo: any) => (
                    <div key={costo.id} className="space-y-3">
                      {/* Resumen de costos */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Costo Total:</span>
                            <span className="text-lg font-bold text-primary">
                              ${costo.costo_total?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>Costo Unitario:</span>
                            <span className="font-semibold">
                              ${costo.costo_unitario?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>Cantidad Producida:</span>
                            <span className="font-semibold">
                              {costo.cantidad_producida} {producto?.unidad || 'unidades'}
                            </span>
                          </div>
                        </div>

                        {/* Desglose de costos */}
                        {costo.costo_materia_prima > 0 && (
                          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">Materia Prima:</span>
                            <span className="text-sm font-medium">
                              ${costo.costo_materia_prima.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {costo.costo_mano_obra > 0 && (
                          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">Mano de Obra:</span>
                            <span className="text-sm font-medium">
                              ${costo.costo_mano_obra.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {costo.costo_insumos > 0 && (
                          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">Insumos:</span>
                            <span className="text-sm font-medium">
                              ${costo.costo_insumos.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {costo.costo_energia > 0 && (
                          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">Energía:</span>
                            <span className="text-sm font-medium">
                              ${costo.costo_energia.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {costo.otros_costos > 0 && (
                          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">Otros Costos:</span>
                            <span className="text-sm font-medium">
                              ${costo.otros_costos.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>

                      {costo.observaciones && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                          <p className="text-sm">{costo.observaciones}</p>
                        </div>
                      )}

                      {costo.fecha_registro && (
                        <p className="text-xs text-muted-foreground">
                          Registrado: {format(new Date(costo.fecha_registro), "dd/MM/yyyy", { locale: es })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Si no hay costos, mostrar mensaje y botón para agregar
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    💰 Costos de Producción
                  </h3>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>No se han registrado costos para este lote</span>
                    {lote.estado === 'disponible' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsEditCostosOpen(true)}
                        className="h-8 text-xs ml-2"
                      >
                        Agregar Costos
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}

          {/* Información del usuario que creó el lote */}
          {lote.usuario && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4 flex-shrink-0" />
                <span>
                  Creado por: <span className="font-medium text-foreground">{lote.usuario.nombre} {lote.usuario.apellido}</span>
                </span>
              </div>
            </>
          )}
        </div>

        <Separator className="flex-shrink-0" />

        {/* Action Button - Fixed at bottom */}
        <div className="flex-shrink-0">
          <Button className="w-full text-xs sm:text-sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>

      {/* Modal de Edición de Costos */}
      <EditCostosLoteModal
        loteId={loteId}
        isOpen={isEditCostosOpen}
        onClose={() => setIsEditCostosOpen(false)}
        onSuccess={() => {
          setIsEditCostosOpen(false)
          refetch() // Recargar datos del lote
        }}
      />
    </Dialog>
  )
}
