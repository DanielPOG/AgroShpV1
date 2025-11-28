# 🔧 Corrección: Configuración y Stock Mínimo

## 📋 **PROBLEMAS IDENTIFICADOS**

### 1️⃣ Stock Mínimo: Confusión entre Global vs Individual

**Estado actual (CONFUSO):**
```sql
-- productos.stock_minimo: Por producto ✅
-- configuracion.stock_bajo_umbral: Global ⚠️
```

**Problema:**
- ¿Cuál se usa para alertas?
- Si un tomate necesita stock mín. 50 y queso 10, ¿cómo se maneja?

### 2️⃣ Configuraciones No Editables

**Estado actual:**
```sql
-- Hardcodeadas en schema.sql
INSERT INTO configuracion VALUES ('iva_porcentaje', '19', ...);
```

**Problema:**
- No se pueden editar desde el admin
- Cambiar el IVA requiere modificar BD manualmente

---

## ✅ **SOLUCIÓN PROPUESTA**

### **1. CLARIFICAR: Stock Mínimo POR PRODUCTO**

**Cada producto tiene su propio stock mínimo:**

```sql
CREATE TABLE productos (
    -- ...
    stock_minimo DECIMAL(10, 2) DEFAULT 0, -- ✅ Específico del producto
    -- ...
);
```

**La configuración global es solo un VALOR POR DEFECTO:**

```sql
-- Esta es la sugerencia al crear nuevos productos
('stock_minimo_default', '10', 'number', 'Valor por defecto para nuevos productos')
```

**Lógica de Alertas:**
```javascript
// ✅ CORRECTO: Usar stock_minimo del producto
if (producto.stock_actual <= producto.stock_minimo) {
    alert('Stock bajo en ' + producto.nombre)
}

// ❌ INCORRECTO: Usar umbral global
if (producto.stock_actual <= CONFIG.stock_bajo_umbral) {
    // Esto NO tiene sentido si cada producto es diferente
}
```

### **2. AGREGAR: Panel de Configuración en Admin**

**Nueva fase en el plan:**

#### **Fase 18: Panel de Administración y Configuración** (2-3 días)

**Funcionalidades:**

1. **Configuración del Sistema** (editable)
   - IVA (%)
   - Nombre de la tienda
   - Email/Teléfono de contacto
   - Stock mínimo por defecto
   - Días de alerta de vencimiento
   - Logo de la empresa
   - Configuración de impresora

2. **Gestión de Usuarios**
   - CRUD de usuarios
   - Asignación de roles
   - Activar/desactivar usuarios
   - Resetear contraseñas

3. **Gestión de Roles**
   - Ver permisos por rol
   - Modificar permisos (Admin solo)

4. **Gestión de Categorías**
   - CRUD de categorías de productos
   - Cambiar colores e iconos

5. **Gestión de Unidades Productivas**
   - CRUD de unidades productivas
   - Asignar responsables

6. **Gestión de Métodos de Pago**
   - Activar/desactivar métodos
   - Agregar nuevos métodos

7. **Configuración de Cajas**
   - CRUD de cajas registradoras
   - Activar/desactivar cajas

---

## 📊 **ESTRUCTURA ACTUALIZADA**

### **Tabla de Configuración (Ya existe)**

```sql
CREATE TABLE configuracion (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(20), -- 'string', 'number', 'boolean', 'json'
    descripcion TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Configuraciones Recomendadas**

```sql
-- Configuraciones iniciales (EDITABLES desde admin)
INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES
-- Sistema
('nombre_tienda', 'AgroShop SENA', 'string', 'Nombre de la tienda'),
('email_tienda', 'agroshop@sena.edu.co', 'string', 'Email de contacto'),
('telefono_tienda', '(601) 5461500', 'string', 'Teléfono de contacto'),
('logo_url', '', 'string', 'URL del logo de la empresa'),

-- Impuestos
('iva_porcentaje', '19', 'number', 'Porcentaje de IVA (Colombia)'),
('aplica_iva_todos', 'true', 'boolean', 'Aplicar IVA a todos los productos'),

