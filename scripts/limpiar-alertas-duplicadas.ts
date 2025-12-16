/**
 * Script para limpiar alertas duplicadas
 * 
 * Ejecutar con:
 * npx ts-node scripts/limpiar-alertas-duplicadas.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function limpiarAlertasDuplicadas() {
  try {
    console.log('🧹 Iniciando limpieza de alertas duplicadas...\n')

    // 1. Obtener todas las notificaciones
    const todasNotificaciones = await prisma.notificaciones.findMany({
      where: {
        referencia_id: { not: null },
        referencia_tipo: { not: null }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    console.log(`📊 Total notificaciones: ${todasNotificaciones.length}`)

    // 2. Agrupar por tipo + referencia_id + referencia_tipo
    const grupos = new Map<string, typeof todasNotificaciones>()
    
    for (const notif of todasNotificaciones) {
      const key = `${notif.tipo}_${notif.referencia_id}_${notif.referencia_tipo}`
      
      if (!grupos.has(key)) {
        grupos.set(key, [])
      }
      
      grupos.get(key)!.push(notif)
    }

    console.log(`📦 Grupos únicos: ${grupos.size}\n`)

    let gruposConDuplicados = 0
    let totalEliminadas = 0

    // 3. Para cada grupo, mantener solo la más reciente
    for (const [key, notificaciones] of grupos) {
      if (notificaciones.length > 1) {
        gruposConDuplicados++
        
        // Ordenar por fecha (más reciente primero)
        const ordenadas = notificaciones.sort((a, b) => 
          (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0)
        )

        // La primera es la más reciente
        const mantener = ordenadas[0]
        const eliminar = ordenadas.slice(1)

        console.log(`\n🔍 Grupo: ${key}`)
        console.log(`   Total en grupo: ${notificaciones.length}`)
        console.log(`   ✅ Mantener ID ${mantener.id} (${mantener.created_at?.toISOString()}) - ${mantener.leida ? '📖 Leída' : '📬 No leída'}`)
        console.log(`   🗑️  Eliminar ${eliminar.length} duplicados:`)
        
        for (const n of eliminar) {
          console.log(`      - ID ${n.id} (${n.created_at?.toISOString()}) - ${n.leida ? '📖 Leída' : '📬 No leída'}`)
        }

        // Eliminar las duplicadas
        const ids = eliminar.map(n => n.id)
        const resultado = await prisma.notificaciones.deleteMany({
          where: {
            id: { in: ids }
          }
        })

        totalEliminadas += resultado.count
      }
    }

    console.log(`\n✅ Limpieza completada!`)
    console.log(`   - Grupos con duplicados: ${gruposConDuplicados}`)
    console.log(`   - Total alertas eliminadas: ${totalEliminadas}`)
    console.log(`   - Alertas restantes: ${todasNotificaciones.length - totalEliminadas}`)

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar script
limpiarAlertasDuplicadas()
  .then(() => {
    console.log('\n🎉 Script finalizado correctamente')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error)
    process.exit(1)
  })
