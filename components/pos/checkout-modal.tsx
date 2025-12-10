"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, Smartphone, DollarSign, ArrowLeftRight, CheckCircle2, Loader2 } from "lucide-react"
import { InvoiceModal } from "./invoice-modal"
import { useSalesMutations, usePaymentMethods } from "@/hooks/use-sales"
import { useToast } from "@/hooks/use-toast"
import { useCashSession } from "@/hooks/use-cash-session"

interface CartItem {
  id: number
  nombre: string
  precio: number
  cantidad: number
  unidad: string
  stock: number
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  items: CartItem[]
  clearCart: () => void
  onSaleComplete?: () => void // ✨ NUEVO: Callback para refrescar datos después de venta
}

export interface PaymentData {
  method: "efectivo" | "nequi" | "tarjeta" | "mixto"
  amountPaid?: number
  change?: number
  mixtoBreakdown?: {
    efectivo?: number
    nequi?: number
    tarjeta?: number
  }
}

export function CheckoutModal({ open, onClose, items, clearCart, onSaleComplete }: CheckoutModalProps) {
  const { toast } = useToast()
  const { metodos: paymentMethods, isLoading: loadingMethods } = usePaymentMethods()
  const { createSale, isCreating } = useSalesMutations()
  const { hasActiveSession, session, loading: loadingSession } = useCashSession()
  
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null)
  const [amountPaid, setAmountPaid] = useState("")
  const [mixtoPayments, setMixtoPayments] = useState<{ metodo_pago_id: number; monto: number }[]>([])
  const [showInvoice, setShowInvoice] = useState(false)
  const [saleData, setSaleData] = useState<any>(null)
  
  // ✨ NUEVO: Estado para validación de cambio
  const [efectivoDisponible, setEfectivoDisponible] = useState<number>(0)
  const [validandoCambio, setValidandoCambio] = useState(false)
  const [alertaCambio, setAlertaCambio] = useState<{
    tipo: 'error' | 'warning' | 'info'
    mensaje: string
  } | null>(null)

  // Calcular totales (DEBE estar antes de los useEffect que lo usan)
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const tax = subtotal * 0.19
  const total = subtotal + tax

  // Obtener método seleccionado (DEBE estar antes de los useEffect que lo usan)
  const selectedMethod = paymentMethods?.find(m => m.id === selectedMethodId)

  // Calcular cambio para efectivo
  const change = selectedMethod?.nombre.toLowerCase() === "efectivo" 
    ? Math.max(0, Number.parseFloat(amountPaid || "0") - total) 
    : 0

  // ✅ NUEVO: Validar sesión de caja antes de mostrar modal
  useEffect(() => {
    // Solo validar cuando el modal se abre por primera vez
    if (!open) return
    
    if (!loadingSession && !hasActiveSession) {
      console.log('❌ Validación sesión:', { session, hasActiveSession, loadingSession })
      toast({
        title: "⚠️ Caja cerrada",
        description: "Debes abrir una sesión de caja antes de realizar ventas",
        variant: "destructive",
      })
      onClose()
    } else if (!loadingSession && hasActiveSession) {
      console.log('✅ Sesión validada:', { session: session?.codigo_sesion })
    }
  }, [open, loadingSession, hasActiveSession])

  // ✨ NUEVO: Obtener efectivo disponible cuando se abre el modal
  useEffect(() => {
    if (open && !loadingSession && hasActiveSession) {
      fetchEfectivoDisponible()
    }
  }, [open, loadingSession, hasActiveSession])

  // ✨ NUEVO: Función para obtener efectivo disponible
  const fetchEfectivoDisponible = async () => {
    try {
      const response = await fetch('/api/caja/validar-cambio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoVenta: total, montoPagado: total })
      })
      
      if (response.ok) {
        const data = await response.json()
        setEfectivoDisponible(data.efectivoDisponible || 0)
        console.log('💵 Efectivo disponible:', data.efectivoDisponible)
      }
    } catch (error) {
      console.error('Error al obtener efectivo disponible:', error)
    }
  }

  // ✨ NUEVO: Validar cambio cuando el usuario ingresa monto
  useEffect(() => {
    if (selectedMethod?.nombre.toLowerCase() === "efectivo" && amountPaid) {
      const montoPagado = Number.parseFloat(amountPaid || "0")
      const cambioRequerido = montoPagado - total
      
      if (cambioRequerido > 0) {
        // Requiere cambio
        if (efectivoDisponible < cambioRequerido) {
          setAlertaCambio({
            tipo: 'error',
            mensaje: `⚠️ Efectivo insuficiente para dar cambio. Disponible: $${efectivoDisponible.toLocaleString("es-CO")}, Necesario: $${cambioRequerido.toLocaleString("es-CO")}`
          })
        } else if (efectivoDisponible < cambioRequerido * 1.5) {
          // Advertencia si queda poco efectivo después de dar cambio
          setAlertaCambio({
            tipo: 'warning',
            mensaje: `⚠️ El efectivo en caja quedará bajo después de dar cambio ($${(efectivoDisponible - cambioRequerido).toLocaleString("es-CO")})`
          })
        } else {
          setAlertaCambio(null)
        }
      } else {
        setAlertaCambio(null)
      }
    } else {
      setAlertaCambio(null)
    }
  }, [amountPaid, selectedMethod, total, efectivoDisponible])

  // Validar si se puede completar la venta
  const canComplete = () => {
    if (!selectedMethodId) return false
    
    // Pago mixto
    if (selectedMethodId === -1) {
      const totalPagado = mixtoPayments.reduce((sum, p) => sum + p.monto, 0)
      return totalPagado >= total && mixtoPayments.length > 0
    }
    
    if (selectedMethod?.nombre.toLowerCase() === "efectivo") {
      const montoPagado = Number.parseFloat(amountPaid || "0")
      const cambioRequerido = montoPagado - total
      
      // Debe pagar al menos el total
      if (montoPagado < total) return false
      
      // ✨ NUEVO: No permitir si hay error de cambio insuficiente
      if (cambioRequerido > 0 && alertaCambio?.tipo === 'error') {
        return false
      }
      
      return true
    }
    
    // Para otros métodos de pago (tarjeta, nequi, etc.)
    return true
  }

  // Resetear al abrir/cerrar
  useEffect(() => {
    if (open && paymentMethods && paymentMethods.length > 0 && !selectedMethodId) {
      // Seleccionar "Efectivo" por defecto si existe
      const efectivo = paymentMethods.find(m => m.nombre.toLowerCase() === "efectivo")
      if (efectivo) {
        setSelectedMethodId(efectivo.id)
      } else {
        setSelectedMethodId(paymentMethods[0].id)
      }
    }
  }, [open, paymentMethods, selectedMethodId])

  const handleComplete = async () => {
    if (!canComplete()) return

    try {
      // Preparar datos de venta
      const saleItems = items.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
      }))

      // Preparar pagos
      let pagos = []
      
      // Pago mixto
      if (selectedMethodId === -1) {
        pagos = mixtoPayments.map(payment => ({
          metodo_pago_id: payment.metodo_pago_id,
          monto: payment.monto,
          referencia: `Pago mixto - ${paymentMethods?.find(m => m.id === payment.metodo_pago_id)?.nombre}`,
        }))
      }
      // Pago en efectivo
      else if (selectedMethod?.nombre.toLowerCase() === "efectivo") {
        pagos = [{
          metodo_pago_id: selectedMethodId!,
          monto: total,
          referencia: `Efectivo - Recibido: $${Number.parseFloat(amountPaid).toLocaleString("es-CO")}`,
        }]
      }
      // Otros métodos (tarjeta, nequi, etc.)
      else {
        pagos = [{
          metodo_pago_id: selectedMethodId!,
          monto: total,
        }]
      }

      // Crear venta en la base de datos
      const venta = await createSale({
        items: saleItems,
        pagos,
        requiere_factura: false,
      })

      // Preparar método de pago para mostrar en factura
      let paymentMethodDisplay = selectedMethod?.nombre
      if (selectedMethodId === -1) {
        // Pago mixto: mostrar desglose
        const metodosUsados = mixtoPayments.map(p => {
          const metodo = paymentMethods?.find(m => m.id === p.metodo_pago_id)
          return `${metodo?.nombre}: $${p.monto.toLocaleString("es-CO")}`
        }).join(', ')
        paymentMethodDisplay = `Mixto (${metodosUsados})`
      }

      // Preparar datos para la factura
      setSaleData({
        id: venta.id,
        codigo_venta: venta.codigo_venta,
        items: items.map(item => ({
          name: item.nombre,
          quantity: item.cantidad,
          price: item.precio,
        })),
        total,
        subtotal,
        tax,
        paymentMethod: paymentMethodDisplay,
        change: change > 0 ? change : undefined,
        fecha: venta.fecha_venta,
      })
      
      setShowInvoice(true)
    } catch (error: any) {
      console.error("Error al completar venta:", error)
      toast({
        title: "Error al Procesar Venta",
        description: error.message || "No se pudo completar la venta. Intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleInvoiceClose = () => {
    setShowInvoice(false)
    
    // Limpiar carrito
    clearCart()
    
    // ✨ NUEVO: Notificar al componente padre que se completó la venta
    if (onSaleComplete) {
      onSaleComplete()
    }
    
    handleClose()
  }

  const handleClose = () => {
    setSelectedMethodId(null)
    setAmountPaid("")
    setMixtoPayments([])
    onClose()
  }

  return (
    <>
      <Dialog open={open && !showInvoice} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Finalizar Venta</DialogTitle>
            <DialogDescription>Selecciona el método de pago</DialogDescription>
          </DialogHeader>

          <Card className="bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total a Pagar</span>
                <span className="text-3xl font-bold text-primary">${total.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span>${tax.toLocaleString("es-CO")}</span>
              </div>
              {/* ✨ NUEVO: Mostrar efectivo disponible */}
              {selectedMethod?.nombre.toLowerCase() === "efectivo" && (
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                  <span className="text-muted-foreground">💵 Efectivo en Caja</span>
                  <span className="font-semibold text-green-600">${efectivoDisponible.toLocaleString("es-CO")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {loadingMethods ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <RadioGroup 
                value={selectedMethodId?.toString()} 
                onValueChange={(value) => setSelectedMethodId(Number(value))}
              >
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods?.map((method) => {
                    const isSelected = selectedMethodId === method.id
                    const icon = method.nombre.toLowerCase().includes("efectivo") ? (
                      <DollarSign className="h-8 w-8" />
                    ) : method.nombre.toLowerCase().includes("nequi") ? (
                      <Smartphone className="h-8 w-8" />
                    ) : method.nombre.toLowerCase().includes("tarjeta") ? (
                      <CreditCard className="h-8 w-8" />
                    ) : (
                      <ArrowLeftRight className="h-8 w-8" />
                    )

                    return (
                      <Label
                        key={method.id}
                        htmlFor={`method-${method.id}`}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem 
                          value={method.id.toString()} 
                          id={`method-${method.id}`} 
                          className="sr-only" 
                        />
                        {icon}
                        <span className="font-semibold text-center">{method.nombre}</span>
                      </Label>
                    )
                  })}
                  
                  {/* ✨ NUEVO: Botón Pago Mixto */}
                  <Label
                    htmlFor="method-mixto"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      selectedMethodId === -1 ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setSelectedMethodId(-1)}
                  >
                    <ArrowLeftRight className="h-8 w-8" />
                    <span className="font-semibold text-center">Pago Mixto</span>
                    <span className="text-xs text-muted-foreground">Efectivo + Digital</span>
                  </Label>
                </div>
              </RadioGroup>

              {selectedMethod?.nombre.toLowerCase() === "efectivo" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto Recibido</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="text-lg h-12"
                      autoFocus
                    />
                  </div>
                  
                  {/* ✨ NUEVO: Alerta de cambio */}
                  {alertaCambio && (
                    <Card className={`${
                      alertaCambio.tipo === 'error' ? 'bg-destructive/10 border-destructive' :
                      alertaCambio.tipo === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                      'bg-blue-500/10 border-blue-500'
                    }`}>
                      <CardContent className="p-3">
                        <p className={`text-sm font-medium ${
                          alertaCambio.tipo === 'error' ? 'text-destructive' :
                          alertaCambio.tipo === 'warning' ? 'text-yellow-700' :
                          'text-blue-700'
                        }`}>
                          {alertaCambio.mensaje}
                        </p>
                        {alertaCambio.tipo === 'error' && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground font-semibold">Sugerencias:</p>
                            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                              <li>Solicitar billete más pequeño</li>
                              <li>Usar pago exacto (${total.toLocaleString("es-CO")})</li>
                              <li>Cambiar a tarjeta o Nequi</li>
                              <li>Usar pago mixto (efectivo + digital)</li>
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {Number.parseFloat(amountPaid || "0") > 0 && (
                    <Card className={change >= 0 ? "bg-primary/5" : "bg-destructive/5"}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Cambio</span>
                          <span className={`text-2xl font-bold ${change >= 0 ? "text-primary" : "text-destructive"}`}>
                            ${Math.abs(change).toLocaleString("es-CO")}
                          </span>
                        </div>
                        {change < 0 && (
                          <p className="text-xs text-destructive mt-1">
                            Faltan ${Math.abs(change).toLocaleString("es-CO")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* ✨ NUEVO: Sección de Pago Mixto */}
              {selectedMethodId === -1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      💰 Pago Mixto - Divide el pago entre métodos
                    </p>
                    <p className="text-xs text-blue-600">
                      Total a pagar: ${total.toLocaleString("es-CO")}
                    </p>
                  </div>

                  {/* Efectivo */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mixto-efectivo" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Efectivo
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Disponible: ${efectivoDisponible.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <Input
                      id="mixto-efectivo"
                      type="number"
                      placeholder="0"
                      value={mixtoPayments.find(p => paymentMethods?.find(m => m.id === p.metodo_pago_id)?.nombre.toLowerCase().includes('efectivo'))?.monto || ''}
                      onChange={(e) => {
                        const efectivoMethod = paymentMethods?.find(m => m.nombre.toLowerCase().includes('efectivo'))
                        if (!efectivoMethod) return
                        
                        const value = Number.parseFloat(e.target.value) || 0
                        const newPayments = mixtoPayments.filter(p => p.metodo_pago_id !== efectivoMethod.id)
                        if (value > 0) {
                          newPayments.push({ metodo_pago_id: efectivoMethod.id, monto: value })
                        }
                        setMixtoPayments(newPayments)
                      }}
                      className="h-10"
                    />
                  </div>

                  {/* Nequi */}
                  <div className="space-y-2">
                    <Label htmlFor="mixto-nequi" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Nequi
                    </Label>
                    <Input
                      id="mixto-nequi"
                      type="number"
                      placeholder="0"
                      value={mixtoPayments.find(p => paymentMethods?.find(m => m.id === p.metodo_pago_id)?.nombre.toLowerCase().includes('nequi'))?.monto || ''}
                      onChange={(e) => {
                        const nequiMethod = paymentMethods?.find(m => m.nombre.toLowerCase().includes('nequi'))
                        if (!nequiMethod) return
                        
                        const value = Number.parseFloat(e.target.value) || 0
                        const newPayments = mixtoPayments.filter(p => p.metodo_pago_id !== nequiMethod.id)
                        if (value > 0) {
                          newPayments.push({ metodo_pago_id: nequiMethod.id, monto: value })
                        }
                        setMixtoPayments(newPayments)
                      }}
                      className="h-10"
                    />
                  </div>

                  {/* Tarjeta */}
                  <div className="space-y-2">
                    <Label htmlFor="mixto-tarjeta" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Tarjeta
                    </Label>
                    <Input
                      id="mixto-tarjeta"
                      type="number"
                      placeholder="0"
                      value={mixtoPayments.find(p => paymentMethods?.find(m => m.id === p.metodo_pago_id)?.nombre.toLowerCase().includes('tarjeta'))?.monto || ''}
                      onChange={(e) => {
                        const tarjetaMethod = paymentMethods?.find(m => m.nombre.toLowerCase().includes('tarjeta'))
                        if (!tarjetaMethod) return
                        
                        const value = Number.parseFloat(e.target.value) || 0
                        const newPayments = mixtoPayments.filter(p => p.metodo_pago_id !== tarjetaMethod.id)
                        if (value > 0) {
                          newPayments.push({ metodo_pago_id: tarjetaMethod.id, monto: value })
                        }
                        setMixtoPayments(newPayments)
                      }}
                      className="h-10"
                    />
                  </div>

                  {/* Resumen de pago mixto */}
                  <Card className={mixtoPayments.reduce((sum, p) => sum + p.monto, 0) >= total ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Pagado:</span>
                        <span className="font-semibold">
                          ${mixtoPayments.reduce((sum, p) => sum + p.monto, 0).toLocaleString("es-CO")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Falta:</span>
                        <span className={`font-semibold ${
                          mixtoPayments.reduce((sum, p) => sum + p.monto, 0) >= total 
                            ? "text-green-600" 
                            : "text-red-600"
                        }`}>
                          ${Math.max(0, total - mixtoPayments.reduce((sum, p) => sum + p.monto, 0)).toLocaleString("es-CO")}
                        </span>
                      </div>
                      {mixtoPayments.reduce((sum, p) => sum + p.monto, 0) >= total && (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Pago completo
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedMethod && !selectedMethod.nombre.toLowerCase().includes("efectivo") && selectedMethodId !== -1 && (
                <Card className="bg-primary/5">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Procesa el pago con {selectedMethod.nombre}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1 bg-transparent"
              disabled={isCreating}
            >
              Cancelar (Esc)
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={!canComplete() || isCreating} 
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completar Venta
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {saleData && <InvoiceModal open={showInvoice} onClose={handleInvoiceClose} saleData={saleData} />}
    </>
  )
}