-- Inventario
('stock_minimo_default', '10', 'number', 'Stock mínimo por defecto al crear productos'),
('dias_alerta_vencimiento', '7', 'number', 'Días antes del vencimiento para alertar'),
('permitir_venta_stock_cero', 'false', 'boolean', 'Permitir vender productos sin stock'),

-- Caja
('fondo_inicial_default', '200000', 'number', 'Fondo inicial sugerido para caja'),
('umbral_diferencia_caja', '5000', 'number', 'Monto máximo de diferencia aceptable'),
('requiere_autorizacion_retiro', 'true', 'boolean', 'Retiros requieren autorización'),
('monto_minimo_autorizacion', '100000', 'number', 'Monto mínimo que requiere autorización'),

-- Facturación
('prefijo_factura', 'FAC-', 'string', 'Prefijo para facturas'),
('resolucion_dian', '', 'string', 'Número de resolución DIAN'),
('fecha_resolucion', '', 'string', 'Fecha de resolución DIAN'),
('rango_facturacion_desde', '1', 'number', 'Rango de facturación inicio'),
('rango_facturacion_hasta', '10000', 'number', 'Rango de facturación fin'),

-- POS
('mostrar_imagenes_productos', 'true', 'boolean', 'Mostrar imágenes en POS'),
('permitir_descuentos_cajero', 'false', 'boolean', 'Cajero puede aplicar descuentos'),
('requiere_cliente_factura', 'true', 'boolean', 'Requiere datos de cliente para factura'),

-- Notificaciones
('notificar_stock_bajo', 'true', 'boolean', 'Notificar cuando hay stock bajo'),
('notificar_vencimiento', 'true', 'boolean', 'Notificar productos próximos a vencer'),
('notificar_diferencia_caja', 'true', 'boolean', 'Notificar diferencias en caja');
```

---

## 🔄 **ACTUALIZACIÓN DE lib/constants.ts**

Actualizar para que lea de BD en lugar de solo env vars:

```typescript
// =====================================================
// CONFIGURACIÓN DEL SISTEMA (DINÁMICA)
// =====================================================

/**
 * NOTA: Estos son valores por defecto.
 * Los valores reales deben leerse de la tabla 'configuracion'
 * usando la función getConfig() en tiempo de ejecución.
 */
