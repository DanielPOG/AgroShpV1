"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, Smartphone, DollarSign, ArrowLeftRight, CheckCircle2 } from "lucide-react"
import { InvoiceModal } from "./invoice-modal"

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  total: number
  items: Array<{ name: string; quantity: number; price: number }>
  onComplete: (paymentData: PaymentData) => void
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

export function CheckoutModal({ open, onClose, total, items, onComplete }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "nequi" | "tarjeta" | "mixto">("efectivo")
  const [amountPaid, setAmountPaid] = useState("")
  const [mixtoEffective, setMixtoEffective] = useState("")
  const [mixtoNequi, setMixtoNequi] = useState("")
  const [mixtoCard, setMixtoCard] = useState("")
  const [showInvoice, setShowInvoice] = useState(false)
  const [saleData, setSaleData] = useState<any>(null)

  const change = paymentMethod === "efectivo" ? Math.max(0, Number.parseFloat(amountPaid || "0") - total) : 0

  const mixtoTotal =
    Number.parseFloat(mixtoEffective || "0") +
    Number.parseFloat(mixtoNequi || "0") +
    Number.parseFloat(mixtoCard || "0")
  const mixtoRemaining = Math.max(0, total - mixtoTotal)

  const canComplete = () => {
    if (paymentMethod === "efectivo") {
      return Number.parseFloat(amountPaid || "0") >= total
    }
    if (paymentMethod === "mixto") {
      return mixtoTotal >= total
    }
    return true
  }

  const handleComplete = () => {
    const paymentData: PaymentData = {
      method: paymentMethod,
    }

    if (paymentMethod === "efectivo") {
      paymentData.amountPaid = Number.parseFloat(amountPaid)
      paymentData.change = change
    }

    if (paymentMethod === "mixto") {
      paymentData.mixtoBreakdown = {
        efectivo: Number.parseFloat(mixtoEffective || "0"),
        nequi: Number.parseFloat(mixtoNequi || "0"),
        tarjeta: Number.parseFloat(mixtoCard || "0"),
      }
    }

    setSaleData({
      items,
      total,
      paymentMethod,
      change: change > 0 ? change : undefined,
    })
    setShowInvoice(true)
  }

  const handleInvoiceClose = () => {
    setShowInvoice(false)
    onComplete(saleData)
    handleClose()
  }

  const handleClose = () => {
    setPaymentMethod("efectivo")
    setAmountPaid("")
    setMixtoEffective("")
    setMixtoNequi("")
    setMixtoCard("")
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
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-6">
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="grid grid-cols-2 gap-3">
                <Label
                  htmlFor="efectivo"
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    paymentMethod === "efectivo" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="efectivo" id="efectivo" className="sr-only" />
                  <DollarSign className="h-8 w-8" />
                  <span className="font-semibold">Efectivo</span>
                </Label>

                <Label
                  htmlFor="nequi"
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    paymentMethod === "nequi" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="nequi" id="nequi" className="sr-only" />
                  <Smartphone className="h-8 w-8" />
                  <span className="font-semibold">Nequi</span>
                </Label>

                <Label
                  htmlFor="tarjeta"
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    paymentMethod === "tarjeta" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="tarjeta" id="tarjeta" className="sr-only" />
                  <CreditCard className="h-8 w-8" />
                  <span className="font-semibold">Tarjeta</span>
                </Label>

                <Label
                  htmlFor="mixto"
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    paymentMethod === "mixto" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="mixto" id="mixto" className="sr-only" />
                  <ArrowLeftRight className="h-8 w-8" />
                  <span className="font-semibold">Mixto</span>
                </Label>
              </div>
            </RadioGroup>

            {paymentMethod === "efectivo" && (
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

            {paymentMethod === "mixto" && (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="mixto-efectivo">Efectivo</Label>
                    <Input
                      id="mixto-efectivo"
                      type="number"
                      placeholder="0"
                      value={mixtoEffective}
                      onChange={(e) => setMixtoEffective(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mixto-nequi">Nequi</Label>
                    <Input
                      id="mixto-nequi"
                      type="number"
                      placeholder="0"
                      value={mixtoNequi}
                      onChange={(e) => setMixtoNequi(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mixto-tarjeta">Tarjeta</Label>
                    <Input
                      id="mixto-tarjeta"
                      type="number"
                      placeholder="0"
                      value={mixtoCard}
                      onChange={(e) => setMixtoCard(e.target.value)}
                    />
                  </div>
                </div>
                <Card className={mixtoRemaining === 0 ? "bg-primary/5" : "bg-orange-accent/5"}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {mixtoRemaining === 0 ? "Total Cubierto" : "Faltante"}
                      </span>
                      <span
                        className={`text-2xl font-bold ${mixtoRemaining === 0 ? "text-primary" : "text-orange-accent"}`}
                      >
                        ${mixtoRemaining.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {(paymentMethod === "nequi" || paymentMethod === "tarjeta") && (
              <Card className="bg-primary/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Procesa el pago con {paymentMethod === "nequi" ? "Nequi" : "la terminal de tarjeta"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancelar (Esc)
            </Button>
            <Button onClick={handleComplete} disabled={!canComplete()} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completar Venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {saleData && <InvoiceModal open={showInvoice} onClose={handleInvoiceClose} saleData={saleData} />}
    </>
  )
}
