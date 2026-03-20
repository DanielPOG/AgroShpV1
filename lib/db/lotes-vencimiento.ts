import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getConfigValue } from '@/lib/constants'

/**
 * Verificar lotes próximos a vencer y crear alertas
 * Se recomienda ejecutar esta función diariamente con un cron job
 */
export async function checkLotesProximosVencer() {
  console.log('🔍 Verificando lotes próximos a vencer...')

  // Obtener días de alerta desde configuración
  const diasAlerta = await getConfigValue('dias_alerta_vencimiento', 7) as number
  
  const ahora = new Date()
  const enDiasAlerta = new Date(ahora.getTime() + diasAlerta * 24 * 60 * 60 * 1000)
  const en3Dias = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000)

  try {
    // 1. Buscar lotes que vencen en X días o menos (según configuración)
    const lotesProximos = await prisma.lotes_productos.findMany({
      where: {
        estado: 'disponible',
        cantidad: { gt: 0 },
        fecha_vencimiento: {
          gte: ahora,
          lte: enDiasAlerta,
        },
      },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            es_perecedero: true,
          },
        },
      },
    })

    // 2. Crear alertas para lotes próximos a vencer
    for (const lote of lotesProximos) {
      const diasRestantes = Math.ceil(
        (new Date(lote.fecha_vencimiento!).getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000)
      )

      let severidad: 'baja' | 'media' | 'alta' = 'baja'
      let titulo = ''

      if (diasRestantes <= 1) {
        severidad = 'alta'
        titulo = `¡URGENTE! Lote ${lote.codigo_lote} vence HOY`
      } else if (diasRestantes <= 3) {
        severidad = 'alta'
        titulo = `Lote ${lote.codigo_lote} vence en ${diasRestantes} días`
      } else if (diasRestantes <= diasAlerta) {
        severidad = 'media'
        titulo = `Lote ${lote.codigo_lote} vence en ${diasRestantes} días`
      }

      // Crear alerta si el modelo existe en el schema
      try {
        const productoNombre = lote.producto?.nombre || 'Producto desconocido'
        const mensaje = `El lote ${lote.codigo_lote} del producto "${productoNombre}" vencerá el ${new Date(lote.fecha_vencimiento!).toLocaleDateString()}. Cantidad: ${lote.cantidad}`
        
        await prisma.$executeRaw`
          INSERT INTO alertas (tipo_alerta, severidad, titulo, mensaje, producto_id, leida, resuelta, detalles, created_at)
          VALUES (
            'vencimiento_lote',
            ${severidad},
            ${titulo},
            ${mensaje},
            ${lote.producto_id},
            false,
            false,
            ${JSON.stringify({
              lote_id: lote.id,
              codigo_lote: lote.codigo_lote,
              fecha_vencimiento: lote.fecha_vencimiento,
              cantidad: Number(lote.cantidad),
              dias_restantes: diasRestantes,
            })}::jsonb,
            NOW()
          )
          ON CONFLICT DO NOTHING
        `
        console.log(`⚠️ Alerta creada: ${titulo}`)
      } catch (error) {
        // Si la tabla alertas no existe, solo log
        console.log(`⚠️ ${titulo} (alerta no guardada - tabla no existe)`)
      }
    }

    // 3. Marcar lotes vencidos - SOLO cambiar estado
    // ⚠️ CRÍTICO: NO descontar stock manualmente aquí
    // El trigger SQL sync_stock_on_lote_update() se ejecuta automáticamente
    // cuando cambia el estado y maneja el descuento de stock correctamente
    const lotesVencidos = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Obtener lotes que están vencidos pero aún marcados como disponibles
      const lotesParaVencer = await tx.lotes_productos.findMany({
        where: {
          estado: 'disponible',
          fecha_vencimiento: {
            lt: ahora,
          },
        },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              stock_actual: true,
            },
          },
        },
      })

      if (lotesParaVencer.length === 0) {
        return { count: 0, detalles: [] }
      }

      // Log del estado ANTES de marcar como vencidos
      console.log('\n📊 Estado ANTES de marcar lotes como vencidos:')
      lotesParaVencer.forEach(lote => {
        console.log(`  - Lote ${lote.codigo_lote}: cantidad=${lote.cantidad}, producto="${lote.producto?.nombre}", stock_actual=${lote.producto?.stock_actual}`)
      })

      // SOLO cambiar estado a 'vencido'
      // El trigger SQL se encargará de:
      // 1. Detectar cambio de estado (disponible → vencido)
      // 2. Restar automáticamente la cantidad del lote del stock del producto
      // 3. Crear registro en historial_inventario
      await tx.lotes_productos.updateMany({
        where: {
          id: { in: lotesParaVencer.map(l => l.id) },
        },
        data: {
          estado: 'vencido',
        },
      })

      // Log de confirmación
      console.log(`\n🚫 ${lotesParaVencer.length} lotes marcados como vencidos`)
      console.log('✅ Trigger SQL sync_stock_on_lote_update() ejecutará automáticamente:')
      console.log('   1. Descontar stock de productos afectados')
      console.log('   2. Crear registros en historial_inventario')
      console.log('   3. Evitar doble descuento (solo resta si cantidad > 0)\n')
      
      return {
        count: lotesParaVencer.length,
        detalles: lotesParaVencer.map(l => ({
          codigo_lote: l.codigo_lote,
          producto: l.producto?.nombre,
          cantidad: Number(l.cantidad),
          stock_antes: Number(l.producto?.stock_actual),
        })),
      }
    })

    console.log(
      `✅ Verificación completada: ${lotesProximos.length} lotes próximos a vencer, ${lotesVencidos.count} lotes vencidos`
    )

    return {
      proximosVencer: lotesProximos.length,
      vencidos: lotesVencidos.count,
    }
  } catch (error) {
    console.error('❌ Error al verificar lotes próximos a vencer:', error)
    throw error
  }
}

/**
 * Obtener reporte de lotes próximos a vencer
 */
export async function getLotesProximosVencer(dias?: number) {
  // Usar configuración global si no se especifica
  const diasAlerta = dias ?? await getConfigValue('dias_alerta_vencimiento', 7) as number
  
  const ahora = new Date()
  const enXDias = new Date(ahora.getTime() + diasAlerta * 24 * 60 * 60 * 1000)

  try {
    const lotes = await prisma.lotes_productos.findMany({
      where: {
        estado: 'disponible',
        cantidad: { gt: 0 },
        fecha_vencimiento: {
          gte: ahora,
          lte: enXDias,
        },
      },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
          },
        },
      },
      orderBy: {
        fecha_vencimiento: 'asc',
      },
    })

    // Calcular días restantes para cada lote
    const lotesConDias = lotes.map((lote) => {
      const diasRestantes = Math.ceil(
        (new Date(lote.fecha_vencimiento!).getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000)
      )

      return {
        ...lote,
        dias_restantes: diasRestantes,
      }
    })

    return lotesConDias
  } catch (error) {
    console.error('Error al obtener lotes próximos a vencer:', error)
    throw error
  }
}
