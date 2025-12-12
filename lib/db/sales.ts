import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { checkStockBajo } from './alertas'
import { getEfectivoDisponible } from './cash-sessions'

/**
 * ✅ ACTUALIZADO - FASE 1
 * Validar si hay suficiente efectivo en caja para dar cambio
 * 
 * Ahora usa getEfectivoDisponible() que considera TODAS las operaciones:
 * - Fondo inicial
 * - Ventas en efectivo
 * - Ingresos/egresos extra
 * - Retiros de caja
 * - Gastos
 * 
 * @param sessionId - ID de la sesión de caja activa
 * @param montoVenta - Monto total de la venta
 * @param montoPagado - Monto que paga el cliente
 * @returns Objeto con validación y datos de efectivo
 */
export async function validarCambioDisponible(
  sessionId: number,
  montoVenta: number,
  montoPagado: number
) {
  console.log('\n💵 [validarCambioDisponible] VALIDANDO CAMBIO:', {
    sessionId,
    montoVenta,
    montoPagado,
    cambioRequerido: montoPagado - montoVenta
  })

  const cambioRequerido = montoPagado - montoVenta
  
  // ✅ SIEMPRE obtener efectivo disponible (incluso si no requiere cambio)
  const efectivoDisponible = await getEfectivoDisponible(sessionId)
  
  // Si no requiere cambio, está OK (pero retornamos el efectivo disponible)
  if (cambioRequerido <= 0) {
    console.log('✅ [validarCambioDisponible] No requiere cambio')
    return {
      tieneEfectivo: true,
      efectivoDisponible,
      cambioRequerido: 0,
      mensaje: 'No requiere cambio'
    }
  }

  console.log('📊 [validarCambioDisponible] Resultado:', {
    efectivoDisponible,
    cambioRequerido,
    suficiente: efectivoDisponible >= cambioRequerido
  })

  const tieneEfectivo = efectivoDisponible >= cambioRequerido

  return {
    tieneEfectivo,
    efectivoDisponible,
    cambioRequerido,
    mensaje: tieneEfectivo
      ? 'Efectivo suficiente para dar cambio'
      : `Efectivo insuficiente. Disponible: $${efectivoDisponible.toLocaleString('es-CO')}, Necesario: $${cambioRequerido.toLocaleString('es-CO')}`
  }
}

/**
 * Interfaz para crear una venta
 */
export interface CreateSaleData {
  items: {
    producto_id: number
    lote_id?: number
    cantidad: number
    precio_unitario: number
    descuento_porcentaje?: number
    observaciones?: string
  }[]
  pagos: {
    metodo_pago_id: number
    monto: number
    referencia?: string
  }[]
  usuario_id: number
  cliente_id?: number
  cliente_nombre?: string
  cliente_email?: string
  cliente_telefono?: string
  descuento_global?: number
  requiere_factura?: boolean
  factura_generada?: boolean  // ✨ NUEVO: se registra atómicamente
  observaciones?: string
}

/**
 * Filtros para consultar ventas
 */
export interface SalesFilters {
  page?: number
  limit?: number
  fecha_desde?: string
  fecha_hasta?: string
  usuario_id?: number
  cliente_id?: number
  estado?: 'completada' | 'cancelada' | 'pendiente'
  metodo_pago?: number
  search?: string
}

/**
 * Paginación helper
 */
function createPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  }
}

/**
 * Obtener lote disponible usando estrategia FIFO
 * Prioriza lotes que vencen primero (si es perecedero)
 */
