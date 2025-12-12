/**
 * Servicio de Impresión ESC/POS y Control de Caja Registradora
 * 
 * Funcionalidades:
 * - Imprime tickets de venta en impresora térmica
 * - Abre el cajón de dinero/monedero
 * - Soporta comunicación vía puerto serial (COM)
 * 
 * NOTA: Este módulo usa imports dinámicos para evitar errores
 * en entornos donde serialport no está disponible (como Edge Runtime)
 */

// Imports dinámicos para evitar errores de compilación en Next.js
let SerialPort: any
let escpos: any

// Intentar cargar módulos solo si estamos en Node.js runtime
try {
  if (typeof window === 'undefined') {
    SerialPort = require('serialport').SerialPort
    escpos = require('escpos')
  }
} catch (error) {
  console.warn('⚠️ Módulos de impresora no disponibles:', error instanceof Error ? error.message : 'Unknown error')
}

// ---------------------------------------------------------------------
// TIPOS Y CONFIGURACIÓN
// ---------------------------------------------------------------------

interface PrinterConfig {
  portName: string
  baudRate: number
  vendorId?: number
  productId?: number
}

interface VentaItem {
  nombre: string
  cantidad: number
  precio: number
}

interface VentaData {
  codigo_venta: string
  items: VentaItem[]
  subtotal: number
  descuento?: number
  total: number
  efectivo_recibido?: number
  cambio?: number
  cliente_nombre?: string
  fecha: Date
  requiere_factura: boolean
  factura_generada?: boolean
}

// Configuración por defecto (puede sobreescribirse con variables de entorno)
const DEFAULT_CONFIG: PrinterConfig = {
  portName: process.env.PRINTER_PORT || 'COM3',
  baudRate: parseInt(process.env.PRINTER_BAUD_RATE || '9600'),
  vendorId: 1155, // Para referencia
  productId: 1799, // Para referencia
}

// ---------------------------------------------------------------------
// CLASE PRINCIPAL
// ---------------------------------------------------------------------

export class ESCPOSPrinter {
  private config: PrinterConfig
  private isAvailable: boolean

  constructor(config?: Partial<PrinterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.isAvailable = !!(SerialPort && escpos)
    
    if (!this.isAvailable) {
      console.warn('⚠️ Impresora no disponible: módulos serialport/escpos no cargados')
    }
  }

