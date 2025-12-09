import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { createPaginationMeta } from '@/lib/validations/common.schema'
import type {
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  AdjustStockData,
} from '@/lib/validations/product.schema'
import { getColombiaDate } from '@/lib/date-utils'

/**
 * Funciones de base de datos para Productos
 * 
 * CRUD completo con:
 * - Gestión de stock con historial
 * - Búsqueda avanzada con 12 filtros
 * - Alertas de stock bajo/agotado
 * - Control de vencimientos
 * - Soft delete
 * - Relaciones con categorías y unidades
 */

// =====================================================
// LISTAR PRODUCTOS
// =====================================================

/**
 * Obtiene todos los productos con paginación y filtros avanzados
 */
export async function getProducts(filters?: ProductFilters) {
  const where: Prisma.productosWhereInput = {}

  // Búsqueda por nombre, código o descripción
  if (filters?.search) {
    where.OR = [
      {
        nombre: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        codigo: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        descripcion: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ]
  }

  // Filtro por categoría
  if (filters?.categoria_id) {
    where.categoria_id = filters.categoria_id
  }

  // Filtro por unidad productiva
  if (filters?.unidad_productiva_id) {
    where.unidad_productiva_id = filters.unidad_productiva_id
  }

  // Filtro por estado activo
  if (filters?.activo !== undefined) {
    where.activo = filters.activo
  }

  // Filtro por tipo de medida
  if (filters?.tipo_medida) {
    where.tipo_medida = filters.tipo_medida
  }

  // Filtro por perecedero
  if (filters?.es_perecedero !== undefined) {
    where.es_perecedero = filters.es_perecedero
  }

  // Filtro por proveedor
  if (filters?.proveedor_id) {
    where.proveedor_id = filters.proveedor_id
  }

  // Filtro por rango de precio
  if (filters?.precio_min !== undefined || filters?.precio_max !== undefined) {
    where.precio_unitario = {}
    if (filters.precio_min !== undefined) {
      where.precio_unitario.gte = filters.precio_min
    }
    if (filters.precio_max !== undefined) {
      where.precio_unitario.lte = filters.precio_max
    }
  }

  // Filtro por estado de stock
  let filterStockStatusAfter = false
  let stockStatusFilter = null
  
  if (filters?.stock_status) {
    stockStatusFilter = filters.stock_status
    
    switch (filters.stock_status) {
      case 'agotado':
        // Agotado: stock_actual <= 0
        where.stock_actual = { lte: 0 }
        break
      case 'bajo':
        // Bajo stock: 0 < stock_actual <= stock_minimo
        // Como Prisma no permite comparar columnas, filtramos después de la consulta
        where.stock_actual = { gt: 0 }
        where.stock_minimo = { not: null }
        filterStockStatusAfter = true
        break
      case 'disponible':
        // Disponible: stock_minimo < stock_actual < stock_maximo (o sin límites definidos)
        // Como requiere comparar columnas, filtramos después de la consulta
        where.stock_actual = { gt: 0 }
        filterStockStatusAfter = true
        break
      case 'sobre_exceso':
        // Sobre exceso: stock_actual >= stock_maximo
        // Como Prisma no permite comparar columnas, filtramos después de la consulta
        where.stock_maximo = { not: null }
        filterStockStatusAfter = true
        break
    }
  }

  // Filtro por stock mínimo
  if (filters?.stock_min !== undefined) {
    where.stock_actual = {
      ...where.stock_actual,
      gte: filters.stock_min,
    }
  }

  // Filtro por stock máximo
  if (filters?.stock_max !== undefined) {
    where.stock_actual = {
      ...where.stock_actual,
      lte: filters.stock_max,
    }
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  // Ordenamiento
  let orderBy: Prisma.productosOrderByWithRelationInput = { nombre: 'asc' }
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case 'precio_asc':
        orderBy = { precio_unitario: 'asc' }
        break
      case 'precio_desc':
        orderBy = { precio_unitario: 'desc' }
        break
      case 'stock_asc':
        orderBy = { stock_actual: 'asc' }
        break
      case 'stock_desc':
        orderBy = { stock_actual: 'desc' }
        break
      case 'nombre_asc':
        orderBy = { nombre: 'asc' }
        break
      case 'nombre_desc':
        orderBy = { nombre: 'desc' }
        break
      case 'fecha_creacion':
        orderBy = { created_at: 'desc' }
        break
    }
  }

  try {
    // Si necesitamos filtrar por comparación de columnas, obtenemos datos y filtramos después
    let products, total
    
    if (filterStockStatusAfter) {
      // Obtener todos los productos que cumplan el where básico
      const allProducts = await prisma.productos.findMany({
        where,
        orderBy,
        select: {
          id: true,
          codigo: true,
          nombre: true,
          descripcion: true,
          precio_unitario: true,
          precio_mayorista: true,
          stock_actual: true,
          stock_minimo: true,
          stock_maximo: true,
          unidad: true,
          tipo_medida: true,
          imagen_url: true,
          es_perecedero: true,
          dias_vencimiento: true,
          activo: true,
          created_at: true,
          categoria: {
            select: {
              id: true,
              nombre: true,
              icono: true,
              color: true,
            },
          },
          unidad_productiva: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
          proveedor: {
            select: {
              id: true,
              nombre: true,
              contacto_telefono: true,
            },
          },
        },
      })
      
      // Filtrar según el estado de stock
      const filtered = allProducts.filter(p => {
        const stockActual = Number(p.stock_actual) || 0
        const stockMinimo = p.stock_minimo ? Number(p.stock_minimo) : null
        const stockMaximo = p.stock_maximo ? Number(p.stock_maximo) : null
        
        switch (stockStatusFilter) {
          case 'bajo':
            // Bajo: 0 < stock_actual <= stock_minimo
            return stockMinimo !== null && stockActual > 0 && stockActual <= stockMinimo
          
          case 'disponible':
            // Disponible: stock_minimo < stock_actual < stock_maximo
            // O si no hay límites definidos, cualquier stock > 0
            if (stockMaximo !== null && stockActual >= stockMaximo) {
              return false // Es sobre exceso
            }
            if (stockMinimo !== null && stockActual <= stockMinimo) {
              return false // Es bajo o agotado
            }
            return stockActual > 0
          
          case 'sobre_exceso':
            // Sobre exceso: stock_actual >= stock_maximo
            return stockMaximo !== null && stockActual >= stockMaximo
          
          default:
            return true
        }
      })
      
      // Aplicar paginación manualmente
      total = filtered.length
      products = filtered.slice(skip, skip + limit)
    } else {
      // Para otros filtros (agotado), usar la consulta normal con paginación de Prisma
      [products, total] = await Promise.all([
        prisma.productos.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            codigo: true,
            nombre: true,
            descripcion: true,
            precio_unitario: true,
            precio_mayorista: true,
            stock_actual: true,
            stock_minimo: true,
            stock_maximo: true,
            unidad: true,
            tipo_medida: true,
            imagen_url: true,
            es_perecedero: true,
            dias_vencimiento: true,
            activo: true,
            created_at: true,
            categoria: {
              select: {
                id: true,
                nombre: true,
                icono: true,
                color: true,
              },
            },
            unidad_productiva: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
            proveedor: {
              select: {
                id: true,
                nombre: true,
                contacto_telefono: true,
              },
            },
          },
        }),
        prisma.productos.count({ where }),
      ])
    }

    return {
      data: products,
      pagination: createPaginationMeta(page, limit, total),
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    throw new Error('Error al obtener productos')
  }
}

