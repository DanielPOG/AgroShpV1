import { prisma } from '@/lib/prisma'

/**
 * Verificar lotes próximos a vencer y crear alertas
 * Se recomienda ejecutar esta función diariamente con un cron job
 */
export async function checkLotesProximosVencer() {
  console.log('🔍 Verificando lotes próximos a vencer...')

  const ahora = new Date()
  const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000)
  const en3Dias = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000)

  try {
    // 1. Buscar lotes que vencen en 7 días o menos
    const lotes7Dias = await prisma.lotes_productos.findMany({
      where: {
        estado: 'disponible',
        cantidad: { gt: 0 },
        fecha_vencimiento: {
          gte: ahora,
          lte: en7Dias,
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
    for (const lote of lotes7Dias) {
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
      } else if (diasRestantes <= 7) {
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

    // 3. Marcar lotes vencidos
    const lotesVencidos = await prisma.lotes_productos.updateMany({
      where: {
        estado: 'disponible',
        fecha_vencimiento: {
          lt: ahora,
        },
      },
      data: {
        estado: 'vencido',
      },
    })

    if (lotesVencidos.count > 0) {
      console.log(`🚫 ${lotesVencidos.count} lotes marcados como vencidos`)
    }

    console.log(
      `✅ Verificación completada: ${lotes7Dias.length} lotes próximos a vencer, ${lotesVencidos.count} lotes vencidos`
    )

    return {
      proximosVencer: lotes7Dias.length,
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
export async function getLotesProximosVencer(dias: number = 7) {
  const ahora = new Date()
  const enXDias = new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000)

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
