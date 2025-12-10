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
  onComplete: () => void
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

export function CheckoutModal({ open, onClose, items, onComplete }: CheckoutModalProps) {
  const { toast } = useToast()
  const { metodos: paymentMethods, isLoading: loadingMethods } = usePaymentMethods()
  const { createSale, isCreating } = useSalesMutations()
  const { hasActiveSession, session, loading: loadingSession } = useCashSession()
  
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null)
  const [amountPaid, setAmountPaid] = useState("")
  const [mixtoPayments, setMixtoPayments] = useState<{ metodo_pago_id: number; monto: number }[]>([])
  const [showInvoice, setShowInvoice] = useState(false)
  const [saleData, setSaleData] = useState<any>(null)

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

  // Calcular totales
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const tax = subtotal * 0.19
  const total = subtotal + tax

  // Obtener método seleccionado
  const selectedMethod = paymentMethods?.find(m => m.id === selectedMethodId)

  // Calcular cambio para efectivo
  const change = selectedMethod?.nombre.toLowerCase() === "efectivo" 
    ? Math.max(0, Number.parseFloat(amountPaid || "0") - total) 
    : 0

  // Validar si se puede completar la venta
  const canComplete = () => {
    if (!selectedMethodId) return false
    
    if (selectedMethod?.nombre.toLowerCase() === "efectivo") {
      return Number.parseFloat(amountPaid || "0") >= total
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
      if (selectedMethod?.nombre.toLowerCase() === "efectivo") {
        pagos = [{
          metodo_pago_id: selectedMethodId!,
          monto: total,
          referencia: `Efectivo - Recibido: $${Number.parseFloat(amountPaid).toLocaleString("es-CO")}`,
        }]
      } else {
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
        paymentMethod: selectedMethod?.nombre,
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
    onComplete()
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

              {selectedMethod && !selectedMethod.nombre.toLowerCase().includes("efectivo") && (
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