// =====================================================
// OBTENER UN PRODUCTO
// =====================================================

/**
 * Obtiene un producto por ID con información completa
 */
export async function getProductById(id: number) {
  try {
    const product = await prisma.productos.findUnique({
      where: { id },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            icono: true,
            color: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
          },
        },
        proveedor: {
          select: {
            id: true,
            nombre: true,
            contacto_nombre: true,
            contacto_telefono: true,
            contacto_email: true,
          },
        },
        historial_inventario: {
          orderBy: { fecha_movimiento: 'desc' },
          take: 10,
          select: {
            id: true,
            tipo_movimiento: true,
            cantidad_movimiento: true,
            cantidad_anterior: true,
            cantidad_nueva: true,
            observaciones: true,
            fecha_movimiento: true,
          },
        },
        _count: {
          select: {
            detalle_ventas: true,
            historial_inventario: true,
            lotes_productos: true,
          },
        },
      },
    })

    if (!product) {
      throw new Error('Producto no encontrado')
    }

    return product
  } catch (error) {
    console.error('Error fetching product:', error)
    throw new Error('Error al obtener producto')
  }
}

// =====================================================
// CREAR PRODUCTO
// =====================================================

/**
 * Crea un nuevo producto con código autogenerado
 */
export async function createProduct(data: CreateProductData) {
  try {
    // Generar código único si no se proporciona
    let codigo = data.codigo
    if (!codigo) {
      // Formato: CAT-0001, CAT-0002, etc.
      const category = await prisma.categorias.findUnique({
        where: { id: data.categoria_id },
        select: { nombre: true },
      })

      const prefix = category?.nombre.substring(0, 3).toUpperCase() || 'PRD'
      
      const lastProduct = await prisma.productos.findFirst({
        where: {
          codigo: {
            startsWith: prefix,
          },
        },
        orderBy: {
          codigo: 'desc',
        },
        select: {
          codigo: true,
        },
      })

      if (lastProduct) {
        const lastNumber = parseInt(lastProduct.codigo.split('-')[1] || '0')
        codigo = `${prefix}-${String(lastNumber + 1).padStart(4, '0')}`
      } else {
        codigo = `${prefix}-0001`
      }
    }

    // Verificar que no exista un producto con el mismo código
    const existingCode = await prisma.productos.findUnique({
      where: { codigo },
    })

    if (existingCode) {
      throw new Error('Ya existe un producto con ese código')
    }

    // Crear el producto
    const product = await prisma.productos.create({
      data: {
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria_id ? {
          connect: { id: data.categoria_id }
        } : undefined,
        unidad_productiva: data.unidad_productiva_id ? {
          connect: { id: data.unidad_productiva_id }
        } : undefined,
        precio_unitario: data.precio_unitario,
        precio_mayorista: data.precio_mayorista,
        stock_actual: data.stock_inicial || 0,
        stock_minimo: data.stock_minimo,
        stock_maximo: data.stock_maximo,
        unidad: data.unidad,
        tipo_medida: data.tipo_medida,
        es_perecedero: data.es_perecedero,
        dias_vencimiento: data.dias_vencimiento,
        proveedor: data.proveedor_id ? {
          connect: { id: data.proveedor_id }
        } : undefined,
        imagen_url: data.imagen_url,
        activo: true,
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            color: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    // Registrar historial inicial si hay stock
    if (data.stock_inicial && data.stock_inicial > 0 && data.usuario_id) {
      await prisma.historial_inventario.create({
        data: {
          producto: {
            connect: { id: product.id }
          },
          tipo_movimiento: 'entrada',
          cantidad_movimiento: data.stock_inicial,
          cantidad_anterior: 0,
          cantidad_nueva: data.stock_inicial,
          observaciones: 'Stock inicial',
          usuario_id: data.usuario_id,
        },
      })
    }

    // Registrar creación en auditoría
    if (data.usuario_id) {
      await prisma.auditoria.create({
        data: {
          tabla: 'productos',
          registro_id: product.id,
          accion: 'CREATE',
          usuario_id: data.usuario_id,
          datos_nuevos: product,
        },
      })
    }

    return product
  } catch (error) {
    console.error('Error creating product:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al crear producto')
  }
}

// =====================================================
// ACTUALIZAR PRODUCTO
// =====================================================

/**
 * Actualiza un producto existente
 * Registra los cambios en la tabla de auditoría
 */
export async function updateProduct(id: number, data: UpdateProductData) {
  try {
    // Verificar que el producto existe y obtener datos anteriores
    const existing = await prisma.productos.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Producto no encontrado')
    }

    // Actualizar producto (el stock se maneja con adjustStock)
    const product = await prisma.productos.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria_id ? {
          connect: { id: data.categoria_id }
        } : undefined,
        unidad_productiva: data.unidad_productiva_id ? {
          connect: { id: data.unidad_productiva_id }
        } : undefined,
        precio_unitario: data.precio_unitario,
        precio_mayorista: data.precio_mayorista,
        stock_minimo: data.stock_minimo,
        stock_maximo: data.stock_maximo,
        unidad: data.unidad,
        tipo_medida: data.tipo_medida,
        es_perecedero: data.es_perecedero,
        dias_vencimiento: data.dias_vencimiento,
        proveedor: data.proveedor_id ? {
          connect: { id: data.proveedor_id }
        } : undefined,
        es_produccion_propia: data.es_produccion_propia,
        imagen_url: data.imagen_url,
        activo: data.activo,
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            color: true,
          },
        },
        unidad_productiva: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    // Registrar en auditoría
    if (data.usuario_id) {
      await prisma.auditoria.create({
        data: {
          tabla: 'productos',
          registro_id: id,
          accion: 'UPDATE',
          usuario_id: data.usuario_id,
          datos_anteriores: existing,
          datos_nuevos: product,
        },
      })
    }

    return product
  } catch (error) {
    console.error('Error updating product:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al actualizar producto')
  }
}

