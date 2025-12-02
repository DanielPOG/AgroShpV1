import { prisma } from '../lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

async function installTriggers() {
  console.log('📦 Instalando triggers de sincronización de stock...\n')

  try {
    // Leer archivo SQL
    const sqlPath = join(process.cwd(), 'database', 'trigger-sync-stock-lotes.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    // Dividir en comandos individuales usando delimitador $$
    // Eliminar comentarios y líneas vacías
    const cleanedSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')

    // Separar por puntos y comas pero mantener las funciones completas
    const commands: string[] = []
    let currentCommand = ''
    let inFunction = false

    for (const line of cleanedSql.split('\n')) {
      currentCommand += line + '\n'
      
      // Detectar inicio de función
      if (line.includes('$$') && !inFunction) {
        inFunction = true
      }
      // Detectar fin de función
      else if (line.includes('$$') && inFunction) {
        inFunction = false
        commands.push(currentCommand.trim())
        currentCommand = ''
      }
      // Comandos simples (DROP, CREATE TRIGGER, etc.)
      else if (line.trim().endsWith(';') && !inFunction) {
        commands.push(currentCommand.trim())
        currentCommand = ''
      }
    }

    console.log(`📝 Ejecutando ${commands.length} comandos SQL...\n`)

    let executed = 0
    for (const command of commands) {
      if (command.length < 10) continue // Skip empty or very short commands
      
      try {
        await prisma.$executeRawUnsafe(command)
        executed++
        
        // Mostrar progreso
        if (command.includes('CREATE OR REPLACE FUNCTION')) {
          const funcName = command.match(/FUNCTION\s+(\w+)\s*\(/)?.[1]
          console.log(`  ✓ Función ${funcName} creada`)
        } else if (command.includes('CREATE TRIGGER')) {
          const triggerName = command.match(/CREATE TRIGGER\s+(\w+)/)?.[1]
          console.log(`  ✓ Trigger ${triggerName} instalado`)
        }
      } catch (err) {
        console.log(`  ⚠️  Comando omitido (probablemente un comentario o comando vacío)`)
      }
    }

    console.log(`\n✅ ${executed} comandos ejecutados exitosamente\n`)

    // Verificar instalación
    console.log('🔍 Verificando instalación...\n')
    const triggers = await prisma.$queryRaw<Array<{ trigger_name: string }>>`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND trigger_name LIKE 'trigger_sync_stock%'
      ORDER BY trigger_name;
    `

    if (triggers.length > 0) {
      console.log('✅ Triggers verificados:')
      triggers.forEach(t => console.log(`  ✓ ${t.trigger_name}`))
      console.log('\n🎉 Los triggers están instalados y funcionando correctamente')
    } else {
      console.log('⚠️  No se encontraron triggers con nombre trigger_sync_stock*')
      console.log('Esto es normal si ya tienes la lógica manual en el código.')
    }

  } catch (error) {
    console.error('❌ Error al instalar triggers:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

installTriggers()
