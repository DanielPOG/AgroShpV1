import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

/**
 * Exportar reporte de ventas a PDF
 */
export const exportVentasPDF = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    // Obtener datos del reporte
    const response = await fetch(
      `/api/reportes/ventas?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}&agrupar_por=dia`
    )
    const { data } = await response.json()

    const doc = new jsPDF()
    
    // Título
    doc.setFontSize(18)
    doc.text('Reporte de Ventas', 14, 20)
    
    // Período
    doc.setFontSize(11)
    doc.text(
      `Período: ${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`,
      14,
      30
    )

    // Estadísticas generales
    const { estadisticas } = data
    doc.setFontSize(12)
    doc.text('Resumen General', 14, 40)
    
    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Ventas', `$${estadisticas.total_ventas.toLocaleString('es-CO')}`],
        ['Cantidad Transacciones', estadisticas.cantidad_transacciones.toString()],
        ['Ticket Promedio', `$${estadisticas.ticket_promedio.toLocaleString('es-CO')}`],
        ['Total Descuentos', `$${estadisticas.total_descuentos.toLocaleString('es-CO')}`],
      ],
    })

    // Productos más vendidos
    doc.addPage()
    doc.setFontSize(12)
    doc.text('Top 10 Productos Más Vendidos', 14, 20)
    
    autoTable(doc, {
      startY: 25,
      head: [['Producto', 'Código', 'Cantidad', 'Ingresos']],
      body: data.productos_mas_vendidos.slice(0, 10).map((p: any) => [
        p.nombre,
        p.codigo || 'N/A',
        p.cantidad_vendida.toString(),
        `$${p.total_ingresos.toLocaleString('es-CO')}`,
      ]),
    })

    // Métodos de pago
    doc.addPage()
    doc.text('Distribución por Método de Pago', 14, 20)
    
    autoTable(doc, {
      startY: 25,
      head: [['Método de Pago', 'Cantidad', 'Total', '% del Total']],
      body: data.ventas_por_metodo_pago.map((m: any) => [
        m.metodo_pago,
        m.cantidad_transacciones.toString(),
        `$${m.total.toLocaleString('es-CO')}`,
        `${m.porcentaje.toFixed(1)}%`,
      ]),
    })

    // Guardar PDF
    doc.save(`reporte-ventas-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error al exportar PDF:', error)
    throw error
  }
}

/**
 * Exportar reporte de ventas a Excel
 */
export const exportVentasExcel = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    const response = await fetch(
      `/api/reportes/ventas?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}&agrupar_por=dia`
    )
    const { data } = await response.json()

    const workbook = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumenData = [
      ['Reporte de Ventas'],
      ['Período', `${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`],
      [],
      ['Métrica', 'Valor'],
      ['Total Ventas', data.estadisticas.total_ventas],
      ['Cantidad Transacciones', data.estadisticas.cantidad_transacciones],
      ['Ticket Promedio', data.estadisticas.ticket_promedio],
      ['Total Descuentos', data.estadisticas.total_descuentos],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    // Hoja 2: Ventas por día
    const ventasDia = [
      ['Fecha', 'Total Ventas', 'Cantidad'],
      ...data.ventas_por_periodo.map((v: any) => [
        format(new Date(v.periodo), 'dd/MM/yyyy'),
        v.total_ventas,
        v.cantidad_ventas,
      ]),
    ]
    const wsVentasDia = XLSX.utils.aoa_to_sheet(ventasDia)
    XLSX.utils.book_append_sheet(workbook, wsVentasDia, 'Ventas por Día')

    // Hoja 3: Productos más vendidos
    const productos = [
      ['Producto', 'Código', 'Cantidad Vendida', 'Ingresos Totales', 'Veces Vendido'],
      ...data.productos_mas_vendidos.map((p: any) => [
        p.nombre,
        p.codigo || 'N/A',
        p.cantidad_vendida,
        p.total_ingresos,
        p.veces_vendido,
      ]),
    ]
    const wsProductos = XLSX.utils.aoa_to_sheet(productos)
    XLSX.utils.book_append_sheet(workbook, wsProductos, 'Top Productos')

    // Hoja 4: Métodos de pago
    const metodosPago = [
      ['Método de Pago', 'Cantidad Transacciones', 'Total', '% del Total'],
      ...data.ventas_por_metodo_pago.map((m: any) => [
        m.metodo_pago,
        m.cantidad_transacciones,
        m.total,
        m.porcentaje,
      ]),
    ]
    const wsMetodos = XLSX.utils.aoa_to_sheet(metodosPago)
    XLSX.utils.book_append_sheet(workbook, wsMetodos, 'Métodos de Pago')

    // Hoja 5: Ventas por hora
    const ventasHora = [
      ['Hora', 'Cantidad Ventas', 'Total Ventas'],
      ...data.ventas_por_hora.map((h: any) => [
        `${h.hora}:00`,
        h.cantidad_ventas,
        h.total_ventas,
      ]),
    ]
    const wsHoras = XLSX.utils.aoa_to_sheet(ventasHora)
    XLSX.utils.book_append_sheet(workbook, wsHoras, 'Ventas por Hora')

    // Guardar archivo
    XLSX.writeFile(workbook, `reporte-ventas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  } catch (error) {
    console.error('Error al exportar Excel:', error)
    throw error
  }
}