// =====================================================
// ELIMINAR PRODUCTO (SOFT DELETE)
// =====================================================

/**
 * Desactiva un producto (soft delete)
 * @param id - ID del producto a desactivar
 * @param usuario_id - ID del usuario que realiza la acción
 * @param retireLotes - Si es true, retira automáticamente todos los lotes disponibles
 */
export async function deleteProduct(id: number, usuario_id?: number, retireLotes: boolean = false) {
  try {
    console.log('🔍 Iniciando desactivación de producto:', { id, retireLotes })
    
    // Verificar que el producto existe
    const existing = await prisma.productos.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        activo: true,
      },
    })

    if (!existing) {
      console.error('❌ Producto no encontrado:', id)
      throw new Error('Producto no encontrado')
    }

    if (!existing.activo) {
      console.warn('⚠️ El producto ya está desactivado:', id)
      throw new Error('El producto ya está desactivado')
    }

    // Usar transacción para garantizar atomicidad
    await prisma.$transaction(async (tx) => {
      // Si retireLotes es true, retirar todos los lotes disponibles
      if (retireLotes) {
        console.log('🔄 Retirando lotes disponibles para producto:', id)
        
        // Primero contar cuántos lotes hay disponibles
        const lotesDisponibles = await tx.lotes_productos.count({
          where: {
            producto_id: id,
            estado: 'disponible',
          },
        })

        console.log(`📦 Lotes disponibles encontrados: ${lotesDisponibles}`)

        if (lotesDisponibles > 0) {
          // Actualizar los lotes a estado 'retirado'
          const lotesActualizados = await tx.lotes_productos.updateMany({
            where: {
              producto_id: id,
              estado: 'disponible',
            },
            data: {
              estado: 'retirado',
            },
          })

          console.log(`✅ Lotes actualizados: ${lotesActualizados.count}`)

          // Registrar en auditoría el retiro masivo de lotes
          if (usuario_id) {
            console.log('📝 Registrando auditoría de retiro de lotes')
            await tx.auditoria.create({
              data: {
                tabla: 'lotes_productos',
                registro_id: id,
                accion: 'UPDATE_BATCH',
                usuario_id: usuario_id,
                datos_anteriores: { 
                  producto_id: id,
                  estado: 'disponible',
                  cantidad_lotes: lotesActualizados.count,
                  motivo: 'Desactivación de producto con retiro automático de lotes'
                },
                datos_nuevos: { 
                  estado: 'retirado',
                  lotes_afectados: lotesActualizados.count
                },
                fecha: getColombiaDate(),
              },
            })
          }
        } else {
          console.log('ℹ️ No hay lotes disponibles para retirar')
        }
      }

      // Soft delete (desactivar producto)
      console.log('🔒 Desactivando producto:', id)
      await tx.productos.update({
        where: { id },
        data: { 
          activo: false,
          updated_at: getColombiaDate()
        },
      })

      // Registrar en auditoría la desactivación del producto
      if (usuario_id) {
        console.log('📝 Registrando auditoría de desactivación de producto')
        await tx.auditoria.create({
          data: {
            tabla: 'productos',
            registro_id: id,
            accion: 'UPDATE',
            usuario_id: usuario_id,
            datos_anteriores: { activo: existing.activo },
            datos_nuevos: { 
              activo: false,
              lotes_retirados: retireLotes
            },
            fecha: getColombiaDate(),
          },
        })
      }
    })

    console.log('✅ Producto desactivado exitosamente:', { id, nombre: existing.nombre })

    return { 
      success: true, 
      message: retireLotes 
        ? 'Producto desactivado y lotes retirados exitosamente' 
        : 'Producto desactivado exitosamente'
    }
  } catch (error) {
    console.error('❌ Error al desactivar producto:', error)
    
    // Manejo específico de errores de Prisma
    if (error instanceof Error) {
      // Si es un error de validación del modelo
      if (error.message.includes('column') || error.message.includes('field')) {
        console.error('🔴 Error de schema detectado:', error.message)
        throw new Error('Error de configuración del sistema. Por favor contacte al administrador.')
      }
      
      // Si es un error de producto no encontrado o ya desactivado
      if (error.message.includes('no encontrado') || error.message.includes('desactivado')) {
        throw error
      }
      
      // Error genérico con el mensaje original
      throw new Error(`Error al desactivar producto: ${error.message}`)
    }
    
    throw new Error('Error inesperado al desactivar producto')
  }
}

