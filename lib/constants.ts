// =====================================================
// CONSTANTES DEL SISTEMA AGROSHOP
// =====================================================

// =====================================================
// ROLES Y PERMISOS
// =====================================================

export const ROLES = {
    ADMIN: 'Admin',
    INVENTARISTA: 'Inventarista',
    CAJERO: 'Cajero',
    CONSULTA: 'Consulta',
} as const

export type RoleName = typeof ROLES[keyof typeof ROLES]

export const PERMISSIONS = {
    [ROLES.ADMIN]: {
        all: true,
        dashboard: true,
        inventario: true,
        movimientos: true,
        pos: true,
        ventas: true,
        reportes: true,
        usuarios: true,
        configuracion: true,
    },
    [ROLES.INVENTARISTA]: {
        all: false,
        dashboard: true,
        inventario: true,
        movimientos: true,
        pos: false,
        ventas: false,
        reportes: true,
        usuarios: false,
        configuracion: false,
    },
    [ROLES.CAJERO]: {
        all: false,
        dashboard: true,
        inventario: false,
        movimientos: false,
        pos: true,
        ventas: true,
        reportes: false,
        usuarios: false,
        configuracion: false,
    },
    [ROLES.CONSULTA]: {
        all: false,
        dashboard: true,
        inventario: false,
        movimientos: false,
        pos: false,
        ventas: false,
        reportes: true,
        usuarios: false,
        configuracion: false,
    },
} as const

// =====================================================
// ESTADOS DE PRODUCTOS
// =====================================================

export const PRODUCT_STATUS = {
    DISPONIBLE: 'disponible',
    BAJO_STOCK: 'bajo-stock',
    AGOTADO: 'agotado',
    PROXIMO_VENCER: 'proximo-vencer',
} as const

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS]

// =====================================================
// TIPOS DE MEDIDA
// =====================================================

export const TIPO_MEDIDA = {
    UNIDAD: 'unidad',
    PESO: 'peso',
    VOLUMEN: 'volumen',
    LOTE: 'lote',
} as const

export type TipoMedida = typeof TIPO_MEDIDA[keyof typeof TIPO_MEDIDA]

// =====================================================
// MÉTODOS DE PAGO
// =====================================================