  /**
   * Imprime ticket de venta y abre el cajón de dinero
   */
  async printVentaAndOpenDrawer(venta: VentaData): Promise<void> {
    // Verificar si los módulos están disponibles
    if (!this.isAvailable) {
      console.warn('⚠️ Impresora no disponible - operación omitida')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      console.log(`🖨️  Intentando conectar a ${this.config.portName}...`)

      // 1. Crear instancia de SerialPort
      const device = new SerialPort({
        path: this.config.portName,
        baudRate: this.config.baudRate,
      })

      // 2. Crear instancia de impresora ESC/POS
      const printer = new escpos.Printer(device)

      // Timeout de seguridad (30 segundos)
      const timeout = setTimeout(() => {
        console.error('⏱️  Timeout: La impresión tardó demasiado')
        device.close()
        reject(new Error('Timeout en impresión'))
      }, 30000)

      // Manejo de apertura exitosa
      device.on('open', () => {
        console.log(`✅ Conexión establecida con ${this.config.portName}`)

        try {
          // --- ENCABEZADO ---
          printer
            .size(1, 1) // Fuente doble
            .align('ct') // Centrar
            .text('AGROSHOP')
            .size(0, 0) // Fuente normal
            .text('SENA Alto de Cauca, POPAYAN')
            .text('NIT: 123456789-0')
            .text('--------------------------------------')

          // --- INFO DE VENTA ---
          printer
            .align('lt') // Izquierda
            .text(`Ticket: ${venta.codigo_venta}`)
            .text(`Fecha: ${this.formatDate(venta.fecha)}`)
            
          if (venta.cliente_nombre) {
            printer.text(`Cliente: ${venta.cliente_nombre}`)
          }

          if (venta.requiere_factura) {
            printer.text(`Factura: ${venta.factura_generada ? 'GENERADA' : 'PENDIENTE'}`)
          }

          printer.text('--------------------------------------')

          // --- ITEMS ---
          printer
            .align('lt')
            .text('PRODUCTO              CANT   PRECIO')
            .text('--------------------------------------')

          for (const item of venta.items) {
            const nombre = this.truncate(item.nombre, 20)
            const cantidad = item.cantidad.toString().padStart(4)
            const precio = this.formatMoney(item.precio * item.cantidad).padStart(8)
            printer.text(`${nombre.padEnd(20)} ${cantidad} ${precio}`)
          }

          printer.text('--------------------------------------')

          // --- TOTALES ---
          printer.align('rt') // Derecha

          printer.text(`Subtotal: ${this.formatMoney(venta.subtotal)}`)

          if (venta.descuento && venta.descuento > 0) {
            printer.text(`Descuento: -${this.formatMoney(venta.descuento)}`)
          }

          printer
            .size(1, 1)
            .text(`TOTAL: ${this.formatMoney(venta.total)}`)
            .size(0, 0)

          if (venta.efectivo_recibido !== undefined) {
            printer
              .text(`Efectivo: ${this.formatMoney(venta.efectivo_recibido)}`)
              .text(`Cambio: ${this.formatMoney(venta.cambio || 0)}`)
          }

          printer.text('--------------------------------------')

          // --- PIE DE PÁGINA ---
          printer
            .align('ct')
            .text('GRACIAS POR SU COMPRA')
            .text('Vuelva pronto')
            .feed(3) // Saltos de línea

          // --- ABRIR CAJÓN DE DINERO ---
          printer.cashdraw(2) // Pin 2, pulso estándar

          // --- CORTAR PAPEL ---
          printer.cut()

          // --- CERRAR CONEXIÓN ---
          printer.close((err?: Error) => {
            clearTimeout(timeout)
            if (err) {
              console.error('❌ Error al cerrar puerto:', err.message)
              reject(err)
            } else {
              console.log('🎉 Impresión finalizada y cajón abierto')
              resolve()
            }
          })
        } catch (err) {
          clearTimeout(timeout)
          console.error('❌ Error durante la impresión:', err)
          device.close()
          reject(err)
        }
      })

      // Manejo de errores críticos
      device.on('error', (err: Error) => {
        clearTimeout(timeout)
        console.error(
          `❌ ERROR: No se pudo comunicar con ${this.config.portName}. Detalles: ${err.message}`
        )
        console.log(
          'CONSEJO: Asegúrate de que el puerto no esté ocupado por otro programa.'
        )
        reject(err)
      })
    })
  }

  /**
   * Solo abre el cajón de dinero (sin imprimir)
   */
  async openDrawerOnly(): Promise<void> {
    // Verificar si los módulos están disponibles
    if (!this.isAvailable) {
      console.warn('⚠️ Impresora no disponible - operación omitida')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      console.log(`💰 Abriendo cajón en ${this.config.portName}...`)

      const device = new SerialPort({
        path: this.config.portName,
        baudRate: this.config.baudRate,
      })

      const printer = new escpos.Printer(device)

      const timeout = setTimeout(() => {
        device.close()
        reject(new Error('Timeout al abrir cajón'))
      }, 10000)

      device.on('open', () => {
        printer
          .cashdraw(2)
          .close((err?: Error) => {
            clearTimeout(timeout)
            if (err) {
              reject(err)
            } else {
              console.log('✅ Cajón abierto')
              resolve()
            }
          })
      })

      device.on('error', (err: Error) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }

  // ---------------------------------------------------------------------
  // MÉTODOS AUXILIARES
  // ---------------------------------------------------------------------

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  }

  private formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 2) + '..' : text
  }

  /**
   * Verifica si la impresora está disponible
   */
  async checkConnection(): Promise<boolean> {
    // Si los módulos no están disponibles, retornar false
    if (!this.isAvailable) {
      return false
    }

    try {
      const device = new SerialPort({
        path: this.config.portName,
        baudRate: this.config.baudRate,
      })

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          device.close()
          resolve(false)
        }, 3000)

        device.on('open', () => {
          clearTimeout(timeout)
          device.close()
          resolve(true)
        })

        device.on('error', () => {
          clearTimeout(timeout)
          resolve(false)
        })
      })
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------
// INSTANCIA SINGLETON
// ---------------------------------------------------------------------

let printerInstance: ESCPOSPrinter | null = null

export function getPrinter(): ESCPOSPrinter {
  if (!printerInstance) {
    printerInstance = new ESCPOSPrinter()
  }
  return printerInstance
}

// ---------------------------------------------------------------------
// EXPORTACIONES
// ---------------------------------------------------------------------

export type { PrinterConfig, VentaData, VentaItem }
