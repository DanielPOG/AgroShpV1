import { prisma } from '../lib/prisma'

async function checkTriggers() {
  console.log('🔍 Verificando triggers en la base de datos...\n')

  try {
    const triggers = await prisma.$queryRaw<Array<{ trigger_name: string; event_manipulation: string }>>`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND event_object_table IN ('lotes_productos', 'detalle_ventas')
      ORDER BY event_object_table, trigger_name;
    `

    if (triggers.length === 0) {
      console.log('❌ No se encontraron triggers instalados\n')
      console.log('Para instalar los triggers, ejecuta:')
      console.log('  cd database')
      console.log('  Get-Content trigger-sync-stock-lotes.sql | psql $env:DATABASE_URL')
    } else {
      console.log('✅ Triggers encontrados:\n')
      triggers.forEach(t => {
        console.log(`  - ${t.trigger_name} (${t.event_manipulation})`)
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTriggers()