export const PAYMENT_METHODS = {
    EFECTIVO: 'efectivo',
    NEQUI: 'nequi',
    TARJETA: 'tarjeta',
    TRANSFERENCIA: 'transferencia',
    MIXTO: 'mixto',
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

// Mapeo de IDs de métodos de pago (según la BD)
export const PAYMENT_METHOD_IDS = {
    EFECTIVO: 1,
    NEQUI: 2,
    TARJETA: 3,
    TRANSFERENCIA: 4,
} as const

// =====================================================
// ESTADOS DE VENTAS
// =====================================================

export const SALE_STATUS = {
    COMPLETADA: 'completada',
    CANCELADA: 'cancelada',
    PENDIENTE: 'pendiente',
} as const

export type SaleStatus = typeof SALE_STATUS[keyof typeof SALE_STATUS]

// =====================================================
// ESTADOS DE MOVIMIENTOS
// =====================================================

export const MOVEMENT_STATUS = {
    COMPLETADO: 'completado',
    PENDIENTE: 'pendiente',
    CANCELADO: 'cancelado',
} as const

export type MovementStatus = typeof MOVEMENT_STATUS[keyof typeof MOVEMENT_STATUS]

// =====================================================
// CONFIGURACIÓN DEL SISTEMA
// =====================================================

/**
 * NOTA IMPORTANTE: Estos son valores por defecto.
 * Los valores reales deben leerse de la tabla 'configuracion' en BD
 * usando getConfigValue() o getAllConfig() en tiempo de ejecución.
 * 
 * La tabla 'configuracion' es EDITABLE desde el panel de admin.
 */
export const CONFIG = {
    // Impuestos
    IVA_PERCENTAGE: Number(process.env.NEXT_PUBLIC_IVA_PERCENTAGE) || 19,

    // Inventario (NOTA: cada producto tiene su propio stock_minimo)
    STOCK_MINIMO_DEFAULT: Number(process.env.NEXT_PUBLIC_STOCK_MINIMO_DEFAULT) || 10,
    DIAS_ALERTA_VENCIMIENTO: Number(process.env.NEXT_PUBLIC_DIAS_ALERTA_VENCIMIENTO) || 7,

    // Control de Caja
    FONDO_INICIAL_DEFAULT: 200000, // $200,000 COP
    UMBRAL_DIFERENCIA_CAJA: 5000, // Diferencia máxima aceptable
    MONTO_MINIMO_AUTORIZACION: 100000, // Retiros > $100k requieren autorización

    // Paginación
    ITEMS_PER_PAGE: 20,
    ITEMS_PER_PAGE_MOBILE: 10,

    // Archivos
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,

    // Aplicación
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'AgroShop SENA',
} as const

// =====================================================
// CATEGORÍAS (sincronizado con BD)
// =====================================================

export const CATEGORIES = [
    { id: 1, name: 'Hortalizas', icon: 'leaf', color: '#059669' },
    { id: 2, name: 'Lácteos', icon: 'milk', color: '#3B82F6' },
    { id: 3, name: 'Panadería', icon: 'croissant', color: '#F59E0B' },
    { id: 4, name: 'Cárnicos', icon: 'beef', color: '#EF4444' },
    { id: 5, name: 'Huevos', icon: 'egg', color: '#FBBF24' },
    { id: 6, name: 'Frutas', icon: 'apple', color: '#EC4899' },
    { id: 7, name: 'Insumos', icon: 'package', color: '#6B7280' },
    { id: 8, name: 'Otros', icon: 'shopping-bag', color: '#8B5CF6' },
] as const

// =====================================================
// UNIDADES PRODUCTIVAS (sincronizado con BD)
// =====================================================

export const PRODUCTIVE_UNITS = [
    { id: 1, code: 'UP-HUERTA', name: 'Huerta Orgánica', icon: '🥬' },
    { id: 2, code: 'UP-BOVINOS', name: 'Granja Bovina', icon: '🥛' },
    { id: 3, code: 'UP-AVICOLA', name: 'Granja Avícola', icon: '🥚' },
    { id: 4, code: 'UP-PORCINOS', name: 'Granja Porcina', icon: '🐷' },
    { id: 5, code: 'UP-PANADERIA', name: 'Panadería SENA', icon: '🍞' },
    { id: 6, code: 'UP-LACTEOS', name: 'Planta de Lácteos', icon: '🧀' },
] as const

// =====================================================
// TIPOS DE MOVIMIENTO DE INVENTARIO
// =====================================================

export const INVENTORY_MOVEMENT_TYPES = {
    ENTRADA: 'entrada',
    SALIDA: 'salida',
    AJUSTE: 'ajuste',
    VENTA: 'venta',
    TRANSFERENCIA: 'transferencia',
} as const

export type InventoryMovementType = typeof INVENTORY_MOVEMENT_TYPES[keyof typeof INVENTORY_MOVEMENT_TYPES]

// =====================================================
// CONTROL DE CAJA
// =====================================================

export const CASH_SESSION_STATUS = {
    ABIERTA: 'abierta',
    CERRADA: 'cerrada',
    CUADRADA: 'cuadrada',
} as const

export type CashSessionStatus = typeof CASH_SESSION_STATUS[keyof typeof CASH_SESSION_STATUS]

export const CASH_MOVEMENT_TYPES = {
    VENTA: 'venta',
    RETIRO: 'retiro',
    INGRESO: 'ingreso',
    GASTO: 'gasto',
    APERTURA: 'apertura',
    CIERRE: 'cierre',
} as const

export type CashMovementType = typeof CASH_MOVEMENT_TYPES[keyof typeof CASH_MOVEMENT_TYPES]

export const WITHDRAWAL_STATUS = {
    PENDIENTE: 'pendiente',
    AUTORIZADO: 'autorizado',
    RECHAZADO: 'rechazado',
    COMPLETADO: 'completado',
} as const

export type WithdrawalStatus = typeof WITHDRAWAL_STATUS[keyof typeof WITHDRAWAL_STATUS]

export const EXPENSE_CATEGORIES = {
    TRANSPORTE: 'transporte',
    ALIMENTACION: 'alimentacion',
    SERVICIOS: 'servicios',
    LIMPIEZA: 'limpieza',
    OTRO: 'otro',
} as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES]

// =====================================================
// MENSAJES DEL SISTEMA
// =====================================================

export const MESSAGES = {
    SUCCESS: {
        PRODUCT_CREATED: 'Producto creado exitosamente',
        PRODUCT_UPDATED: 'Producto actualizado exitosamente',
        PRODUCT_DELETED: 'Producto eliminado exitosamente',
        SALE_COMPLETED: 'Venta completada exitosamente',
        MOVEMENT_COMPLETED: 'Movimiento registrado exitosamente',
        LOGIN_SUCCESS: 'Inicio de sesión exitoso',
        CASH_OPENED: 'Caja abierta exitosamente',
        CASH_CLOSED: 'Caja cerrada exitosamente',
        CONFIG_UPDATED: 'Configuración actualizada exitosamente',
        USER_CREATED: 'Usuario creado exitosamente',
        USER_UPDATED: 'Usuario actualizado exitosamente',
    },
    ERROR: {
        GENERIC: 'Ocurrió un error inesperado',
        UNAUTHORIZED: 'No autorizado',
        FORBIDDEN: 'No tienes permisos para realizar esta acción',
        NOT_FOUND: 'Recurso no encontrado',
        VALIDATION_ERROR: 'Error de validación',
        INSUFFICIENT_STOCK: 'Stock insuficiente',
        INVALID_CREDENTIALS: 'Credenciales inválidas',
        CASH_ALREADY_OPEN: 'Ya tienes una caja abierta',
        CASH_NOT_OPEN: 'No tienes una caja abierta',
        CASH_DIFFERENCE: 'Hay diferencia en el cuadre de caja',
        CONFIG_NOT_FOUND: 'Configuración no encontrada',
    },
    WARNING: {
        LOW_STOCK: 'Stock bajo',
        EXPIRING_SOON: 'Producto próximo a vencer',
        CASH_DIFFERENCE: 'Diferencia en caja',
        SESSION_LONG: 'Sesión de caja abierta por mucho tiempo',
        PENDING_AUTHORIZATION: 'Pendiente de autorización',
    },
} as const