async function getLoteDisponibleFIFO(
  productoId: number,
  cantidadNecesaria: number,
  tx: Prisma.TransactionClient
) {
  // Obtener información del producto
  const producto = await tx.productos.findUnique({
    where: { id: productoId },
    select: {
      es_perecedero: true,
      stock_actual: true,
      nombre: true,
    },
  })

  console.log('🔍 DEBUG getLoteDisponibleFIFO:', {
    productoId,
    cantidadNecesaria,
    producto,
    stockActual: producto?.stock_actual,
    stockNumero: producto?.stock_actual ? Number(producto.stock_actual) : null
  })

  if (!producto) {
    throw new Error(`Producto con ID ${productoId} no encontrado`)
  }

  // Verificar stock disponible
  const stockDisponible = Number(producto.stock_actual)
  
  console.log('📊 Verificación stock:', {
    stockDisponible,
    cantidadNecesaria,
    suficiente: stockDisponible >= cantidadNecesaria
  })
  
  if (stockDisponible < cantidadNecesaria) {
    throw new Error(
      `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, Necesario: ${cantidadNecesaria}`
    )
  }

  // Buscar lotes disponibles ordenados por FIFO
  const lotes = await tx.lotes_productos.findMany({
    where: {
      producto_id: productoId,
      estado: 'disponible',
      cantidad: {
        gt: 0, // Solo lotes con cantidad mayor a 0
      },
    },
    orderBy: producto.es_perecedero
      ? [
          { fecha_vencimiento: 'asc' }, // Primero que vence, primero que sale
          { created_at: 'asc' }, // Si tienen la misma fecha de vencimiento, el más antiguo
        ]
      : [{ created_at: 'asc' }], // Si no es perecedero, solo FIFO por fecha de creación
    select: {
      id: true,
      codigo_lote: true,
      cantidad: true,
      fecha_vencimiento: true,
      producto: {
        select: {
          nombre: true,
        },
      },
    },
  })

  if (lotes.length === 0) {
    throw new Error(`No hay lotes disponibles para el producto ${producto.nombre}`)
  }

  // Verificar si hay lotes vencidos
  const ahora = new Date()
  const lotesVencidos = lotes.filter(
    (lote) => lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < ahora
  )

  if (lotesVencidos.length > 0) {
    console.warn(
      `⚠️ Se encontraron ${lotesVencidos.length} lotes vencidos para ${producto.nombre}:`,
      lotesVencidos.map((l) => l.codigo_lote)
    )
    // Marcar lotes vencidos automáticamente
    await tx.lotes_productos.updateMany({
      where: {
        id: {
          in: lotesVencidos.map((l) => l.id),
        },
      },
      data: {
        estado: 'vencido',
      },
    })
  }

  // Usar solo lotes no vencidos
  const lotesValidos = lotes.filter(
    (lote) => !lote.fecha_vencimiento || new Date(lote.fecha_vencimiento) >= ahora
  )

  if (lotesValidos.length === 0) {
    throw new Error(
      `Todos los lotes del producto ${producto.nombre} están vencidos. No se puede procesar la venta.`
    )
  }

  return lotesValidos
}

/**
 * Descontar stock de lotes usando FIFO
 * Puede usar múltiples lotes si uno solo no tiene suficiente cantidad
 * 
 * ⚠️ IMPORTANTE: Esta función SOLO actualiza los lotes_productos.
 * El stock del producto se actualiza AUTOMÁTICAMENTE por el trigger SQL
 * cuando el lote cambia de estado o cantidad. NO actualizar manualmente
 * el producto aquí para evitar DOBLE DESCUENTO.
 */