export const CONFIG = {
    // Impuestos
    IVA_PERCENTAGE: Number(process.env.NEXT_PUBLIC_IVA_PERCENTAGE) || 19,

    // Inventario
    STOCK_MINIMO_DEFAULT: Number(process.env.NEXT_PUBLIC_STOCK_MINIMO_DEFAULT) || 10,
    DIAS_ALERTA_VENCIMIENTO: Number(process.env.NEXT_PUBLIC_DIAS_ALERTA_VENCIMIENTO) || 7,

    // Caja
    FONDO_INICIAL_DEFAULT: 200000,
    UMBRAL_DIFERENCIA_CAJA: 5000,
    MONTO_MINIMO_AUTORIZACION: 100000,

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
// CONSTANTES DE CONTROL DE CAJA 🆕
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
// FUNCIÓN PARA OBTENER CONFIGURACIÓN DE BD 🆕
// =====================================================

/**
 * Obtiene un valor de configuración de la base de datos
 * Uso: const iva = await getConfigValue('iva_porcentaje', 19)
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
        console.error('Error al obtener configuración:', error)
        return defaultValue
    }
}

/**
 * Obtiene todas las configuraciones de la BD
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
// MENSAJES DEL SISTEMA (ACTUALIZADOS) 🆕
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
    },
    WARNING: {
        LOW_STOCK: 'Stock bajo',
        EXPIRING_SOON: 'Producto próximo a vencer',
        CASH_DIFFERENCE: 'Diferencia en caja',
        SESSION_LONG: 'Sesión de caja abierta por mucho tiempo',
    },
} as const

// =====================================================
// UTILIDADES ACTUALIZADAS
// =====================================================

/**
 * Verifica si un producto tiene stock bajo
 * CORRECTO: Usa stock_minimo del producto, no umbral global
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
```

---

## 🎯 **FASE 18: Panel de Administración** (NUEVA)

### **Archivos a Crear:**

```
lib/validations/
  - config.schema.ts        Schema para configuración

lib/db/
  - config.ts               CRUD de configuración
  - users.ts                CRUD de usuarios (ya existe en plan)

app/api/
  - /config/route.ts        GET, PUT configuraciones
  - /usuarios/route.ts      CRUD usuarios
  - /roles/route.ts         GET roles
  - /categorias/route.ts    CRUD categorías
  - /unidades/route.ts      CRUD unidades productivas

app/dashboard/admin/
  - page.tsx                Panel principal admin
  - configuracion/page.tsx  Editar configuración
  - usuarios/page.tsx       Gestión de usuarios
  - categorias/page.tsx     Gestión de categorías
  - unidades/page.tsx       Gestión de unidades

components/admin/
  - config-form.tsx         Formulario de configuración
  - user-form.tsx           Formulario de usuarios
  - user-list.tsx           Lista de usuarios
  - category-form.tsx       Formulario de categorías
  - unit-form.tsx           Formulario de unidades
```

### **API Endpoints:**

```
GET    /api/config              Obtener todas las configs
GET    /api/config/[key]        Obtener config específica
PUT    /api/config/[key]        Actualizar config
POST   /api/config/bulk         Actualizar múltiples configs

GET    /api/usuarios            Listar usuarios
POST   /api/usuarios            Crear usuario
PUT    /api/usuarios/[id]       Actualizar usuario
DELETE /api/usuarios/[id]       Desactivar usuario
POST   /api/usuarios/[id]/reset-password  Resetear contraseña
```

---

## 📋 **RESUMEN DE CAMBIOS NECESARIOS**

### ✅ **En la Base de Datos (Ya está bien)**
- ✅ `productos.stock_minimo` existe (línea 117)
- ✅ Tabla `configuracion` existe (línea 310)
- ⚠️ Renombrar `stock_bajo_umbral` → `stock_minimo_default` (más claro)

### 📝 **En lib/constants.ts**
- ✅ Agregar constantes de control de caja
- ✅ Agregar funciones `getConfigValue()` y `getAllConfig()`
- ✅ Actualizar `getProductStatus()` para usar `stock_minimo` del producto
- ✅ Agregar mensajes de éxito/error para caja y configuración

### 🆕 **Agregar Fase 18**
- Panel de Administración completo
- CRUD de configuraciones (editables)
- CRUD de usuarios
- CRUD de categorías y unidades productivas

---

## 🎯 **PLAN ACTUALIZADO**

**Fases Core (Obligatorias):**
- Fase 0-8: Sistema básico (✅ Ya planificado)

**Fases Avanzadas:**
- Fase 9-17: Funcionalidades avanzadas (✅ Ya planificado)
- **Fase 18: Panel de Administración** 🆕 (2-3 días) 🔴 CRÍTICA

**Total:**
- Core: 4.5-6.5 semanas
- Avanzadas: 3-4 semanas
- Admin: +0.5 semana
- **TOTAL: 7-10 semanas**

---

## ✅ **CONCLUSIÓN**

### **¿La BD ya está bien?**

**SÍ, con pequeños ajustes:**

1. ✅ **Stock mínimo POR PRODUCTO ya existe** (`productos.stock_minimo`)
2. ⚠️ **Renombrar** `stock_bajo_umbral` → `stock_minimo_default` (más claro)
3. ✅ **Tabla configuracion ya existe y está bien diseñada**
4. 🆕 **Falta agregar Fase 18** para editar configs desde admin

### **Lo que faltaba:**
- Panel de administración para editar configuraciones
- Funciones en `constants.ts` para leer de BD
- Clarificar que el "umbral global" es solo valor por defecto

### **La BD está COMPLETA con:**
- ✅ 30 tablas
- ✅ Stock mínimo individual por producto
- ✅ Configuraciones en tabla editable
- ✅ Control de caja completo
- ✅ Todas las funcionalidades avanzadas

**¡Solo falta implementar la Fase 18 para hacerlo todo editable desde el admin!** 🎉