// =====================================================
// AJUSTAR STOCK
// =====================================================

/**
 * Ajusta el stock de un producto con registro en historial
 */
export async function adjustStock(data: AdjustStockData) {
  try {
    // Validar que usuario_id no sea null o undefined
    if (!data.usuario_id) {
      throw new Error('El usuario_id es requerido para ajustar stock')
    }

    const product = await prisma.productos.findUnique({
      where: { id: data.producto_id },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        stock_actual: true,
        activo: true,
      },
    })

    if (!product) {
      throw new Error('Producto no encontrado')
    }

    if (!product.activo) {
      throw new Error('No se puede ajustar stock de un producto inactivo')
    }

    const stockAnterior = Number(product.stock_actual)
    let stockNuevo: number

    switch (data.tipo_movimiento) {
      case 'entrada':
        stockNuevo = stockAnterior + data.cantidad
        break
      case 'salida':
        stockNuevo = stockAnterior - data.cantidad
        if (stockNuevo < 0) {
          throw new Error(`Stock insuficiente. Stock actual: ${stockAnterior}`)
        }
        break
      case 'ajuste':
        stockNuevo = data.cantidad
        break
      default:
        throw new Error('Tipo de movimiento no válido')
    }

    // Usar una única fecha para ambos registros
    const fechaMovimiento = getColombiaDate()

    // Actualizar stock en transacción con auditoría
    const [updatedProduct, historial] = await prisma.$transaction([
      prisma.productos.update({
        where: { id: data.producto_id },
        data: { 
          stock_actual: stockNuevo,
          updated_at: fechaMovimiento
        },
        include: {
          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },
          unidad_productiva: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      }),
      prisma.historial_inventario.create({
        data: {
          producto: {
            connect: { id: data.producto_id }
          },
          tipo_movimiento: data.tipo_movimiento,
          cantidad_movimiento: data.tipo_movimiento === 'ajuste' 
            ? (stockNuevo - stockAnterior) 
            : (data.tipo_movimiento === 'entrada' ? data.cantidad : -data.cantidad),
          cantidad_anterior: stockAnterior,
          cantidad_nueva: stockNuevo,
          observaciones: data.motivo,
          usuario_id: data.usuario_id,
          fecha_movimiento: fechaMovimiento,
        },
      }),
    ])

    // Registrar en auditoría con la misma fecha
    await prisma.auditoria.create({
      data: {
        tabla: 'productos',
        registro_id: data.producto_id,
        accion: 'UPDATE',
        usuario_id: data.usuario_id,
        datos_anteriores: {
          stock_actual: stockAnterior,
        },
        datos_nuevos: {
          stock_actual: stockNuevo,
          tipo_movimiento: data.tipo_movimiento,
          motivo: data.motivo,
        },
        fecha: fechaMovimiento,
      },
    })

    // 🔔 Verificar alertas de stock después del ajuste
    try {
      const { checkStockBajo, limpiarAlertasResueltas } = await import('./alertas')
      await checkStockBajo()
      await limpiarAlertasResueltas() // Limpiar alertas resueltas si el stock mejoró
    } catch (alertError) {
      console.error('Error al verificar alertas de stock:', alertError)
      // No fallar el ajuste de stock por un error en las alertas
    }

    return {
      product: updatedProduct,
      historial,
    }
  } catch (error) {
    console.error('Error adjusting stock:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al ajustar stock')
  }
}

