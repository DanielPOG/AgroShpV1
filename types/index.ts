// =====================================================
// TIPOS DE BASE DE DATOS
// =====================================================
// Este archivo será generado automáticamente por Prisma
// después de ejecutar: npx prisma generate

import type { Prisma } from '@prisma/client'

// =====================================================
// TIPOS DE API
// =====================================================

/**
 * Respuesta estándar de API con paginación
 */
export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

/**
 * Respuesta estándar de API
 */
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

/**
 * Error de API
 */
export interface ApiError {
    error: string
    message?: string
    details?: any
}

// =====================================================
// TIPOS DE PRODUCTOS
// =====================================================

export interface ProductWithRelations {
    id: number
    codigo: string
    nombre: string
    descripcion: string | null
    categoria: {
        id: number
        nombre: string
        color: string | null
    } | null
    unidad_productiva: {
        id: number
        nombre: string
        codigo: string
    } | null
    tipo_medida: string
    unidad: string
    precio_unitario: number
    stock_actual: number
    stock_minimo: number
    es_perecedero: boolean
    imagen_url: string | null
    activo: boolean
    status?: string
}

export interface ProductFilters {
    categoria?: number
    unidad?: number
    tipo?: string
    status?: string
    search?: string
    page?: number
    limit?: number
}

// =====================================================
// TIPOS DE VENTAS
// =====================================================

export interface SaleItem {
    producto_id: number
    cantidad: number
    precio_unitario: number
}

export interface PaymentInfo {
    metodo_pago_id: number
    monto: number
    referencia?: string
}

export interface CreateSaleData {
    items: SaleItem[]
    pagos: PaymentInfo[]
    cliente_id?: number
    requiere_factura?: boolean
    observaciones?: string
}

export interface SaleWithDetails {
    id: number
    codigo_venta: string
    fecha_venta: Date
    subtotal: number
    impuesto: number
    total: number
    estado: string
    items: {
        id: number
        producto: {
            id: number
            nombre: string
            imagen_url: string | null
        }
        cantidad: number
        precio_unitario: number
        subtotal: number
    }[]
    pagos: {
        id: number
        metodo_pago: {
            id: number
            nombre: string
        }
        monto: number
        referencia: string | null
    }[]
    usuario: {
        id: number
        nombre: string
        apellido: string
    } | null
}

// =====================================================
// TIPOS DE MOVIMIENTOS
// =====================================================

export interface MovementItem {
    producto_id: number
    cantidad: number
    unidad: string
}

export interface CreateMovementData {
    unidad_origen_id: number
    unidad_destino_id: number
    items: MovementItem[]
    motivo?: string
    observaciones?: string
}

export interface MovementWithDetails {
    id: number
    codigo_movimiento: string
    fecha_movimiento: Date
    unidad_origen: {
        id: number
        nombre: string
        codigo: string
    } | null
    unidad_destino: {
        id: number
        nombre: string
        codigo: string
    } | null
    usuario: {
        id: number
        nombre: string
        apellido: string
    } | null
    estado: string
    items: {
        id: number
        producto: {
            id: number
            nombre: string
        }
        cantidad: number
        unidad: string
    }[]
}

// =====================================================
// TIPOS DE REPORTES
// =====================================================

export interface DashboardStats {
    ventasDelDia: {
        total: number
        transacciones: number
        cambio: number
    }
    inventarioTotal: {
        total: number
        unidades: number
    }
    bajoStock: {
        total: number
    }
    productosActivos: {
        total: number
    }
}

export interface SalesReportData {
    totalVentas: number
    totalTransacciones: number
    ticketPromedio: number
    ventasPorDia: {
        fecha: string
        total: number
        transacciones: number
    }[]
    productosMasVendidos: {
        producto: string
        cantidad: number
        total: number
    }[]
    horasPico: {
        hora: number
        transacciones: number
    }[]
}

export interface InventoryReportData {
    totalProductos: number
    productosBajoStock: {
        id: number
        nombre: string
        stock: number
        stockMinimo: number
    }[]
    productosProximosVencer: {
        id: number
        nombre: string
        fechaVencimiento: Date
        diasRestantes: number
    }[]
}

export interface PaymentMethodsReportData {
    distribucion: {
        metodo: string
        total: number
        porcentaje: number
    }[]
    totalPorMetodo: {
        efectivo: number
        nequi: number
        tarjeta: number
        transferencia: number
    }
}

// =====================================================
// TIPOS DE AUTENTICACIÓN
// =====================================================

export interface UserSession {
    id: string
    email: string
    name: string
    role: string
}

export interface LoginCredentials {
    email: string
    password: string
}

// =====================================================
// TIPOS DE FORMULARIOS
// =====================================================

export interface ProductFormData {
    nombre: string
    descripcion?: string
    categoria_id: number
    unidad_productiva_id: number
    tipo_medida: 'unidad' | 'peso' | 'volumen' | 'lote'
    unidad: string
    precio_unitario: number
    precio_mayorista?: number
    stock_actual: number
    stock_minimo: number
    stock_maximo?: number
    es_perecedero: boolean
    dias_vencimiento?: number
    imagen_url?: string
}

export interface ClientFormData {
    tipo_cliente: 'ocasional' | 'frecuente' | 'institucional'
    tipo_documento?: string
    numero_documento?: string
    nombre: string
    apellido?: string
    email?: string
    telefono?: string
    direccion?: string
    ciudad?: string
    es_institucional: boolean
    dependencia?: string
}

// =====================================================
// TIPOS DE UTILIDADES
// =====================================================

export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
    field: string
    order: SortOrder
}

export interface FilterConfig {
    [key: string]: any
}
