"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Printer, Download, CheckCircle2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface InvoiceModalProps {
  open: boolean
  onClose: () => void
  saleData: {
    items: Array<{ name: string; quantity: number; price: number }>
    total: number
    paymentMethod: string
    change?: number
  }
}

export function InvoiceModal({ open, onClose, saleData }: InvoiceModalProps) {
  const [generateInvoice, setGenerateInvoice] = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [email, setEmail] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [processing, setProcessing] = useState(false)
  const [completed, setCompleted] = useState(false)

  const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`
  const currentDate = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const handleComplete = async () => {
    setProcessing(true)

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (generateInvoice) {
      console.log("[v0] Generating invoice:", invoiceNumber)
    }

    if (sendEmail && email) {
      console.log("[v0] Sending invoice to:", email)
    }

    setProcessing(false)
    setCompleted(true)

    setTimeout(() => {
      handleClose()
    }, 2000)
  }

  const handleClose = () => {
    setGenerateInvoice(true)
    setSendEmail(false)
    setEmail("")
    setCustomerName("")
    setCustomerId("")
    setProcessing(false)
    setCompleted(false)
    onClose()
  }

  const handlePrint = () => {
    console.log("[v0] Printing invoice:", invoiceNumber)
    window.print()
  }

  const handleDownload = () => {
    console.log("[v0] Downloading invoice PDF:", invoiceNumber)
  }

  if (completed) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8 space-y-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-scale-in">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Venta Finalizada</h3>
            <p className="text-muted-foreground">
              {generateInvoice && "Factura generada exitosamente"}
              {sendEmail && email && (
                <>
                  <br />
                  Enviada a: {email}
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Facturación
          </DialogTitle>
          <DialogDescription>Genera la factura y envíala al cliente</DialogDescription>
        </DialogHeader>

        <Card className="bg-secondary/50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">No. Factura:</span>
                <span className="font-mono font-semibold">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">{currentDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Método de Pago:</span>
                <span className="font-medium capitalize">{saleData.paymentMethod}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="generate-invoice"
              checked={generateInvoice}
              onCheckedChange={(checked) => setGenerateInvoice(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="generate-invoice" className="text-base font-semibold cursor-pointer">
                Generar Factura
              </Label>
              <p className="text-sm text-muted-foreground">Crear documento de factura para esta venta</p>
            </div>
          </div>

          {generateInvoice && (
            <div className="ml-6 space-y-4 p-4 rounded-lg bg-secondary/30">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Nombre del Cliente (Opcional)</Label>
                <Input
                  id="customer-name"
                  placeholder="Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-id">Cédula/NIT (Opcional)</Label>
                <Input
                  id="customer-id"
                  placeholder="1234567890"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 bg-transparent">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="send-email" className="text-base font-semibold cursor-pointer">
                Enviar por Correo
              </Label>
              <p className="text-sm text-muted-foreground">Enviar factura al correo electrónico del cliente</p>
            </div>
          </div>

          {sendEmail && (
            <div className="ml-6 space-y-2 p-4 rounded-lg bg-secondary/30">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={sendEmail}
              />
            </div>
          )}
        </div>

        <Separator />

        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Resumen de Venta</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {saleData.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">${(item.price * item.quantity).toLocaleString("es-CO")}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">${saleData.total.toLocaleString("es-CO")}</span>
              </div>
              {saleData.change && saleData.change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cambio:</span>
                  <span className="font-medium">${saleData.change.toLocaleString("es-CO")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent" disabled={processing}>
            Omitir
          </Button>
          <Button onClick={handleComplete} className="flex-1" disabled={processing || (sendEmail && !email)}>
            {processing ? (
              <>Procesando...</>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
