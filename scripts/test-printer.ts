/**
 * Script de prueba para verificar la impresora térmica
 * 
 * Uso:
 *   npx ts-node scripts/test-printer.ts
 * 
 * O agregar en package.json:
 *   "test:printer": "ts-node scripts/test-printer.ts"
 */

import { getPrinter } from '../lib/printer/escpos-printer.js'

async function testPrinter() {
  console.log('🧪 Iniciando prueba de impresora...\n')

  const printer = getPrinter()

  // 1. Verificar conexión
  console.log('1️⃣ Verificando conexión...')
  const isConnected = await printer.checkConnection()
  
  if (!isConnected) {
    console.error('❌ No se pudo conectar a la impresora')
    console.log('   Verifica:')
    console.log('   - Que la impresora esté encendida')
    console.log('   - Que el cable esté conectado')
    console.log('   - Que el puerto COM sea correcto (variable PRINTER_PORT)')
    console.log('   - Que no esté siendo usado por otra aplicación')
    process.exit(1)
  }
  
  console.log('✅ Impresora conectada correctamente\n')

  // 2. Imprimir ticket de prueba
  console.log('2️⃣ Imprimiendo ticket de prueba...')
  
  try {
    await printer.printVentaAndOpenDrawer({
      codigo_venta: 'TEST-001',
      items: [
        { nombre: 'CAFE EXPRESS', cantidad: 2, precio: 4000 },
        { nombre: 'PASTEL DE CHOCOLATE', cantidad: 1, precio: 7500 },
        { nombre: 'AGUA MINERAL 500ML', cantidad: 3, precio: 2000 },
      ],
      subtotal: 19500,
      descuento: 500,
      total: 19000,
      efectivo_recibido: 20000,
      cambio: 1000,
      cliente_nombre: 'Cliente de Prueba',
      fecha: new Date(),
      requiere_factura: false,
    })
    
    console.log('✅ Ticket impreso y cajón abierto exitosamente\n')
  } catch (error) {
    console.error('❌ Error al imprimir:', error)
    process.exit(1)
  }

  // 3. Prueba solo apertura de cajón
  console.log('3️⃣ Probando solo apertura de cajón...')
  
  try {
    await printer.openDrawerOnly()
    console.log('✅ Cajón abierto exitosamente\n')
  } catch (error) {
    console.error('⚠️ Error al abrir cajón:', error)
  }

  console.log('🎉 ¡Todas las pruebas completadas!')
}

// Ejecutar pruebas
testPrinter().catch(console.error)