/**
 * Exportar reporte de inventario a PDF
 */
export const exportInventarioPDF = async (diasVencimiento: number = 30) => {
  try {
    const response = await fetch(`/api/reportes/inventario?dias_vencimiento=${diasVencimiento}`)
    const { data } = await response.json()

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Inventario', 14, 20)
    
    doc.setFontSize(11)
    doc.text(`Fecha: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: es })}`, 14, 30)

    // Valorización
    doc.setFontSize(12)
    doc.text('Valorización Total del Inventario', 14, 40)
    doc.setFontSize(14)
    doc.text(`$${data.valorizacion.valor_total.toLocaleString('es-CO')}`, 14, 48)
    doc.setFontSize(10)
    doc.text(`Total de productos activos: ${data.valorizacion.productos_activos}`, 14, 55)

    // Productos con stock crítico
    doc.setFontSize(12)
    doc.text('Productos con Stock Crítico', 14, 60)
    
    autoTable(doc, {
      startY: 65,
      head: [['Producto', 'Stock Actual', 'Stock Mínimo', 'Estado']],
      body: data.productos_stock_critico.map((p: any) => [
        p.nombre,
        p.stock_actual.toString(),
        p.stock_minimo.toString(),
        p.stock_actual === 0 ? 'AGOTADO' : 'BAJO',
      ]),
    })

    // Lotes próximos a vencer
    if (data.lotes_proximos_vencer.length > 0) {
      doc.addPage()
      doc.text(`Lotes que Vencen en ${diasVencimiento} Días`, 14, 20)
      
      autoTable(doc, {
        startY: 25,
        head: [['Producto', 'Código Lote', 'Cantidad', 'Fecha Vencimiento', 'Días Restantes']],
        body: data.lotes_proximos_vencer.map((l: any) => [
          l.producto_nombre,
          l.codigo_lote,
          l.cantidad.toString(),
          format(new Date(l.fecha_vencimiento), 'dd/MM/yyyy'),
          l.dias_restantes.toString(),
        ]),
      })
    }

    doc.save(`reporte-inventario-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error al exportar PDF:', error)
    throw error
  }
}

/**
 * Exportar reporte de inventario a Excel
 */
export const exportInventarioExcel = async (diasVencimiento: number = 30) => {
  try {
    const response = await fetch(`/api/reportes/inventario?dias_vencimiento=${diasVencimiento}`)
    const { data } = await response.json()

    const workbook = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumenData = [
      ['Reporte de Inventario'],
      ['Fecha', format(new Date(), 'dd/MM/yyyy HH:mm')],
      [],
      ['Métrica', 'Valor'],
      ['Total Productos', data.valorizacion.total_productos],
      ['Productos Activos', data.valorizacion.productos_activos],
      ['Valorización Total', data.valorizacion.valor_total],
      ['Productos Críticos (Agotados)', data.resumen.productos_criticos],
      ['Productos con Bajo Stock', data.resumen.productos_bajo_stock],
      ['Lotes por Vencer', data.resumen.lotes_por_vencer],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    // Hoja 2: Stock crítico
    const stockCritico = [
      ['Producto', 'Código', 'Stock Actual', 'Stock Mínimo', 'Stock Máximo', 'Valor Total', 'Estado'],
      ...data.productos_stock_critico.map((p: any) => [
        p.nombre,
        p.codigo,
        p.stock_actual,
        p.stock_minimo,
        p.stock_maximo || 'N/A',
        p.valor_total,
        p.stock_actual === 0 ? 'AGOTADO' : 'BAJO',
      ]),
    ]
    const wsStock = XLSX.utils.aoa_to_sheet(stockCritico)
    XLSX.utils.book_append_sheet(workbook, wsStock, 'Stock Crítico')

    // Hoja 3: Lotes próximos a vencer
    const lotes = [
      ['Producto', 'Código Lote', 'Cantidad', 'Fecha Vencimiento', 'Días Restantes'],
      ...data.lotes_proximos_vencer.map((l: any) => [
        l.producto_nombre,
        l.codigo_lote,
        l.cantidad,
        format(new Date(l.fecha_vencimiento), 'dd/MM/yyyy'),
        l.dias_restantes,
      ]),
    ]
    const wsLotes = XLSX.utils.aoa_to_sheet(lotes)
    XLSX.utils.book_append_sheet(workbook, wsLotes, 'Lotes por Vencer')

    XLSX.writeFile(workbook, `reporte-inventario-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  } catch (error) {
    console.error('Error al exportar Excel:', error)
    throw error
  }
}

/**
 * Exportar reporte de clientes a PDF
 */
export const exportClientesPDF = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    const response = await fetch(
      `/api/reportes/clientes?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}&limit=50`
    )
    const { data } = await response.json()

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Clientes', 14, 20)
    
    doc.setFontSize(11)
    doc.text(
      `Período: ${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`,
      14,
      30
    )

    // Resumen
    doc.setFontSize(12)
    doc.text('Resumen', 14, 40)
    
    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Clientes', data.resumen.total_clientes.toString()],
        ['Total Compras', `$${data.resumen.total_compras.toLocaleString('es-CO')}`],
        ['Ticket Promedio', `$${data.resumen.ticket_promedio_global.toLocaleString('es-CO')}`],
      ],
    })

    // Top clientes
    doc.setFontSize(12)
    doc.text('Top 50 Clientes', 14, 85)
    
    autoTable(doc, {
      startY: 90,
      head: [['Cliente', 'Tipo', 'Compras', 'Total', 'Ticket Prom.']],
      body: data.clientes_top.map((c: any) => [
        c.nombre_completo,
        c.tipo_cliente,
        c.cantidad_compras.toString(),
        `$${c.total_compras.toLocaleString('es-CO')}`,
        `$${c.ticket_promedio.toLocaleString('es-CO')}`,
      ]),
    })

    doc.save(`reporte-clientes-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error al exportar PDF:', error)
    throw error
  }
}

/**
 * Exportar reporte de clientes a Excel
 */
export const exportClientesExcel = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    const response = await fetch(
      `/api/reportes/clientes?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}&limit=100`
    )
    const { data } = await response.json()

    const workbook = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumenData = [
      ['Reporte de Clientes'],
      ['Período', `${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`],
      [],
      ['Métrica', 'Valor'],
      ['Total Clientes', data.resumen.total_clientes],
      ['Total Compras', data.resumen.total_compras],
      ['Ticket Promedio Global', data.resumen.ticket_promedio_global],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    // Hoja 2: Top clientes
    const clientes = [
      ['Cliente', 'Tipo', 'Cantidad Compras', 'Total Compras', 'Ticket Promedio', 'Última Compra'],
      ...data.clientes_top.map((c: any) => [
        c.nombre_completo,
        c.tipo_cliente,
        c.cantidad_compras,
        c.total_compras,
        c.ticket_promedio,
        c.ultima_compra ? format(new Date(c.ultima_compra), 'dd/MM/yyyy') : 'N/A',
      ]),
    ]
    const wsClientes = XLSX.utils.aoa_to_sheet(clientes)
    XLSX.utils.book_append_sheet(workbook, wsClientes, 'Top Clientes')

    XLSX.writeFile(workbook, `reporte-clientes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  } catch (error) {
    console.error('Error al exportar Excel:', error)
    throw error
  }
}

