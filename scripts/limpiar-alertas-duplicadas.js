/**
 * Script: Limpiar Alertas Duplicadas
 * 
 * Ejecuta limpieza de alertas duplicadas en el sistema
 * Mantiene solo la más reciente de cada tipo+referencia
 * 
 * Uso:
 *   node scripts/limpiar-alertas-duplicadas.js
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function limpiarDuplicados() {
  try {
    console.log('🧹 Iniciando limpieza de alertas duplicadas...')
    console.log(`📡 API: ${API_URL}/api/alertas/limpiar-duplicados`)
    
    const response = await fetch(`${API_URL}/api/alertas/limpiar-duplicados`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al limpiar duplicados')
    }

    const data = await response.json()
    
    console.log('\n✅ Limpieza completada:')
    console.log(`   📊 Alertas duplicadas eliminadas: ${data.resultado.eliminadas}`)
    
    if (data.resultado.eliminadas === 0) {
      console.log('\n   ℹ️ No se encontraron alertas duplicadas')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Ejecutar
limpiarDuplicados()