async function descontarStockDeLotes(
  productoId: number,
  cantidadTotal: number,
  tx: Prisma.TransactionClient
) {
  const lotesUsados: { lote_id: number; cantidad: number; codigo_lote: string }[] = []
  let cantidadRestante = cantidadTotal

  // Obtener lotes disponibles en orden FIFO
  const lotesDisponibles = await getLoteDisponibleFIFO(productoId, cantidadTotal, tx)

  for (const lote of lotesDisponibles) {
    if (cantidadRestante <= 0) break

    const cantidadEnLote = Number(lote.cantidad)
    const cantidadADescontar = Math.min(cantidadRestante, cantidadEnLote)
    const nuevaCantidad = cantidadEnLote - cantidadADescontar

    // ✅ SOLO actualizar el lote - el trigger SQL actualizará el producto automáticamente
    await tx.lotes_productos.update({
      where: { id: lote.id },
      data: {
        cantidad: nuevaCantidad,
        estado: nuevaCantidad === 0 ? 'retirado' : 'disponible',
      },
    })

    lotesUsados.push({
      lote_id: lote.id,
      cantidad: cantidadADescontar,
      codigo_lote: lote.codigo_lote,
    })

    cantidadRestante -= cantidadADescontar

    console.log(
      `✅ Descontado ${cantidadADescontar} unidades del lote ${lote.codigo_lote} (quedan ${nuevaCantidad})`
    )
  }

  if (cantidadRestante > 0) {
    throw new Error(
      `No se pudo descontar toda la cantidad solicitada. Faltaron ${cantidadRestante} unidades.`
    )
  }

  return lotesUsados
}

/**
 * Crear una nueva venta completa
 * Usa transacción para garantizar consistencia de datos
 */