/**
 * Exportar reporte de rentabilidad a PDF
 */
export const exportRentabilidadPDF = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    const response = await fetch(
      `/api/reportes/rentabilidad?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}&limit=50`
    )
    const { data } = await response.json()

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Rentabilidad', 14, 20)
    
    doc.setFontSize(11)
    doc.text(
      `Período: ${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`,
      14,
      30
    )

    // Resumen
    doc.setFontSize(12)
    doc.text('Resumen Financiero', 14, 40)
    
    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Ingresos', `$${data.resumen.total_ingresos.toLocaleString('es-CO')}`],
        ['Total Costos', `$${data.resumen.total_costos.toLocaleString('es-CO')}`],
        ['Margen Bruto', `$${data.resumen.margen_total.toLocaleString('es-CO')}`],
        ['% Margen Promedio', `${(data.resumen.porcentaje_margen || 0).toFixed(1)}%`],
      ],
    })

    // Productos rentables
    doc.setFontSize(12)
    doc.text('Top 50 Productos Más Rentables', 14, 100)
    
    autoTable(doc, {
      startY: 105,
      head: [['Producto', 'Cant.', 'Ingresos', 'Costos', 'Margen', '% Margen']],
      body: data.productos_rentables.map((p: any) => [
        p.nombre,
        p.cantidad_vendida.toString(),
        `$${p.ingresos.toLocaleString('es-CO')}`,
        `$${p.costo_produccion.toLocaleString('es-CO')}`,
        `$${p.margen_ganancia.toLocaleString('es-CO')}`,
        `${p.porcentaje_margen.toFixed(1)}%`,
      ]),
    })

    doc.save(`reporte-rentabilidad-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error al exportar PDF:', error)
    throw error
  }
}

/**
 * Exportar reporte de rentabilidad a Excel
 */
export const exportRentabilidadExcel = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    const response = await fetch(
      `/api/reportes/rentabilidad?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}&limit=100`
    )
    const { data } = await response.json()

    const workbook = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumenData = [
      ['Reporte de Rentabilidad'],
      ['Período', `${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`],
      [],
      ['Métrica', 'Valor'],
      ['Total Ingresos', data.resumen.total_ingresos],
      ['Total Costos Producción', data.resumen.total_costos],
      ['Margen Bruto Total', data.resumen.margen_total],
      ['% Margen Promedio', data.resumen.porcentaje_margen],
      [],
      ['Productos Rentables', data.productos_rentables.length],
      ['Productos Sin Costos', data.productos_sin_costos.length],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    // Hoja 2: Productos rentables
    const productos = [
      ['Producto', 'Cantidad Vendida', 'Ingresos', 'Costos Producción', 'Margen Ganancia', '% Margen'],
      ...data.productos_rentables.map((p: any) => [
        p.nombre,
        p.cantidad_vendida,
        p.ingresos,
        p.costo_produccion,
        p.margen_ganancia,
        p.porcentaje_margen,
      ]),
    ]
    const wsProductos = XLSX.utils.aoa_to_sheet(productos)
    XLSX.utils.book_append_sheet(workbook, wsProductos, 'Productos Rentables')

    // Hoja 3: Productos sin costos
    if (data.productos_sin_costos.length > 0) {
      const productosSinCostos = [
        ['Producto', 'Cantidad Vendida', 'Ingresos', 'Nota'],
        ...data.productos_sin_costos.map((p: any) => [
          p.nombre,
          p.cantidad_vendida,
          p.ingresos,
          'Falta configurar costos de producción',
        ]),
      ]
      const wsSinCostos = XLSX.utils.aoa_to_sheet(productosSinCostos)
      XLSX.utils.book_append_sheet(workbook, wsSinCostos, 'Sin Costos')
    }

    XLSX.writeFile(workbook, `reporte-rentabilidad-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  } catch (error) {
    console.error('Error al exportar Excel:', error)
    throw error
  }
}

