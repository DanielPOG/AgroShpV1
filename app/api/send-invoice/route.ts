import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { jsPDF } from "jspdf"
import nodemailer from "nodemailer"
import { getConfigValue } from "@/lib/constants"

const resend = new Resend(process.env.RESEND_API_KEY)

// Configurar transporter de Gmail como fallback
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ''), // Remover espacios
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      saleData, 
      invoiceNumber, 
      customerName, 
      customerId,
      config 
    } = body

    console.log('📧 [Send Invoice API] Datos recibidos:', {
      email,
      invoiceNumber,
      customerName,
      paymentMethod: saleData?.paymentMethod,
      itemsCount: saleData?.items?.length
    })

    // Validaciones
    if (!email) {
      return NextResponse.json(
        { success: false, error: "El correo electrónico es requerido" },
        { status: 400 }
      )
    }

    if (!saleData || !saleData.items || saleData.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay datos de venta para generar la factura" },
        { status: 400 }
      )
    }

    // Obtener configuración actual de IVA desde la base de datos
    let ivaPorcentaje: number
    try {
      ivaPorcentaje = await getConfigValue('iva_porcentaje', 19) as number
      console.log('💰 IVA obtenido desde BD:', ivaPorcentaje + '%')
    } catch (dbError: any) {
      console.error('❌ Error al obtener IVA de BD, usando 19% por defecto:', dbError)
      ivaPorcentaje = 19
    }

    // Recalcular totales con la configuración actual de la BD
    const subtotal = saleData.items.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    )
    const ivaDecimal = ivaPorcentaje / 100
    const iva = subtotal * ivaDecimal
    const total = subtotal + iva

    // Actualizar saleData con valores recalculados
    saleData.subtotal = subtotal
    saleData.tax = iva
    saleData.total = total

    console.log('💰 Totales recalculados desde BD:', {
      subtotal,
      iva: `${ivaPorcentaje}% = $${iva}`,
      total
    })

    // Generar PDF en el servidor
    const pdfBuffer = await generateInvoicePDF({
      saleData,
      invoiceNumber,
      customerName,
      customerId,
      config: {
        iva_porcentaje: ivaPorcentaje
      }
    })

    console.log('📄 PDF generado, tamaño:', pdfBuffer.length, 'bytes')

    // Intentar enviar con Resend primero
    let emailSent = false
    let emailId = null
    let emailError = null

    if (process.env.RESEND_API_KEY) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'AgroShop SENA <onboarding@resend.dev>',
          to: [email],
          subject: `Factura ${invoiceNumber} - AgroShop SENA`,
          html: generateEmailHTML(saleData, invoiceNumber, customerName, customerId),
          attachments: [
            {
              filename: `Factura_${invoiceNumber}.pdf`,
              content: pdfBuffer,
            },
          ],
        })

        if (error) {
          console.warn('⚠️ Resend falló:', error)
          emailError = error
        } else {
          console.log('✅ Correo enviado con Resend:', data?.id)
          emailSent = true
          emailId = data?.id
        }
      } catch (error) {
        console.warn('⚠️ Error en Resend:', error)
        emailError = error
      }
    }

    // Si Resend falló o no está configurado, usar Gmail (Nodemailer)
    if (!emailSent && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        console.log('📧 Intentando enviar con Gmail (Nodemailer)...')
        
        const info = await gmailTransporter.sendMail({
          from: `"AgroShop SENA" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `Factura ${invoiceNumber} - AgroShop SENA`,
          html: generateEmailHTML(saleData, invoiceNumber, customerName, customerId),
          attachments: [
            {
              filename: `Factura_${invoiceNumber}.pdf`,
              content: pdfBuffer,
            },
          ],
        })

        console.log('✅ Correo enviado con Gmail:', info.messageId)
        emailSent = true
        emailId = info.messageId
      } catch (gmailError: any) {
        console.error('❌ Error con Gmail:', gmailError)
        return NextResponse.json(
          { 
            success: false, 
            error: `No se pudo enviar el correo. Error: ${gmailError.message}` 
          },
          { status: 500 }
        )
      }
    }

    if (!emailSent) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No hay servicios de correo configurados o todos fallaron" 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Factura enviada exitosamente",
      emailId,
      provider: emailId?.includes('gmail') ? 'Gmail' : 'Resend'
    })

  } catch (error: any) {
    console.error('❌ Error en send-invoice API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Error interno al procesar la solicitud" 
      },
      { status: 500 }
    )
  }
}

// Función para generar el HTML del email
function generateEmailHTML(saleData: any, invoiceNumber: string, customerName: string, customerId: string): string {
  return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #228B22 0%, #32CD32 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .invoice-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .invoice-details table {
                width: 100%;
                border-collapse: collapse;
              }
              .invoice-details td {
                padding: 8px 0;
                border-bottom: 1px solid #eee;
              }
              .invoice-details td:first-child {
                color: #666;
                font-weight: 600;
              }
              .total {
                font-size: 24px;
                color: #228B22;
                font-weight: bold;
                text-align: right;
                margin-top: 10px;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #eee;
              }
              .button {
                display: inline-block;
                background: #228B22;
                color: white !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>AgroShop SENA</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Factura Electrónica</p>
            </div>
            
            <div class="content">
              <h2 style="color: #228B22; margin-top: 0;">¡Gracias por su compra!</h2>
              
              <p>Estimado/a ${customerName || 'Cliente'},</p>
              
              <p>Adjunto encontrará la factura de su compra realizada en AgroShop SENA.</p>
              
              <div class="invoice-details">
                <table>
                  <tr>
                    <td>Número de Factura:</td>
                    <td><strong>${invoiceNumber}</strong></td>
                  </tr>
                  <tr>
                    <td>Fecha:</td>
                    <td>${new Date().toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</td>
                  </tr>
                  <tr>
                    <td>Método de Pago:</td>
                    <td style="text-transform: capitalize;">${saleData.paymentMethod || 'Efectivo'}</td>
                  </tr>
                  ${customerName ? `
                  <tr>
                    <td>Cliente:</td>
                    <td>${customerName}</td>
                  </tr>
                  ` : ''}
                  ${customerId ? `
                  <tr>
                    <td>Cédula/NIT:</td>
                    <td>${customerId}</td>
                  </tr>
                  ` : ''}
                  ${saleData.cashReceived && saleData.cashReceived > 0 ? `
                  <tr>
                    <td>Efectivo Recibido:</td>
                    <td>$${saleData.cashReceived.toLocaleString("es-CO")}</td>
                  </tr>
                  ` : ''}
                  ${saleData.change && saleData.change > 0 ? `
                  <tr>
                    <td>Cambio:</td>
                    <td>$${saleData.change.toLocaleString("es-CO")}</td>
                  </tr>
                  ` : ''}
                </table>
                
                <div class="total">
                  Total: $${saleData.total.toLocaleString("es-CO")}
                </div>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                El documento PDF adjunto contiene el detalle completo de su compra.
              </p>
              
              <div class="footer">
                <p><strong>AgroShop SENA</strong></p>
                <p>Centro de Formación Agropecuaria</p>
                <p style="font-size: 12px; margin-top: 15px;">
                  Este es un correo automático, por favor no responder.
                </p>
              </div>
            </div>
          </body>
        </html>
      `
}

// Función para generar el PDF (misma lógica que en el frontend)
async function generateInvoicePDF({
  saleData,
  invoiceNumber,
  customerName,
  customerId,
  config
}: any): Promise<Buffer> {
  const doc = new jsPDF()
  
  // Colores
  const primaryColor: [number, number, number] = [34, 139, 34] // Verde
  const secondaryColor: [number, number, number] = [100, 100, 100] // Gris
  const textColor: [number, number, number] = [50, 50, 50]
  
  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('🌱 AgroShop SENA', 105, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Centro de Formación Agropecuaria', 105, 30, { align: 'center' })
  
  // Información de factura
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  let yPos = 55
  
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURA', 15, yPos)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`No: ${invoiceNumber}`, 15, yPos + 7)
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 15, yPos + 14)
  
  // Cliente
  yPos += 7
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
  
  saleData.items.forEach((item: any, index: number) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(15, yPos - 5, 180, 8, 'F')
    }
    
    doc.text(item.name, 20, yPos)
    doc.text(item.quantity.toString(), 120, yPos, { align: 'center' })
    doc.text(`$${item.price.toLocaleString('es-CO')}`, 150, yPos, { align: 'right' })
    doc.text(`$${(item.price * item.quantity).toLocaleString('es-CO')}`, 185, yPos, { align: 'right' })
    
    yPos += 8
  })
  
  // Totales
  yPos += 10
  // Usar los valores correctos que ya vienen calculados en saleData
  const subtotal = saleData.subtotal
  const iva = saleData.tax
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 140, yPos)
  doc.text(`$${subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, 185, yPos, { align: 'right' })
  
  yPos += 7
  doc.text(`IVA (${config.iva_porcentaje}%):`, 140, yPos)
  doc.text(`$${iva.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, 185, yPos, { align: 'right' })
  
  yPos += 10
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(130, yPos - 7, 65, 12, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', 140, yPos + 2)
  doc.text(`$${saleData.total.toLocaleString('es-CO')}`, 185, yPos + 2, { align: 'right' })
  
  // Cambio si existe (solo para efectivo)
  if (saleData.paymentMethod?.toLowerCase() === 'efectivo' && saleData.change && saleData.change > 0) {
    yPos += 12
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Efectivo Recibido:', 140, yPos)
    doc.text(`$${saleData.cashReceived.toLocaleString('es-CO')}`, 185, yPos, { align: 'right' })
    
    yPos += 7
    doc.text('Cambio Entregado:', 140, yPos)
    doc.text(`$${saleData.change.toLocaleString('es-CO')}`, 185, yPos, { align: 'right' })
  }
  
  // Método de pago
  yPos += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Método de Pago:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(saleData.paymentMethod || 'Efectivo', 60, yPos)
  
  // Footer
  yPos = 270
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text('Gracias por su compra', 105, yPos, { align: 'center' })
  doc.text('Esta es una factura electrónica válida', 105, yPos + 5, { align: 'center' })
  
  // Convertir a Buffer
  const pdfArrayBuffer = doc.output('arraybuffer')
  return Buffer.from(pdfArrayBuffer)
}