export async function createSale(data: CreateSaleData, sessionId?: number) {
  try {
    console.log(`🛒 Iniciando creación de venta con ${data.items.length} items`)

    // Ejecutar toda la operación en una transacción
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Calcular totales
        let subtotal = 0
        const itemsConDescuento = data.items.map((item) => {
          const descuento = item.descuento_porcentaje || 0
          const subtotalItem = item.cantidad * item.precio_unitario * (1 - descuento / 100)
          subtotal += subtotalItem
          return {
            ...item,
            subtotal: subtotalItem,
          }
        })

        // Aplicar descuento global si existe
        const descuentoGlobal = data.descuento_global || 0
        const descuentoMonto = subtotal * (descuentoGlobal / 100)
        const subtotalConDescuento = subtotal - descuentoMonto

        // Calcular impuesto (IVA 19%)
        const impuesto = subtotalConDescuento * 0.19
        const total = subtotalConDescuento + impuesto

        console.log(`💰 Totales calculados:`, {
          subtotal: subtotal.toFixed(2),
          descuento: descuentoMonto.toFixed(2),
          impuesto: impuesto.toFixed(2),
          total: total.toFixed(2),
        })

        // 1.5. Validar cambio disponible si es pago en efectivo
        if (sessionId) {
          // Verificar si algún pago es en efectivo
          const pagosEfectivo = data.pagos.filter(p => {
            // Asumimos que el método de pago ID 1 es efectivo
            // En producción, verificar contra la tabla metodos_pago
            return p.metodo_pago_id === 1
          })

          if (pagosEfectivo.length > 0) {
            // Calcular monto total pagado en efectivo
            const montoPagadoEfectivo = pagosEfectivo.reduce((sum, p) => sum + p.monto, 0)
            
            // Solo validar si el monto pagado es mayor que el total (requiere cambio)
            if (montoPagadoEfectivo > total) {
              // Obtener resumen fuera de la transacción para no bloquear
              const efectivoDisponible = await prisma.$queryRaw<[{ efectivo_esperado: number }]>`
                SELECT 
                  COALESCE(
                    (SELECT fondo_inicial FROM sesiones_caja WHERE id = ${sessionId}),
                    0
                  ) + 
                  COALESCE(
                    (SELECT SUM(total) FROM ventas v 
                     WHERE EXISTS (
                       SELECT 1 FROM pagos_venta pv 
                       INNER JOIN metodos_pago mp ON pv.metodo_pago_id = mp.id
                       WHERE pv.venta_id = v.id AND LOWER(mp.nombre) = 'efectivo'
                     )
                     AND v.fecha_venta >= (SELECT fecha_apertura FROM sesiones_caja WHERE id = ${sessionId})
                    ),
                    0
                  ) +
                  COALESCE(
                    (SELECT SUM(monto) FROM movimientos_caja 
                     WHERE sesion_caja_id = ${sessionId} 
                     AND tipo_movimiento = 'ingreso_adicional' 
                     AND metodo_pago = 'efectivo'
                    ),
                    0
                  ) -
                  COALESCE(
                    (SELECT SUM(monto) FROM retiros_caja 
                     WHERE sesion_caja_id = ${sessionId} 
                     AND estado = 'aprobado'
                    ),
                    0
                  ) -
                  COALESCE(
                    (SELECT SUM(monto) FROM gastos_caja 
                     WHERE sesion_caja_id = ${sessionId}
                    ),
                    0
                  ) -
                  COALESCE(
                    (SELECT SUM(monto) FROM movimientos_caja 
                     WHERE sesion_caja_id = ${sessionId} 
                     AND tipo_movimiento = 'egreso_operativo' 
                     AND metodo_pago = 'efectivo'
                    ),
                    0
                  ) as efectivo_esperado
              `
              
              const efectivo = efectivoDisponible[0]?.efectivo_esperado || 0
              const cambioRequerido = montoPagadoEfectivo - total
              
              console.log('💵 Validación de cambio:', {
                efectivoDisponible: efectivo,
                montoPagado: montoPagadoEfectivo,
                montoVenta: total,
                cambioRequerido,
                suficiente: efectivo >= cambioRequerido
              })

              if (efectivo < cambioRequerido) {
                throw new Error(
                  `⚠️ Efectivo insuficiente para dar cambio. ` +
                  `Disponible en caja: $${efectivo.toLocaleString('es-CO')}, ` +
                  `Cambio requerido: $${cambioRequerido.toLocaleString('es-CO')}. ` +
                  `Sugerencia: Use pago exacto, tarjeta o pago mixto.`
                )
              }

              console.log('✅ Efectivo suficiente para dar cambio')
            }
          }
        }

        // 2. Generar código único de venta
        const codigoVenta = `VTA-${Date.now()}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0')}`

        // 3. Crear el registro de venta
        const venta = await tx.ventas.create({
          data: {
            codigo_venta: codigoVenta,
            usuario_id: data.usuario_id,
            cliente_id: data.cliente_id,
            cliente_nombre: data.cliente_nombre,
            cliente_email: data.cliente_email,
            cliente_telefono: data.cliente_telefono,
            subtotal,
            descuento: descuentoMonto,
            impuesto,
            total,
            requiere_factura: data.requiere_factura || false,
            factura_generada: data.factura_generada || false,  // ✨ NUEVO: registro atómico
            observaciones: data.observaciones,
            estado: 'completada',
          },
        })

        console.log(`✅ Venta creada: ${codigoVenta} (ID: ${venta.id})`)

        // 4. Procesar cada item de la venta
        for (const item of itemsConDescuento) {
          // Obtener stock anterior
          const producto = await tx.productos.findUnique({
            where: { id: item.producto_id },
            select: { stock_actual: true, nombre: true }
          })

          const stockAnterior = Number(producto!.stock_actual)
          
          // Descontar stock usando FIFO
          const lotesUsados = await descontarStockDeLotes(
            item.producto_id,
            item.cantidad,
            tx
          )

          // Crear detalle de venta para cada lote usado
          for (const loteUsado of lotesUsados) {
            await tx.detalle_ventas.create({
              data: {
                venta_id: venta.id,
                producto_id: item.producto_id,
                lote_id: loteUsado.lote_id,
                cantidad: loteUsado.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal: loteUsado.cantidad * item.precio_unitario,
              },
            })

            console.log(
              `  📦 Item creado: ${loteUsado.cantidad} unidades del lote ${loteUsado.codigo_lote}`
            )
          }

          // ❌ REMOVIDO: NO actualizar stock manualmente - el trigger SQL lo hace automáticamente
          // El stock se actualiza por el trigger cuando se descuenta el lote en descontarStockDeLotes()
          // Mantener este UPDATE causaría DOBLE DESCUENTO
          
          console.log(`  ✅ Stock del producto ${producto!.nombre} será actualizado automáticamente por el trigger SQL`)

          // ✅ NUEVO: Registrar en historial_inventario para trazabilidad completa
          const stockNuevo = stockAnterior - item.cantidad
          
          await tx.historial_inventario.create({
            data: {
              producto_id: item.producto_id,
              tipo_movimiento: 'venta',
              cantidad_anterior: stockAnterior,
              cantidad_movimiento: item.cantidad,
              cantidad_nueva: stockNuevo,
              usuario_id: data.usuario_id,
              referencia_id: venta.id,
              referencia_tipo: 'venta',
              observaciones: `Venta ${codigoVenta} - ${item.cantidad} ${producto!.nombre}`,
              fecha_movimiento: new Date(),
            },
          })

          console.log(
            `  📝 Historial registrado: ${producto!.nombre} ${stockAnterior} → ${stockNuevo}`
          )
        }

        // 5. Registrar métodos de pago
        for (const pago of data.pagos) {
          await tx.pagos_venta.create({
            data: {
              venta_id: venta.id,
              metodo_pago_id: pago.metodo_pago_id,
              monto: pago.monto,
              referencia: pago.referencia,
            },
          })

          console.log(`💳 Pago registrado: $${pago.monto} (método ID: ${pago.metodo_pago_id})`)
        }

        // 6. Retornar venta completa con relaciones
        return tx.ventas.findUnique({
          where: { id: venta.id },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
              },
            },
            detalle_ventas: {
              include: {
                producto: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                    unidad: true,
                    imagen_url: true,
                  },
                },
                lote: {
                  select: {
                    id: true,
                    codigo_lote: true,
                    fecha_vencimiento: true,
                  },
                },
              },
            },
            pagos_venta: {
              include: {
                metodo_pago: {
                  select: {
                    id: true,
                    nombre: true,
                    icono: true,
                  },
                },
              },
            },
            cliente: true,
          },
        })
      },
      {
        maxWait: 10000, // Tiempo máximo de espera: 10 segundos
        timeout: 20000, // Timeout de la transacción: 20 segundos
      }
    )

    console.log(`🎉 Venta completada exitosamente: ${result?.codigo_venta}`)

    // 7. Verificar alertas de stock bajo (fuera de la transacción)
    try {
      // Ejecutar verificación de alertas de forma asíncrona sin bloquear
      await checkStockBajo()
    } catch (alertError) {
      console.error('Error al verificar alertas de stock bajo:', alertError)
      // No fallar la venta por error en alertas
    }

    return result
  } catch (error) {
    console.error('❌ Error al crear venta:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al procesar la venta')
  }
}

