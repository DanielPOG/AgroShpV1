import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProduct() {
  try {
    console.log('🔍 Verificando producto ID 6...\n')

    // 1. Obtener producto completo
    const producto = await prisma.productos.findUnique({
      where: { id: 6 },
      include: {
        categoria: true,
        unidad_productiva: true,
        proveedor: true,
      },
    })

    if (!producto) {
      console.log('❌ Producto ID 6 no encontrado')
      return
    }

    console.log('📦 PRODUCTO:')
    console.log(`   Nombre: ${producto.nombre}`)
    console.log(`   Stock Actual: ${producto.stock_actual}`)
    console.log(`   Stock Mínimo: ${producto.stock_minimo}`)
    console.log(`   Stock Máximo: ${producto.stock_maximo}`)
    console.log(`   Estado: ${producto.activo ? 'Activo' : 'Inactivo'}`)
    console.log(`   Categoría: ${producto.categoria?.nombre || 'N/A'}`)
    console.log(`   Unidad Productiva: ${producto.unidad_productiva?.nombre || 'N/A'}`)
    console.log()

    // Verificar lógica de estado
    if (producto.stock_actual === 0) {
      console.log('   Estado esperado: Agotado ❌')
    } else if (producto.stock_actual <= producto.stock_minimo) {
      console.log(`   Estado esperado: Bajo Stock ⚠️ (${producto.stock_actual} <= ${producto.stock_minimo})`)
    } else {
      console.log(`   Estado esperado: Disponible ✅ (${producto.stock_actual} > ${producto.stock_minimo})`)
    }
    console.log()

    // 2. Obtener lotes del producto
    const lotes = await prisma.lotes_productos.findMany({
      where: { producto_id: 6 },
      include: {
        unidad_productiva: true,
      },
      orderBy: { created_at: 'desc' },
    })

    console.log('📦 LOTES DEL PRODUCTO:')
    if (lotes.length === 0) {
      console.log('   ❌ No hay lotes registrados para este producto')
    } else {
      console.log(`   Total de lotes: ${lotes.length}`)
      lotes.forEach((lote, index) => {
        console.log(`\n   Lote ${index + 1}:`)
        console.log(`      ID: ${lote.id}`)
        console.log(`      Código: ${lote.codigo_lote}`)
        console.log(`      Cantidad: ${lote.cantidad}`)
        console.log(`      Estado: ${lote.estado}`)
        console.log(`      Fecha Producción: ${lote.fecha_produccion.toISOString()}`)
        console.log(`      Fecha Vencimiento: ${lote.fecha_vencimiento?.toISOString() || 'N/A'}`)
        console.log(`      Unidad Productiva: ${lote.unidad_productiva?.nombre || 'N/A'}`)
        console.log(`      Creado: ${lote.created_at.toISOString()}`)
      })
    }
    console.log()

    // 3. Verificar historial
    const historial = await prisma.historial_inventario.findMany({
      where: { producto_id: 6 },
      include: {
        usuarios: true,
      },
      orderBy: { fecha_movimiento: 'desc' },
    })

    console.log('📜 HISTORIAL DE INVENTARIO:')
    if (historial.length === 0) {
      console.log('   ⚠️ No hay registros en historial')
    } else {
      console.log(`   Total de movimientos: ${historial.length}`)
      historial.forEach((mov, index) => {
        console.log(`\n   Movimiento ${index + 1}:`)
        console.log(`      Tipo: ${mov.tipo_movimiento}`)
        console.log(`      Cantidad movida: ${mov.cantidad_movimiento}`)
        console.log(`      Stock anterior: ${mov.cantidad_anterior}`)
        console.log(`      Stock nuevo: ${mov.cantidad_nueva}`)
        console.log(`      Observaciones: ${mov.observaciones || 'N/A'}`)
        console.log(`      Usuario: ${mov.usuarios?.nombre || 'Sistema'} ${mov.usuarios?.apellido || ''}`)
        console.log(`      Fecha: ${mov.fecha_movimiento.toISOString()}`)
      })
    }
    console.log()

    // 4. Verificar auditoría
    const auditoria = await prisma.auditoria.findMany({
      where: {
        tabla: 'productos',
        registro_id: 6,
      },
      orderBy: { fecha: 'desc' },
    })

    console.log('📋 AUDITORÍA:')
    if (auditoria.length === 0) {
      console.log('   ⚠️ No hay registros en auditoría')
    } else {
      console.log(`   Total de registros: ${auditoria.length}`)
      auditoria.forEach((aud, index) => {
        console.log(`\n   Registro ${index + 1}:`)
        console.log(`      Acción: ${aud.accion}`)
        console.log(`      Fecha: ${aud.fecha.toISOString()}`)
        console.log(`      Usuario ID: ${aud.usuario_id || 'N/A'}`)
        if (aud.datos_nuevos) {
          console.log(`      Datos nuevos: ${JSON.stringify(aud.datos_nuevos, null, 2)}`)
        }
      })
    }
    console.log()

    console.log('✅ Verificación completada')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProduct()