// =====================================================
// FUNCIONES PARA CONFIGURACIÓN DINÁMICA
// =====================================================

/**
 * Obtiene un valor de configuración de la base de datos
 * 
 * @param key Clave de configuración
 * @param defaultValue Valor por defecto si no existe
 * @returns Promise con el valor de configuración
 * 
 * @example
 * const iva = await getConfigValue('iva_porcentaje', 19)
 */
export async function getConfigValue(
    key: string,
    defaultValue: string | number | boolean
): Promise<string | number | boolean> {
    try {
        const { prisma } = await import('./prisma')
        const config = await prisma.configuracion.findUnique({
            where: { clave: key }
        })
        
        if (!config) return defaultValue
        
        switch (config.tipo) {
            case 'number':
                return Number(config.valor)
            case 'boolean':
                return config.valor === 'true'
            default:
                return config.valor || defaultValue
        }
    } catch (error) {
        console.error(`Error al obtener configuración '${key}':`, error)
        return defaultValue
    }
}

/**
 * Obtiene todas las configuraciones de la base de datos
 * 
 * @returns Promise con un objeto con todas las configuraciones
 * 
 * @example
 * const configs = await getAllConfig()
 * console.log(configs.iva_porcentaje) // 19
 */
export async function getAllConfig(): Promise<Record<string, any>> {
    try {
        const { prisma } = await import('./prisma')
        const configs = await prisma.configuracion.findMany()
        
        const result: Record<string, any> = {}
        configs.forEach(config => {
            switch (config.tipo) {
                case 'number':
                    result[config.clave] = Number(config.valor)
                    break
                case 'boolean':
                    result[config.clave] = config.valor === 'true'
                    break
                default:
                    result[config.clave] = config.valor
            }
        })
        
        return result
    } catch (error) {
        console.error('Error al obtener configuraciones:', error)
        return {}
    }
}

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(role: RoleName, permission: keyof typeof PERMISSIONS[typeof ROLES.ADMIN]): boolean {
    const rolePermissions = PERMISSIONS[role]
    return rolePermissions.all || rolePermissions[permission]
}

/**
 * Verifica si un producto tiene stock bajo
 * IMPORTANTE: Usa el stock_minimo individual del producto, no un umbral global
 */
export function hasLowStock(stockActual: number, stockMinimo: number): boolean {
    return stockActual > 0 && stockActual <= stockMinimo
}

/**
 * Verifica si un producto está agotado
 */
export function isOutOfStock(stockActual: number): boolean {
    return stockActual <= 0
}

/**
 * Obtiene el estado de un producto basado en su stock individual
 * 
 * @param stock Stock actual del producto
 * @param stockMinimo Stock mínimo INDIVIDUAL del producto (NO usar umbral global)
 * @param fechaVencimiento Fecha de vencimiento (opcional)
 * @returns Estado del producto
 */
export function getProductStatus(
    stock: number, 
    stockMinimo: number, 
    fechaVencimiento?: Date | null
): ProductStatus {
    if (stock === 0) return PRODUCT_STATUS.AGOTADO
    if (stock <= stockMinimo) return PRODUCT_STATUS.BAJO_STOCK // ✅ Usa stock_minimo del producto

    if (fechaVencimiento) {
        const diasRestantes = Math.ceil((fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (diasRestantes <= CONFIG.DIAS_ALERTA_VENCIMIENTO) {
            return PRODUCT_STATUS.PROXIMO_VENCER
        }
    }

    return PRODUCT_STATUS.DISPONIBLE
}

/**
 * Formatea un precio en pesos colombianos
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

/**
 * Calcula el IVA de un monto
 */
export function calculateIVA(amount: number): number {
    return amount * (CONFIG.IVA_PERCENTAGE / 100)
}

/**
 * Calcula el total con IVA
 */
export function calculateTotalWithIVA(subtotal: number): number {
    return subtotal + calculateIVA(subtotal)
}

/**
 * Valida si una diferencia de caja está dentro del umbral aceptable
 */
export function isCashDifferenceAcceptable(diferencia: number): boolean {
    return Math.abs(diferencia) <= CONFIG.UMBRAL_DIFERENCIA_CAJA
}