/**
 * Exportar reporte de métodos de pago a PDF
 */
export const exportMetodosPagoPDF = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    const response = await fetch(
      `/api/reportes/ventas?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}`
    )
    const { data } = await response.json()

    const doc = new jsPDF()
    
    // Título
    doc.setFontSize(18)
    doc.text('Reporte de Métodos de Pago', 14, 20)
    
    // Período
    doc.setFontSize(11)
    doc.text(
      `Período: ${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`,
      14,
      30
    )

    // Total general
    const totalGeneral = data.ventas_por_metodo_pago.reduce((sum: number, m: any) => sum + m.total, 0)
    const cantidadTotal = data.ventas_por_metodo_pago.reduce((sum: number, m: any) => sum + m.cantidad_transacciones, 0)
    
    doc.setFontSize(12)
    doc.text('Resumen General', 14, 40)
    
    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Ventas', `$${totalGeneral.toLocaleString('es-CO')}`],
        ['Total Transacciones', cantidadTotal.toString()],
        ['Ticket Promedio', `$${cantidadTotal > 0 ? (totalGeneral / cantidadTotal).toLocaleString('es-CO') : '0'}`],
      ],
    })

    // Distribución por método de pago
    doc.setFontSize(12)
    doc.text('Distribución por Método de Pago', 14, 85)
    
    autoTable(doc, {
      startY: 90,
      head: [['Método de Pago', 'Cantidad', 'Total', '% del Total']],
      body: data.ventas_por_metodo_pago.map((m: any) => [
        m.metodo_pago,
        m.cantidad_transacciones.toString(),
        `$${m.total.toLocaleString('es-CO')}`,
        `${m.porcentaje.toFixed(1)}%`,
      ]),
    })

    // Guardar PDF
    doc.save(`reporte-metodos-pago-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error al exportar PDF:', error)
    throw error
  }
}

/**
 * Exportar reporte de métodos de pago a Excel
 */
export const exportMetodosPagoExcel = async (fechaInicio: Date, fechaFin: Date) => {
  try {
    const response = await fetch(
      `/api/reportes/ventas?fecha_inicio=${fechaInicio.toISOString()}&fecha_fin=${fechaFin.toISOString()}`
    )
    const { data } = await response.json()

    const workbook = XLSX.utils.book_new()

    // Calcular totales
    const totalGeneral = data.ventas_por_metodo_pago.reduce((sum: number, m: any) => sum + m.total, 0)
    const cantidadTotal = data.ventas_por_metodo_pago.reduce((sum: number, m: any) => sum + m.cantidad_transacciones, 0)
    const ticketPromedio = cantidadTotal > 0 ? totalGeneral / cantidadTotal : 0

    // Hoja 1: Resumen
    const resumenData = [
      ['Reporte de Métodos de Pago'],
      ['Período', `${format(fechaInicio, 'dd MMM yyyy', { locale: es })} - ${format(fechaFin, 'dd MMM yyyy', { locale: es })}`],
      [],
      ['Métrica', 'Valor'],
      ['Total Ventas', totalGeneral],
      ['Total Transacciones', cantidadTotal],
      ['Ticket Promedio', ticketPromedio],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    // Hoja 2: Métodos de pago
    const metodosPago = [
      ['Método de Pago', 'Cantidad Transacciones', 'Total', '% del Total', 'Ticket Promedio'],
      ...data.ventas_por_metodo_pago.map((m: any) => [
        m.metodo_pago,
        m.cantidad_transacciones,
        m.total,
        m.porcentaje,
        m.cantidad_transacciones > 0 ? m.total / m.cantidad_transacciones : 0,
      ]),
    ]
    const wsMetodos = XLSX.utils.aoa_to_sheet(metodosPago)
    XLSX.utils.book_append_sheet(workbook, wsMetodos, 'Métodos de Pago')

    // Guardar archivo
    XLSX.writeFile(workbook, `reporte-metodos-pago-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  } catch (error) {
    console.error('Error al exportar Excel:', error)
    throw error
  }
}
