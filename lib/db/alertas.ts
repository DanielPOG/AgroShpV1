/**
 * SISTEMA DE ALERTAS Y NOTIFICACIONES
 * 
 * Este módulo contiene las funciones para detectar y crear alertas automáticas:
 * - Stock agotado: stock_actual = 0
 * - Stock bajo: 0 < stock_actual < stock_minimo
 * - Sobre exceso: stock_actual >= stock_maximo (si existe)
 * - Lotes próximos a vencer: Lotes que vencen en los próximos 7 días
 * - Limpieza automática: Marcar como leídas las alertas resueltas
 */

import { prisma } from '@/lib/prisma'
import { getConfigValue } from '@/lib/constants'

/**
 * Detectar productos con problemas de stock y crear alertas
 * 
 * Se ejecuta después de:
 * - Ajuste de stock
 * - Ventas
 * - Movimientos de inventario
 * 
 * Tipos de alertas:
 * - stock_agotado: stock_actual = 0 (CRÍTICA)
 * - stock_bajo: 0 < stock_actual < stock_minimo (ALTA)
 * - stock_exceso: stock_actual >= stock_maximo (NORMAL)
 * 
 * @returns {Promise<{agotado: number, bajo: number, exceso: number}>} Alertas creadas por tipo
 */
export async function checkStockBajo(): Promise<{agotado: number, bajo: number, exceso: number}> {
  try {
    console.log('🔍 Verificando productos con problemas de stock...')
    
    // Buscar TODOS los productos activos
    const todosProductos = await prisma.productos.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        stock_actual: true,
        stock_minimo: true,
        stock_maximo: true,
        unidad: true
      }
    })

    console.log(`📦 Total productos activos: ${todosProductos.length}`)

    const hace24Horas = new Date()
    hace24Horas.setHours(hace24Horas.getHours() - 24)

    let alertasAgotado = 0
    let alertasBajo = 0
    let alertasExceso = 0

    for (const producto of todosProductos) {
      const stockActual = Number(producto.stock_actual)
      const stockMinimo = Number(producto.stock_minimo)
      const stockMaximo = producto.stock_maximo ? Number(producto.stock_maximo) : null

      let tipoAlerta: string | null = null
      let prioridad: string = 'normal'
      let titulo: string = ''
      let mensaje: string = ''

      // 1. Verificar AGOTADO (prioridad máxima)
      if (stockActual === 0) {
        tipoAlerta = 'stock_agotado'
        prioridad = 'critica'
        titulo = `🚨 AGOTADO: ${producto.nombre}`
        mensaje = `El producto ${producto.nombre} está AGOTADO. Stock mínimo requerido: ${stockMinimo} ${producto.unidad || 'unidades'}`
      }
      // 2. Verificar SOBRE EXCESO
      else if (stockMaximo !== null && stockActual >= stockMaximo) {
        tipoAlerta = 'stock_exceso'
        prioridad = 'normal'
        titulo = `📦 SOBRE EXCESO: ${producto.nombre}`
        mensaje = `El producto ${producto.nombre} tiene ${stockActual} ${producto.unidad || 'unidades'}. Stock máximo: ${stockMaximo} ${producto.unidad || 'unidades'}`
      }
      // 3. Verificar BAJO STOCK
      else if (stockActual < stockMinimo) {
        tipoAlerta = 'stock_bajo'
        prioridad = 'alta'
        titulo = `⚠️ BAJO STOCK: ${producto.nombre}`
        mensaje = `El producto ${producto.nombre} tiene ${stockActual} ${producto.unidad || 'unidades'}. Stock mínimo: ${stockMinimo} ${producto.unidad || 'unidades'}`
      }

      // Si hay alerta, verificar si ya existe una reciente (últimas 24h) - LEÍDA O NO
      if (tipoAlerta) {
        const alertaReciente = await prisma.notificaciones.findFirst({
          where: {
            tipo: tipoAlerta,
            referencia_id: producto.id,
            referencia_tipo: 'producto',
            // ✅ CRÍTICO: Buscar CUALQUIER alerta (leída o no) en últimas 24h
            created_at: {
              gte: hace24Horas
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        })

        // Solo crear si NO existe NINGUNA alerta reciente (últimas 24h)
        if (!alertaReciente) {
          await prisma.notificaciones.create({
            data: {
              tipo: tipoAlerta,
              titulo,
              mensaje,
              prioridad,
              referencia_id: producto.id,
              referencia_tipo: 'producto',
              usuario_id: null,
              leida: false
            }
          })

          console.log(`✅ Alerta ${tipoAlerta} creada para: ${producto.nombre}`)
          
          if (tipoAlerta === 'stock_agotado') alertasAgotado++
          else if (tipoAlerta === 'stock_bajo') alertasBajo++
          else if (tipoAlerta === 'stock_exceso') alertasExceso++
        } else {
          const estadoAlerta = alertaReciente.leida ? 'LEÍDA' : 'NO LEÍDA'
          console.log(`⏭️ Alerta ${tipoAlerta} reciente (${estadoAlerta}) existe para: ${producto.nombre} - No crear duplicado`)
        }
      }
    }

    console.log(`✅ Alertas creadas - Agotado: ${alertasAgotado}, Bajo: ${alertasBajo}, Exceso: ${alertasExceso}`)
    return { agotado: alertasAgotado, bajo: alertasBajo, exceso: alertasExceso }
  } catch (error) {
    console.error('❌ Error al verificar stock:', error)
    throw error
  }
}

