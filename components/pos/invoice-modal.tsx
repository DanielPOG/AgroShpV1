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
    subtotal: number
    tax: number
    paymentMethod: string
    change?: number
  }
  onComplete: (data: {
    requiere_factura: boolean
    factura_generada: boolean
    factura_enviada_email: boolean
    email_destino?: string
  }) => Promise<void> | void  // ✨ Puede retornar Promise para async
}

export function InvoiceModal({ open, onClose, saleData, onComplete }: InvoiceModalProps) {
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

    setCompleted(true)

    // Esperar a que se complete la venta antes de cerrar
    try {
      await onComplete({
        requiere_factura: true,
        factura_generada: generateInvoice,
        factura_enviada_email: sendEmail,
        email_destino: sendEmail ? email : undefined,
      })
      
      setProcessing(false)

      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (error) {
      setProcessing(false)
      setCompleted(false)
      console.error('Error al completar venta:', error)
    }
  }

  const handleSkip = async () => {
    setProcessing(true)
    
    // Usuario no quiere factura - esperar a que se complete la venta
    try {
      await onComplete({
        requiere_factura: false,
        factura_generada: false,
        factura_enviada_email: false,
      })
      
      // Esperar un momento para que se procese
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setProcessing(false)
      handleClose()
    } catch (error) {
      setProcessing(false)
      // Si hay error, mantener el modal abierto
      console.error('Error al omitir facturación:', error)
    }
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

  const handleDownload = async () => {
    console.log("[v0] Downloading invoice PDF:", invoiceNumber)
    
    // Importar jsPDF dinámicamente
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    
    const doc = new jsPDF()
    
    // Colores
    const primaryColor = [34, 139, 34] // Verde
    const secondaryColor = [100, 100, 100] // Gris
    const textColor = [50, 50, 50]
    
    // Header con logo y datos de la empresa
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 40, 'F')
    
    // Nombre de la empresa
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('AGROSHOP', 15, 20)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Gestión Agrícola', 15, 28)
    doc.text('NIT: 900.123.456-7', 15, 34)
    
    // Información de contacto
    doc.setFontSize(8)
    doc.text('Tel: +57 300 123 4567 | agroshop@example.com', 120, 28, { align: 'left' })
    doc.text('Dirección: Calle 123 #45-67, Ciudad', 120, 34, { align: 'left' })
    
    // Título de factura
    doc.setFillColor(240, 240, 240)
    doc.rect(0, 45, 210, 15, 'F')
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURA DE VENTA', 105, 55, { align: 'center' })
    
    // Información de la factura
    let yPos = 70
    
    doc.setFillColor(250, 250, 250)
    doc.rect(15, yPos - 5, 85, 25, 'F')
    doc.rect(110, yPos - 5, 85, 25, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('No. Factura:', 20, yPos)
    doc.text('Fecha:', 20, yPos + 7)
    doc.text('Método de Pago:', 20, yPos + 14)
    
    doc.setFont('helvetica', 'normal')
    doc.text(invoiceNumber, 55, yPos)
    doc.text(currentDate, 55, yPos + 7)
    doc.text(saleData.paymentMethod.toUpperCase(), 55, yPos + 14)
    
    // Información del cliente (si existe)
    if (customerName || customerId) {
      doc.setFont('helvetica', 'bold')
      doc.text('Cliente:', 115, yPos)
      if (customerId) {
        doc.text('Cédula/NIT:', 115, yPos + 7)
      }
      
      doc.setFont('helvetica', 'normal')
      doc.text(customerName || 'Cliente General', 145, yPos)
      if (customerId) {
        doc.text(customerId, 145, yPos + 7)
      }
    } else {
      doc.setFont('helvetica', 'bold')
      doc.text('Cliente:', 115, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text('Cliente General', 145, yPos)
    }
    
    // Tabla de productos
    yPos = 105
    
    // Header de tabla
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(15, yPos, 180, 10, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Producto', 20, yPos + 7)
    doc.text('Cant.', 120, yPos + 7, { align: 'center' })
    doc.text('P. Unit.', 150, yPos + 7, { align: 'right' })
    doc.text('Total', 185, yPos + 7, { align: 'right' })
    
    // Productos
    yPos += 15
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    saleData.items.forEach((item, index) => {
      // Fondo alternado
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(15, yPos - 5, 180, 8, 'F')
      }
      
      // ✨ NUEVO: Detectar si es producto ficticio (nombre original guardado en item)
      // Los productos ficticios tienen un flag o podemos detectarlos por alguna característica
      const nombreProducto = item.name
      
      doc.text(nombreProducto, 20, yPos)
      doc.text(item.quantity.toString(), 120, yPos, { align: 'center' })
      doc.text(`$${item.price.toLocaleString('es-CO')}`, 150, yPos, { align: 'right' })
      doc.text(`$${(item.price * item.quantity).toLocaleString('es-CO')}`, 185, yPos, { align: 'right' })
      
      yPos += 8
    })
    
    // Separador
    yPos += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(15, yPos, 195, yPos)
    
    // Totales
    yPos += 10
    const subtotal = saleData.total / 1.19 // Calcular subtotal sin IVA
    const iva = saleData.total - subtotal
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', 140, yPos)
    doc.text(`$${subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, 185, yPos, { align: 'right' })
    
    yPos += 7
    doc.text('IVA (19%):', 140, yPos)
    doc.text(`$${iva.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, 185, yPos, { align: 'right' })
    
    yPos += 10
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(130, yPos - 7, 65, 12, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', 140, yPos + 2)
    doc.text(`$${saleData.total.toLocaleString('es-CO')}`, 185, yPos + 2, { align: 'right' })
    
    // Cambio si existe
    if (saleData.change && saleData.change > 0) {
      yPos += 12
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Cambio Entregado:', 140, yPos)
      doc.text(`$${saleData.change.toLocaleString('es-CO')}`, 185, yPos, { align: 'right' })
    }
    
    // Footer
    yPos = 270
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text('Gracias por su compra', 105, yPos, { align: 'center' })
    doc.text('Esta es una representación impresa de su factura electrónica', 105, yPos + 5, { align: 'center' })
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.line(15, yPos + 10, 195, yPos + 10)
    
    // Guardar PDF
    doc.save(`Factura_${invoiceNumber}.pdf`)
  }

  if (completed) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && handleClose()} modal>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
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
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()} modal>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
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
          <Button 
            variant="outline" 
            onClick={handleSkip} 
            className="flex-1 bg-transparent" 
            disabled={processing}
          >
            Omitir
          </Button>
          <Button 
            onClick={handleComplete} 
            className="flex-1" 
            disabled={
              processing || 
              (sendEmail && !email) || 
              (!generateInvoice && !sendEmail) // Debe seleccionar al menos una opción
            }
          >
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
        
        {/* Mensaje de ayuda */}
        {!generateInvoice && !sendEmail && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            ⚠️ Debes seleccionar al menos una opción o presionar "Omitir" si no requiere factura
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
