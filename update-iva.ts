import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateIVA() {
  try {
    console.log('🔄 Actualizando IVA a 0%...')
    
    const result = await prisma.configuracion.update({
      where: { clave: 'iva_porcentaje' },
      data: { 
        valor: '0',
        updated_at: new Date()
      }
    })
    
    console.log('✅ IVA actualizado:', result)
    
    // Verificar todos los valores
    const all = await prisma.configuracion.findMany({
      orderBy: { clave: 'asc' }
    })
    
    console.log('\n📊 Configuración actual:')
    all.forEach(c => {
      console.log(`  ${c.clave}: ${c.valor} (${c.tipo})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateIVA()