/**
 * Obtener lista de ventas con filtros y paginación
 */
export async function getSales(filters?: SalesFilters) {
  const where: Prisma.ventasWhereInput = {
    deleted_at: null, // Excluir ventas eliminadas (soft delete)
  }

  // Filtro por rango de fechas
  if (filters?.fecha_desde || filters?.fecha_hasta) {
    where.fecha_venta = {}
    if (filters.fecha_desde) {
      where.fecha_venta.gte = new Date(filters.fecha_desde)
    }
    if (filters.fecha_hasta) {
      where.fecha_venta.lte = new Date(filters.fecha_hasta)
    }
  }

  // Filtro por usuario (cajero)
  if (filters?.usuario_id) {
    where.usuario_id = filters.usuario_id
  }

  // Filtro por cliente
  if (filters?.cliente_id) {
    where.cliente_id = filters.cliente_id
  }

  // Filtro por estado
  if (filters?.estado) {
    where.estado = filters.estado
  }

  // Filtro por método de pago
  if (filters?.metodo_pago) {
    where.pagos_venta = {
      some: {
        metodo_pago_id: filters.metodo_pago,
      },
    }
  }

  // Búsqueda por código de venta o nombre de cliente
  if (filters?.search) {
    where.OR = [
      {
        codigo_venta: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        cliente_nombre: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ]
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  try {
    const [ventas, total] = await Promise.all([
      prisma.ventas.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_venta: 'desc' },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
            },
          },
          cliente: {
            select: {
              id: true,
              nombre: true,
              tipo_cliente: true,
            },
          },
          pagos_venta: {
            include: {
              metodo_pago: {
                select: {
                  nombre: true,
                  icono: true,
                },
              },
            },
          },
          _count: {
            select: {
              detalle_ventas: true,
            },
          },
        },
      }),
      prisma.ventas.count({ where }),
    ])

    return {
      data: ventas,
      pagination: createPaginationMeta(page, limit, total),
    }
  } catch (error) {
    console.error('Error fetching sales:', error)
    throw new Error('Error al obtener ventas')
  }
}