// =====================================================
// OBTENER PRODUCTOS POR CATEGORÍA
// =====================================================

/**
 * Obtiene todos los productos de una categoría específica
 */
export async function getProductsByCategory(categoriaId: number, activeOnly = true) {
  try {
    const where: Prisma.productosWhereInput = {
      categoria_id: categoriaId,
    }

    if (activeOnly) {
      where.activo = true
    }

    const products = await prisma.productos.findMany({
      where,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        precio_unitario: true,
        stock_actual: true,
        unidad: true,
        imagen_url: true,
      },
    })

    return products
  } catch (error) {
    console.error('Error fetching products by category:', error)
    throw new Error('Error al obtener productos por categoría')
  }
}

// =====================================================
// OBTENER PRODUCTOS CON STOCK BAJO
// =====================================================

/**
 * Obtiene productos con stock bajo (menor o igual al stock mínimo)
 */
export async function getLowStockProducts() {
  try {
    const products = await prisma.productos.findMany({
      where: {
        activo: true,
        stock_actual: {
          lte: prisma.productos.fields.stock_minimo,
          gt: 0,
        },
      },
      orderBy: { stock_actual: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        stock_actual: true,
        stock_minimo: true,
        unidad: true,
        categorias: {
          select: {
            nombre: true,
            color: true,
          },
        },
        unidades_productivas: {
          select: {
            nombre: true,
          },
        },
      },
    })

    return products
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    throw new Error('Error al obtener productos con stock bajo')
  }
}