/**
 * Detectar lotes próximos a vencer y crear alertas
 * 
 * Se ejecuta después de:
 * - Crear lote
 * - Editar lote (cambio de fecha de vencimiento)
 * - Cron job diario (recomendado)
 * 
 * Prioridad según días restantes:
 * - CRÍTICA: <= 3 días
 * - ALTA: 4-5 días
 * - NORMAL: 6-7 días
 * 
 * @param {number} diasAnticipacion - Días de anticipación para alertar (si no se pasa, usa config)
 * @returns {Promise<number>} Cantidad de alertas creadas
 */
export async function checkLotesProximosVencer(diasAnticipacion?: number): Promise<number> {
  try {
    // Usar configuración global si no se especifica
    const diasAlerta = diasAnticipacion ?? await getConfigValue('dias_alerta_vencimiento', 7)
    
    console.log(`🔍 Verificando lotes próximos a vencer (${diasAlerta} días)...`)
    
    const ahora = new Date()
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + Number(diasAlerta))

    // Buscar lotes disponibles que vencen dentro del período
    const lotesProximos = await prisma.lotes_productos.findMany({
      where: {
        estado: 'disponible',
        fecha_vencimiento: {
          lte: fechaLimite,
          gte: ahora // No incluir lotes ya vencidos
        }
      },
      include: {
        producto: {
          select: {
            nombre: true,
            unidad: true
          }
        }
      }
    })

    console.log(`📦 Lotes próximos a vencer encontrados: ${lotesProximos.length}`)

    let alertasCreadas = 0

    for (const lote of lotesProximos) {
      if (!lote.fecha_vencimiento) continue

      // Verificar si ya existe alerta reciente para este lote (últimas 24 horas)
      const hace24Horas = new Date()
      hace24Horas.setHours(hace24Horas.getHours() - 24)

      const alertaReciente = await prisma.notificaciones.findFirst({
        where: {
          tipo: 'lote_vencimiento',
          referencia_id: lote.id,
          referencia_tipo: 'lote',
          created_at: {
            gte: hace24Horas // Buscar alertas creadas en las últimas 24 horas
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      // Solo crear nueva alerta si no existe una reciente (últimas 24 horas)
      if (!alertaReciente) {
        // Calcular días restantes
        const diasRestantes = Math.ceil(
          (new Date(lote.fecha_vencimiento).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Determinar prioridad según días restantes
        let prioridad: string
        let emoji: string

        if (diasRestantes <= 3) {
          prioridad = 'critica'
          emoji = '🚨'
        } else if (diasRestantes <= 5) {
          prioridad = 'alta'
          emoji = '⚠️'
        } else {
          prioridad = 'normal'
          emoji = '📅'
        }

        const titulo = `${emoji} Lote Próximo a Vencer: ${lote.codigo_lote}`
        const mensaje = `El lote ${lote.codigo_lote} de ${lote.producto?.nombre} vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} (${lote.cantidad} ${lote.producto?.unidad}). Fecha de vencimiento: ${new Date(lote.fecha_vencimiento).toLocaleDateString('es-ES')}`

        await prisma.notificaciones.create({
          data: {
            tipo: 'lote_vencimiento',
            titulo,
            mensaje,
            prioridad,
            referencia_id: lote.id,
            referencia_tipo: 'lote',
            usuario_id: null,
            leida: false
          }
        })

        console.log(`✅ Alerta lote_vencimiento creada para: ${lote.codigo_lote} (${diasRestantes} días)`)
        alertasCreadas++
      } else {
        const estadoAlerta = alertaReciente.leida ? 'LEÍDA' : 'NO LEÍDA'
        const horasDesdeCreacion = Math.floor((ahora.getTime() - new Date(alertaReciente.created_at!).getTime()) / (1000 * 60 * 60))
        console.log(`⏭️ Alerta lote_vencimiento reciente (${estadoAlerta}, hace ${horasDesdeCreacion}h) existe para: ${lote.codigo_lote} - No crear duplicado`)
      }
    }

    console.log(`✅ Total alertas de vencimiento creadas: ${alertasCreadas}`)
    return alertasCreadas
  } catch (error) {
    console.error('Error al verificar lotes próximos a vencer:', error)
    throw error
  }
}

/**
 * Limpiar alertas resueltas automáticamente
 * 
 * Marca como leídas las alertas que ya fueron resueltas:
 * - Stock agotado/bajo/exceso: Cuando el stock vuelve a niveles normales
 * - Lotes vencimiento: Cuando el lote ya no está disponible (retirado/vencido)
 * 
 * Se ejecuta periódicamente o después de operaciones que puedan resolver alertas
 * 
 * @returns {Promise<{stock: number, lotes: number}>} Alertas marcadas como leídas
 */
export async function limpiarAlertasResueltas(): Promise<{
  stock: number
  lotes: number
}> {
  try {
    let stockResueltas = 0
    let lotesResueltas = 0

    // 1. Limpiar alertas de stock (agotado, bajo, exceso)
    const alertasStock = await prisma.notificaciones.findMany({
      where: {
        tipo: {
          in: ['stock_agotado', 'stock_bajo', 'stock_exceso']
        },
        // ✅ NO filtrar por leida - limpiar TODAS las alertas resueltas
        referencia_tipo: 'producto',
        referencia_id: { not: null }
      },
      select: {
        id: true,
        tipo: true,
        referencia_id: true
      }
    })

    for (const alerta of alertasStock) {
      const producto = await prisma.productos.findUnique({
        where: { id: alerta.referencia_id! },
        select: {
          stock_actual: true,
          stock_minimo: true,
          stock_maximo: true,
          activo: true
        }
      })

      if (!producto) {
        // Producto eliminado, eliminar alerta
        await prisma.notificaciones.delete({
          where: { id: alerta.id }
        })
        stockResueltas++
        console.log(`🗑️ Alerta eliminada - Producto no existe`)
        continue
      }

      const stockActual = Number(producto.stock_actual)
      const stockMinimo = Number(producto.stock_minimo)
      const stockMaximo = producto.stock_maximo ? Number(producto.stock_maximo) : null

      let resuelta = false

      // Verificar si la alerta se resolvió según su tipo
      if (alerta.tipo === 'stock_agotado' && stockActual > 0) {
        resuelta = true
      } else if (alerta.tipo === 'stock_bajo' && stockActual >= stockMinimo) {
        resuelta = true
      } else if (alerta.tipo === 'stock_exceso' && stockMaximo && stockActual < stockMaximo) {
        resuelta = true
      } else if (!producto.activo) {
        // Producto desactivado, marcar como resuelta
        resuelta = true
      }

      if (resuelta) {
        // ✅ ELIMINAR la alerta resuelta (no marcar como leída)
        // Esto permite crear una nueva si el problema vuelve a ocurrir
        await prisma.notificaciones.delete({
          where: { id: alerta.id }
        })
        stockResueltas++
        console.log(`🗑️ Alerta ${alerta.tipo} eliminada - Problema resuelto`)
      }
    }

    // 2. Limpiar alertas de lotes cuando ya no están disponibles
    const alertasLotes = await prisma.notificaciones.findMany({
      where: {
        tipo: 'lote_vencimiento',
        // ✅ NO filtrar por leida - limpiar TODAS las alertas resueltas
        referencia_tipo: 'lote',
        referencia_id: { not: null }
      },
      select: {
        id: true,
        referencia_id: true
      }
    })

    for (const alerta of alertasLotes) {
      const lote = await prisma.lotes_productos.findUnique({
        where: { id: alerta.referencia_id! },
        select: {
          estado: true
        }
      })

      // Eliminar alerta si el lote ya no está disponible o fue eliminado
      if (!lote || lote.estado !== 'disponible') {
        // ✅ ELIMINAR la alerta resuelta (no marcar como leída)
        await prisma.notificaciones.delete({
          where: { id: alerta.id }
        })
        lotesResueltas++
        console.log(`🗑️ Alerta de lote eliminada - Lote ya no disponible`)
      }
    }

    console.log(`🧹 Alertas limpiadas - Stock: ${stockResueltas}, Lotes: ${lotesResueltas}`)
    return {
      stock: stockResueltas,
      lotes: lotesResueltas
    }
  } catch (error) {
    console.error('Error al limpiar alertas resueltas:', error)
    throw error
  }
}

/**
 * Limpiar alertas duplicadas
 * 
 * Elimina alertas duplicadas del mismo tipo y referencia,
 * manteniendo solo la más reciente.
 * 
 * Útil para limpiar duplicados creados antes de implementar
 * la validación de 24 horas.
 */
export async function limpiarAlertasDuplicadas(): Promise<{
  eliminadas: number
}> {
  try {
    console.log('🧹 Limpiando alertas duplicadas...')

    // Obtener todas las notificaciones agrupadas por tipo y referencia
    const todasNotificaciones = await prisma.notificaciones.findMany({
      where: {
        referencia_id: { not: null },
        referencia_tipo: { not: null }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Agrupar por tipo + referencia_id + referencia_tipo
    const grupos = new Map<string, typeof todasNotificaciones>()
    
    for (const notif of todasNotificaciones) {
      const key = `${notif.tipo}_${notif.referencia_id}_${notif.referencia_tipo}`
      
      if (!grupos.has(key)) {
        grupos.set(key, [])
      }
      
      grupos.get(key)!.push(notif)
    }

    let eliminadas = 0

    // Para cada grupo, mantener solo la más reciente
    for (const [key, notificaciones] of grupos) {
      if (notificaciones.length > 1) {
        // La primera es la más reciente (orderBy created_at desc)
        const mantener = notificaciones[0]
        const eliminar = notificaciones.slice(1)

        console.log(`🗑️ Grupo ${key}: Manteniendo ${mantener.id}, eliminando ${eliminar.length} duplicados`)

        // Eliminar las duplicadas
        const ids = eliminar.map(n => n.id)
        await prisma.notificaciones.deleteMany({
          where: {
            id: { in: ids }
          }
        })

        eliminadas += ids.length
      }
    }

    console.log(`✅ Alertas duplicadas eliminadas: ${eliminadas}`)
    return { eliminadas }
  } catch (error) {
    console.error('❌ Error al limpiar alertas duplicadas:', error)
    throw error
  }
}

/**
 * Ejecutar todas las verificaciones de alertas
 * 
 * Función de conveniencia para ejecutar todas las verificaciones de una vez.
 * Útil para:
 * - Cron jobs
 * - Inicialización del sistema
 * - Testing
 * 
 * @returns {Promise<{agotado: number, bajo: number, exceso: number, lotesVencimiento: number, alertasLimpiadas: object}>}
 */
export async function ejecutarVerificacionCompleta() {
  try {
    const [stockAlerts, lotesVencimiento, alertasLimpiadas] = await Promise.all([
      checkStockBajo(),
      checkLotesProximosVencer(),
      limpiarAlertasResueltas()
    ])

    return {
      ...stockAlerts,
      lotesVencimiento,
      alertasLimpiadas
    }
  } catch (error) {
    console.error('Error en verificación completa de alertas:', error)
    throw error
  }
}