/**
 * Obtener una venta por ID con todos sus detalles
 */
export async function getSaleById(id: number) {
  try {
    const venta = await prisma.ventas.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        cliente: true,
        detalle_ventas: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                unidad: true,
                imagen_url: true,
                categoria: {
                  select: {
                    nombre: true,
                    color: true,
                    icono: true,
                  },
                },
              },
            },
            lote: {
              select: {
                id: true,
                codigo_lote: true,
                fecha_vencimiento: true,
                fecha_produccion: true,
              },
            },
          },
        },
        pagos_venta: {
          include: {
            metodo_pago: {
              select: {
                id: true,
                nombre: true,
                icono: true,
                descripcion: true,
              },
            },
          },
        },
      },
    })

    if (!venta) {
      throw new Error('Venta no encontrada')
    }

    return venta
  } catch (error) {
    console.error('Error fetching sale by id:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al obtener venta')
  }
}

/**
 * Cancelar una venta (soft delete)
 * Opcional: reintegrar stock a los lotes
 */
export async function cancelSale(
  id: number,
  motivo: string,
  requiere_reintegro_stock: boolean = true
) {
  try {
    console.log(`🚫 Cancelando venta ID: ${id}`)

    return await prisma.$transaction(async (tx) => {
      // Obtener la venta con sus detalles
      const venta = await tx.ventas.findUnique({
        where: { id },
        include: {
          detalle_ventas: true,
        },
      })

      if (!venta) {
        throw new Error('Venta no encontrada')
      }

      if (venta.estado === 'cancelada') {
        throw new Error('La venta ya está cancelada')
      }

      if (venta.deleted_at) {
        throw new Error('La venta ya fue eliminada')
      }

      // Si se requiere reintegrar stock
      if (requiere_reintegro_stock) {
        for (const detalle of venta.detalle_ventas) {
          // Reintegrar al lote
          if (detalle.lote_id) {
            await tx.lotes_productos.update({
              where: { id: detalle.lote_id },
              data: {
                cantidad: {
                  increment: Number(detalle.cantidad),
                },
                estado: 'disponible', // Reactivar si estaba retirado
              },
            })
          }

          // Reintegrar al producto
          if (detalle.producto_id) {
            await tx.productos.update({
              where: { id: detalle.producto_id as number },
              data: {
                stock_actual: {
                  increment: Number(detalle.cantidad),
                },
              },
            })
          }

          console.log(
            `  ↩️ Stock reintegrado: ${detalle.cantidad} unidades al lote ID ${detalle.lote_id}`
          )
        }
      }

      // Actualizar estado de la venta (soft delete)
      const ventaCancelada = await tx.ventas.update({
        where: { id },
        data: {
          estado: 'cancelada',
          deleted_at: new Date(), // Soft delete
          observaciones: `${venta.observaciones || ''}\n\n[CANCELADA] ${motivo}`.trim(),
        },
        include: {
          usuario: true,
          detalle_ventas: {
            include: {
              producto: true,
              lote: true,
            },
          },
          pagos_venta: {
            include: {
              metodo_pago: true,
            },
          },
        },
      })

      console.log(`✅ Venta ${venta.codigo_venta} cancelada exitosamente`)

      return ventaCancelada
    })
  } catch (error) {
    console.error('Error al cancelar venta:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al cancelar venta')
  }
}
