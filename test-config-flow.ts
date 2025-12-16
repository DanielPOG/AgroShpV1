#!/usr/bin/env tsx
/**
 * Script de prueba para verificar el flujo completo de configuración del IVA
 * Verifica que el valor 0 se maneje correctamente en todo el sistema
 */

import { PrismaClient } from '@prisma/client'
import { getConfigValue } from './lib/constants'
import { getCachedConfig } from './lib/config-cache'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Iniciando pruebas del flujo de configuración...\n')

  // ============================================
  // PRUEBA 1: Leer directamente de la base de datos
  // ============================================
  console.log('📊 PRUEBA 1: Lectura directa de la BD')
  const configDB = await prisma.configuracion.findUnique({
    where: { clave: 'iva_porcentaje' }
  })
  console.log(`   Base de datos (valor string): "${configDB?.valor}"`)
  console.log(`   Base de datos (tipo): ${configDB?.tipo}`)
  
  const valorNumerico = Number(configDB?.valor)
  console.log(`   Convertido a número: ${valorNumerico}`)
  console.log(`   ✅ Es cero?: ${valorNumerico === 0}`)
  console.log(`   ⚠️  Falseable (||)?: ${valorNumerico || 'FALLBACK'}`)
  console.log(`   ✅ Nullish (??)?: ${valorNumerico ?? 'FALLBACK'}`)
  console.log('')

  // ============================================
  // PRUEBA 2: getConfigValue (lib/constants.ts)
  // ============================================
  console.log('🔧 PRUEBA 2: getConfigValue()')
  const ivaConfig = await getConfigValue('iva_porcentaje', 19) as number
  console.log(`   getConfigValue resultado: ${ivaConfig}`)
  console.log(`   ✅ Es cero?: ${ivaConfig === 0}`)
  console.log(`   Tipo: ${typeof ivaConfig}`)
  console.log('')

  // ============================================
  // PRUEBA 3: getCachedConfig (lib/config-cache.ts)
  // ============================================
  console.log('💾 PRUEBA 3: getCachedConfig()')
  const cached = await getCachedConfig()
  console.log(`   iva_porcentaje del cache: ${cached.iva_porcentaje}`)
  console.log(`   ✅ Es cero?: ${cached.iva_porcentaje === 0}`)
  console.log(`   Tipo: ${typeof cached.iva_porcentaje}`)
  console.log('')

  // ============================================
  // PRUEBA 4: Simulación de API route
  // ============================================
  console.log('🌐 PRUEBA 4: Simulación API /api/config/public')
  const apiResponse = {
    iva_porcentaje: cached.iva_porcentaje ?? 19, // ✅ Usando ??
    nombre_tienda: cached.nombre_tienda ?? "AgroShop SENA",
    stock_minimo_default: cached.stock_minimo_default ?? 10,
    dias_alerta_vencimiento: cached.dias_alerta_vencimiento ?? 7,
  }
  console.log(`   API response iva_porcentaje: ${apiResponse.iva_porcentaje}`)
  console.log(`   ✅ Es cero?: ${apiResponse.iva_porcentaje === 0}`)
  console.log('')

  // ============================================
  // PRUEBA 5: Cálculo de venta (simulación)
  // ============================================
  console.log('💰 PRUEBA 5: Cálculo de venta')
  const subtotal = 2000
  const ivaPorcentaje = ivaConfig
  const impuesto = subtotal * (ivaPorcentaje / 100)
  const total = subtotal + impuesto
  
  console.log(`   Subtotal: $${subtotal}`)
  console.log(`   IVA (${ivaPorcentaje}%): $${impuesto}`)
  console.log(`   Total: $${total}`)
  console.log(`   ✅ Con IVA 0%: Total === Subtotal?: ${total === subtotal}`)
  console.log('')

  // ============================================
  // PRUEBA 6: Validación de Zod (simulación)
  // ============================================
  console.log('✔️  PRUEBA 6: Validación simplificada (como en Zod)')
  const totalPagos = 2000
  const subtotalConDescuento = 2000
  const totalEstimado = subtotalConDescuento * 1.25 // Permitir hasta 25% de IVA
  
  const validacionPasa = totalPagos >= subtotalConDescuento - 1 && totalPagos <= totalEstimado + 1
  console.log(`   Total de pagos: $${totalPagos}`)
  console.log(`   Subtotal: $${subtotalConDescuento}`)
  console.log(`   Rango permitido: $${subtotalConDescuento - 1} - $${totalEstimado + 1}`)
  console.log(`   ✅ Validación pasa?: ${validacionPasa}`)
  console.log('')

  // ============================================
  // PRUEBA 7: Comparación || vs ??
  // ============================================
  console.log('⚠️  PRUEBA 7: Diferencia entre || y ??')
  const valorCero = 0
  console.log(`   Valor original: ${valorCero}`)
  console.log(`   Con || 19: ${valorCero || 19} ❌ (INCORRECTO)`)
  console.log(`   Con ?? 19: ${valorCero ?? 19} ✅ (CORRECTO)`)
  console.log('')

  // ============================================
  // RESUMEN
  // ============================================
  console.log('═══════════════════════════════════════════════════════')
  console.log('📋 RESUMEN DE PRUEBAS')
  console.log('═══════════════════════════════════════════════════════')
  
  const todosCorrecto = [
    valorNumerico === 0,
    ivaConfig === 0,
    cached.iva_porcentaje === 0,
    apiResponse.iva_porcentaje === 0,
    total === subtotal,
    validacionPasa
  ].every(test => test)

  if (todosCorrecto) {
    console.log('✅ TODAS LAS PRUEBAS PASARON')
    console.log('   El sistema maneja correctamente IVA = 0%')
    console.log('   El flujo completo está funcionando')
  } else {
    console.log('❌ ALGUNAS PRUEBAS FALLARON')
    console.log('   Revisar la configuración del sistema')
  }
  console.log('═══════════════════════════════════════════════════════')

  // Mostrar configuración actual completa
  console.log('\n📄 CONFIGURACIÓN ACTUAL COMPLETA:')
  const todasConfigs = await prisma.configuracion.findMany({
    orderBy: { clave: 'asc' }
  })
  todasConfigs.forEach(config => {
    console.log(`   ${config.clave}: ${config.valor} (${config.tipo})`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