// =====================================================
// OBTENER PRODUCTOS AGOTADOS
// =====================================================

/**
 * Obtiene productos agotados (stock 0 o negativo)
 */
export async function getOutOfStockProducts() {
  try {
    const products = await prisma.productos.findMany({
      where: {
        activo: true,
        stock_actual: {
          lte: 0,
        },
      },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        stock_actual: true,
        stock_minimo: true,
        unidad: true,
        categorias: {
          select: {
            nombre: true,
            color: true,
          },
        },
      },
    })

    return products
  } catch (error) {
    console.error('Error fetching out of stock products:', error)
    throw new Error('Error al obtener productos agotados')
  }
}

// =====================================================
// BUSCAR PRODUCTOS
// =====================================================

/**
 * Búsqueda avanzada de productos por múltiples criterios
 */
export async function searchProducts(query: string, limit = 10) {
  try {
    const products = await prisma.productos.findMany({
      where: {
        activo: true,
        OR: [
          {
            nombre: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            codigo: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            descripcion: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: limit,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        precio_unitario: true,
        stock_actual: true,
        unidad: true,
        imagen_url: true,
        categorias: {
          select: {
            nombre: true,
            color: true,
          },
        },
      },
    })

    return products
  } catch (error) {
    console.error('Error searching products:', error)
    throw new Error('Error al buscar productos')
  }
}

// =====================================================
// OBTENER PRODUCTOS PRÓXIMOS A VENCER
// =====================================================

/**
 * Obtiene productos perecederos próximos a vencer
 */
export async function getProductsExpiringSoon(days = 7) {
  try {
    // Esta función requiere información de lotes
    // Por ahora retornamos productos perecederos activos
    const products = await prisma.productos.findMany({
      where: {
        activo: true,
        es_perecedero: true,
        stock_actual: {
          gt: 0,
        },
      },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        stock_actual: true,
        dias_vencimiento: true,
        unidad: true,
        categorias: {
          select: {
            nombre: true,
            color: true,
          },
        },
        lotes_productos: {
          where: {
            fecha_vencimiento: {
              lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
            },
            estado: 'disponible',
          },
          orderBy: {
            fecha_vencimiento: 'asc',
          },
          take: 5,
          select: {
            numero_lote: true,
            fecha_vencimiento: true,
            cantidad_disponible: true,
          },
        },
      },
    })

    return products.filter((p) => p.lotes_productos.length > 0)
  } catch (error) {
    console.error('Error fetching expiring products:', error)
    throw new Error('Error al obtener productos próximos a vencer')
  }
}

// =====================================================
// ESTADÍSTICAS DE PRODUCTO
// =====================================================

/**
 * Obtiene estadísticas de un producto
 */
export async function getProductStatistics(id: number) {
  try {
    const product = await prisma.productos.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        precio_unitario: true,
        stock_actual: true,
        _count: {
          select: {
            detalle_ventas: true,
            historial_inventario: true,
          },
        },
      },
    })

    if (!product) {
      throw new Error('Producto no encontrado')
    }

    // Calcular ventas totales
    const ventas = await prisma.detalle_ventas.aggregate({
      where: {
        producto_id: id,
      },
      _sum: {
        cantidad: true,
        subtotal: true,
      },
    })

    return {
      id: product.id,
      codigo: product.codigo,
      nombre: product.nombre,
      precioUnitario: Number(product.precio_unitario),
      stockActual: Number(product.stock_actual),
      totalVentas: ventas._sum.cantidad || 0,
      ingresosTotales: Number(ventas._sum.subtotal || 0),
      totalMovimientos: product._count.historial_inventario,
    }
  } catch (error) {
    console.error('Error fetching product statistics:', error)
    throw new Error('Error al obtener estadísticas del producto')
  }
}
