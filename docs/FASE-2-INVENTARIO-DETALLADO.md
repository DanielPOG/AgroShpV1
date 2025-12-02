# 📦 FASE 2 - MÓDULO DE INVENTARIO COMPLETO
**Fecha Inicio:** 30 de Noviembre, 2025  
**Estado:** 🚀 EN PROGRESO (65% → 100%)  
**Duración Estimada:** 10-16 días restantes

---

## 🎯 OBJETIVO

Completar el **100% del módulo de inventario** con todas sus funcionalidades críticas:
- ✅ Ajuste manual de stock (UI) - **COMPLETADO 30 Nov**
- ❌ Gestión de lotes (trazabilidad) - **PENDIENTE**
- ❌ Costos de producción (rentabilidad) - **PENDIENTE**
- ❌ Alertas de stock y vencimiento - **PENDIENTE**
- ❌ CRUD de configuración (categorías, unidades, proveedores) - **PENDIENTE**

---

## 📊 ESTADO ACTUAL (30 Nov 2025)

### ✅ **LO QUE YA FUNCIONA (60%)**

#### 1. CRUD Básico de Productos
- ✅ `lib/validations/product.schema.ts` - 430 líneas, 100% completo
- ✅ `lib/db/products.ts` - 954 líneas, funciones completas
- ✅ `/api/productos/*` - GET, POST, PUT, DELETE
- ✅ 7 Componentes UI (create, update, detail, history, card, filters, page)
- ✅ Auditoría automática (auditoria + historial_inventario)
- ✅ Validación con Zod
- ✅ Control de permisos por rol
- ✅ Paginación y 12 filtros

#### 2. Control de Stock Básico
- ✅ Stock actual, mínimo, máximo
- ✅ Alertas de stock bajo/agotado
- ✅ Historial de movimientos
- ✅ Función `adjustStock()` en backend
- ✅ **COMPLETADO (30 Nov):** UI para ajustar stock manualmente

#### 3. Proveedores
- ✅ Tabla `proveedores` en BD
- ✅ 8 proveedores seeded
- ✅ Integración con productos (proveedor_id, es_produccion_propia)
- ✅ GET `/api/proveedores`
- ❌ **FALTA:** POST, PUT, DELETE endpoints
- ❌ **FALTA:** UI de gestión de proveedores

---

## ❌ **LO QUE FALTA (40%)**

### 🚨 CRÍTICO - FUNCIONALIDAD CENTRAL

#### **Subtarea 2.1: Ajuste Manual de Stock** ✅ COMPLETADA (30 Nov 2025)
**Justificación:** Función diaria para corregir inventario físico (mermas, producción, ajustes).

**Backend:**
- ✅ Ya existe `adjustStock()` en `lib/db/products.ts`
- ✅ Recibe: producto_id, tipo_movimiento, cantidad, motivo, usuario_id
- ✅ Valida stock suficiente
- ✅ Crea registro en `historial_inventario`

**✅ IMPLEMENTADO:**

**Archivos creados:**
1. ✅ `app/api/productos/[id]/ajustar-stock/route.ts` - Endpoint API
2. ✅ `components/inventory/adjust-stock-modal.tsx` - Modal UI con 3 tipos de movimiento

**Archivos modificados:**
3. ✅ `components/inventory/product-card.tsx` - Opción "Ajustar Stock" en dropdown
4. ✅ `components/inventory/product-detail-modal.tsx` - Botón "Ajustar Stock"
5. ✅ `components/inventory/inventory-page-client.tsx` - Integración del modal
6. ✅ `lib/validations/product.schema.ts` - Schema validado (ya existía completo)

**Funcionalidades:**
- ✅ Entrada de stock (producción, compra, devolución)
- ✅ Salida de stock (venta, consumo, merma)
- ✅ Ajuste manual (corrección inventario físico)
- ✅ Validación stock suficiente
- ✅ Validación motivo mínimo 5 caracteres
- ✅ UI con 3 radio buttons + iconos descriptivos
- ✅ Preview de nuevo stock en tiempo real
- ✅ Registro automático en `historial_inventario`
- ✅ Control de permisos (Admin, Inventarista)

**Puntos de acceso:**
- ✅ ProductCard → Menu ⋮ → "Ajustar Stock"
- ✅ ProductDetailModal → Botón "Ajustar Stock"

**Tiempo:** 1-2 días ✅ **COMPLETADO**

---

#### **Subtarea 2.2: Gestión de Lotes** (3-4 días) ⚠️ CRÍTICO
**Justificación:** Trazabilidad obligatoria para productos perecederos (cumplimiento INVIMA).

**Caso de uso:**
- Lácteos produce yogurt → Lote "YOG-2025-001" (50 unidades, vence en 30 días)
- Bovinos produce leche → Lote "LEC-2025-012" (100 L, vence en 7 días)
- Retiro de lote defectuoso
- Alerta de lotes próximos a vencer

**Esquema DB (ya existe):**
```sql
lotes_productos {
  id INT PRIMARY KEY,
  producto_id INT NOT NULL,
  codigo_lote VARCHAR(50) UNIQUE,
  cantidad DECIMAL(10,2),
  fecha_produccion DATE,
  fecha_vencimiento DATE,
  unidad_productiva_id INT,
  estado VARCHAR(20) DEFAULT 'disponible', -- disponible, vencido, retirado
  created_at TIMESTAMP
}
```

**Archivos a crear:**

**1. Validación:**
- [ ] Crear `lib/validations/lote.schema.ts`
```typescript
// createLoteSchema
{
  producto_id: z.number().int().positive(),
  codigo_lote: z.string().min(5).max(50).regex(/^[A-Z0-9-]+$/),
  cantidad: z.number().positive(),
  fecha_produccion: z.date(),
  fecha_vencimiento: z.date().optional(),
  unidad_productiva_id: z.number().int().positive(),
  estado: z.enum(['disponible', 'vencido', 'retirado']).default('disponible')
}
// updateLoteSchema (solo estado y cantidad)
// Validación: fecha_vencimiento > fecha_produccion
// Validación: si producto es perecedero, fecha_vencimiento es requerida
```

**2. Funciones DB:**
- [ ] Crear `lib/db/lotes.ts`
```typescript
// getLotes(filters) - Listar con filtros
// getLoteById(id) - Obtener uno con producto
// createLote(data) - Crear lote
// updateLote(id, data) - Actualizar estado/cantidad
// deleteLote(id) - Eliminar lote
// getLotesByProducto(producto_id) - Lotes de un producto
// getLotesProximosVencer(dias) - Lotes con vencimiento próximo
// getLotesVencidos() - Lotes vencidos
```

**3. API Endpoints:**
- [ ] Crear `app/api/lotes/route.ts`
  - GET: Listar lotes con filtros
  - POST: Crear lote
- [ ] Crear `app/api/lotes/[id]/route.ts`
  - GET: Detalle de lote
  - PUT: Actualizar estado/cantidad
  - DELETE: Eliminar lote
- [ ] Crear `app/api/productos/[id]/lotes/route.ts`
  - GET: Lotes de un producto
- [ ] Crear `app/api/lotes/vencimientos/route.ts`
  - GET: Lotes próximos a vencer (query param: dias)

**4. Componentes UI:**
- [ ] Crear `components/inventory/create-lote-modal.tsx`
  - Form para crear lote
  - Select producto
  - Input código lote (auto-generar sugerencia)
  - Input cantidad
  - DatePicker fecha producción
  - DatePicker fecha vencimiento (solo si es perecedero)
  - Select unidad productiva
- [ ] Crear `components/inventory/lotes-list.tsx`
  - Tabla de lotes con filtros
  - Badges de estado (disponible, vencido, retirado)
  - Alertas visuales para próximos a vencer
  - Acciones: ver, editar, eliminar
- [ ] Crear `components/inventory/lote-detail-modal.tsx`
  - Información del lote
  - Información del producto
  - Historial de movimientos del lote
  - Botón cambiar estado
- [ ] Modificar `components/inventory/product-detail-modal.tsx`
  - Agregar sección "Lotes" con lista de lotes del producto
  - Botón "Crear Lote"
- [ ] Modificar `components/inventory/inventory-page-client.tsx`
  - Agregar filtro "Próximos a vencer"
  - Badge visual en cards de productos con lotes vencidos

**5. Hooks:**
- [ ] Crear `hooks/use-lotes.ts`
  - useLotes() - Listar lotes
  - useLote(id) - Obtener un lote
  - useLotesByProducto(producto_id)
  - useLotesMutations() - create, update, delete

**6. Testing:**
- [ ] Crear lote para producto perecedero
- [ ] Crear lote para producto no perecedero
- [ ] Validar fecha_vencimiento requerida para perecederos
- [ ] Validar código_lote único
- [ ] Ver lotes de un producto
- [ ] Cambiar estado de lote
- [ ] Alertas de vencimiento

**Tiempo:** 3-4 días

---

#### **Subtarea 2.3: Costos de Producción** (3-4 días) ⚠️ CRÍTICO
**Justificación:** Calcular rentabilidad real para decisiones de precios informadas.

**Caso de uso:**
- Yogurt cuesta: $5000 materia prima + $2000 mano obra + $1000 insumos = $8000
- Se vende a: $15000
- Margen: $7000 (87.5% de ganancia)
- Decisión: Precio competitivo o aumentar?

**Esquema DB (ya existe):**
```sql
costos_produccion {
  id INT PRIMARY KEY,
  producto_id INT,
  lote_id INT OPTIONAL,
  costo_materia_prima DECIMAL(10,2) DEFAULT 0,
  costo_mano_obra DECIMAL(10,2) DEFAULT 0,
  costo_insumos DECIMAL(10,2) DEFAULT 0,
  costo_energia DECIMAL(10,2) DEFAULT 0,
  otros_costos DECIMAL(10,2) DEFAULT 0,
  costo_total DECIMAL(10,2) GENERATED, -- suma automática
  cantidad_producida DECIMAL(10,2),
  costo_unitario DECIMAL(10,2) GENERATED, -- costo_total / cantidad
  fecha_registro DATE,
  observaciones TEXT,
  created_at TIMESTAMP
}
```

**Archivos a crear:**

**1. Validación:**
- [ ] Crear `lib/validations/costo.schema.ts`
```typescript
// createCostoSchema
{
  producto_id: z.number().int().positive(),
  lote_id: z.number().int().positive().optional(),
  costo_materia_prima: z.number().min(0).default(0),
  costo_mano_obra: z.number().min(0).default(0),
  costo_insumos: z.number().min(0).default(0),
  costo_energia: z.number().min(0).default(0),
  otros_costos: z.number().min(0).default(0),
  cantidad_producida: z.number().positive(),
  fecha_registro: z.date().default(now),
  observaciones: z.string().optional()
}
// Validación: al menos un costo > 0
```

**2. Funciones DB:**
- [ ] Crear `lib/db/costos.ts`
```typescript
// getCostos(filters) - Listar costos
// getCostosByProducto(producto_id) - Costos de un producto
// createCosto(data) - Registrar costo (costo_total y unitario se calculan auto)
// getPromediosCosto(producto_id) - Promedio de costos
// getRentabilidad(producto_id) - precio_venta vs costo_promedio
// getProductosMayorMargen() - Productos más rentables
```

**3. API Endpoints:**
- [ ] Crear `app/api/costos/route.ts`
  - GET: Listar costos con filtros
  - POST: Registrar costo
- [ ] Crear `app/api/productos/[id]/costos/route.ts`
  - GET: Costos de un producto + promedio
- [ ] Crear `app/api/productos/[id]/rentabilidad/route.ts`
  - GET: Rentabilidad del producto
```typescript
{
  producto_id, nombre,
  precio_unitario,
  costo_promedio,
  margen: precio - costo,
  porcentaje_margen: ((precio - costo) / precio) * 100
}
```

**4. Componentes UI:**
- [ ] Crear `components/inventory/register-cost-modal.tsx`
  - Form para registrar costos
  - Select producto
  - Select lote (opcional)
  - Inputs para cada tipo de costo
  - Input cantidad producida
  - Cálculo automático de costo total y unitario
  - DatePicker fecha registro
  - Textarea observaciones
- [ ] Crear `components/inventory/costs-list.tsx`
  - Tabla de costos históricos
  - Filtros: producto, fecha, lote
  - Resumen de promedios
- [ ] Crear `components/inventory/profitability-card.tsx`
  - Card que muestra rentabilidad
  - Badge de color según margen (verde >50%, amarillo 20-50%, rojo <20%)
  - Gráfica precio vs costo
- [ ] Modificar `components/inventory/product-detail-modal.tsx`
  - Agregar sección "Costos y Rentabilidad"
  - Mostrar costo promedio
  - Mostrar margen de ganancia
  - Botón "Registrar Costo"
- [ ] Modificar `components/inventory/product-card.tsx`
  - Agregar badge de rentabilidad (opcional)
  - Tooltip con margen %

**5. Hooks:**
- [ ] Crear `hooks/use-costos.ts`
  - useCostos() - Listar costos
  - useCostosByProducto(producto_id)
  - useRentabilidad(producto_id)
  - useCostosMutations() - create

**6. Testing:**
- [ ] Registrar costo para producto
- [ ] Registrar costo para lote específico
- [ ] Validar cantidad_producida > 0
- [ ] Calcular costo_total correctamente
- [ ] Calcular costo_unitario correctamente
- [ ] Ver rentabilidad de producto
- [ ] Ver productos más rentables

**Tiempo:** 3-4 días

---

### 📊 REPORTES Y MEJORAS UX

#### **Subtarea 2.4: Alertas de Stock y Vencimiento** (1 día)

**Archivos a crear:**
- [ ] Crear `app/api/productos/alertas/route.ts`
  - GET: Productos con stock bajo/agotado
  - GET: Productos con stock alto (sobrestockeados)
- [ ] Crear `app/api/lotes/vencimientos/route.ts`
  - GET: Lotes próximos a vencer (parámetro: días, default 7)
- [ ] Crear `components/dashboard/stock-alerts-widget.tsx`
  - Widget para dashboard
  - Lista de productos críticos
  - Link a inventario con filtro aplicado
- [ ] Crear `components/dashboard/expiration-alerts-widget.tsx`
  - Widget para dashboard
  - Lista de lotes próximos a vencer
  - Contador de días restantes
- [ ] Modificar `app/dashboard/inventario/page.tsx`
  - Agregar widgets de alertas al inicio

**Tiempo:** 1 día

---

### ⚙️ CONFIGURACIÓN Y ADMINISTRACIÓN

#### **Subtarea 2.5: CRUD de Categorías** (1-2 días)

**Backend:**
- ✅ Ya existe GET `/api/categorias`
- ❌ Falta POST, PUT, DELETE

**Archivos a crear:**
- [ ] Crear `lib/validations/categoria.schema.ts`
- [ ] Crear `lib/db/categorias.ts`
  - createCategoria()
  - updateCategoria()
  - deleteCategoria() (verificar que no tenga productos)
- [ ] Modificar `app/api/categorias/route.ts`
  - Agregar POST
- [ ] Crear `app/api/categorias/[id]/route.ts`
  - GET, PUT, DELETE
- [ ] Crear `app/dashboard/admin/categorias/page.tsx`
- [ ] Crear `components/admin/create-category-modal.tsx`
- [ ] Crear `components/admin/update-category-modal.tsx`
- [ ] Crear `components/admin/categories-list.tsx`

**Tiempo:** 1-2 días

---

#### **Subtarea 2.6: CRUD de Unidades Productivas** (1-2 días)

**Backend:**
- ✅ Ya existe GET `/api/unidades`
- ❌ Falta POST, PUT, DELETE

**Archivos a crear:**
- [ ] Crear `lib/validations/unidad-productiva.schema.ts`
- [ ] Crear `lib/db/unidades-productivas.ts`
- [ ] Modificar `app/api/unidades/route.ts`
- [ ] Crear `app/api/unidades/[id]/route.ts`
- [ ] Crear `app/dashboard/admin/unidades/page.tsx`
- [ ] Crear `components/admin/create-unit-modal.tsx`
- [ ] Crear `components/admin/update-unit-modal.tsx`
- [ ] Crear `components/admin/units-list.tsx`

**Tiempo:** 1-2 días

---

#### **Subtarea 2.7: CRUD de Proveedores** (2-3 días)

**Backend:**
- ✅ Ya existe GET `/api/proveedores`
- ✅ 8 proveedores seeded
- ❌ Falta POST, PUT, DELETE

**Archivos a crear:**
- [ ] Crear `lib/validations/proveedor.schema.ts`
- [ ] Crear `lib/db/proveedores.ts`
  - createProveedor()
  - updateProveedor()
  - deleteProveedor() (verificar que no tenga productos)
  - getProveedorConProductos(id)
- [ ] Modificar `app/api/proveedores/route.ts`
  - Agregar POST
- [ ] Crear `app/api/proveedores/[id]/route.ts`
  - GET, PUT, DELETE
- [ ] Crear `app/api/proveedores/[id]/productos/route.ts`
  - GET: Productos del proveedor
- [ ] Crear `app/dashboard/admin/proveedores/page.tsx`
- [ ] Crear `components/admin/create-proveedor-modal.tsx`
- [ ] Crear `components/admin/update-proveedor-modal.tsx`
- [ ] Crear `components/admin/proveedor-detail-modal.tsx`
- [ ] Crear `components/admin/proveedores-list.tsx`

**Tiempo:** 2-3 días

---

## 📅 CRONOGRAMA DETALLADO

### **Semana 1 (5 días hábiles)**
**Día 1 (30 Nov 2025):**
- ✅ **COMPLETADO:** Ajuste Manual de Stock
  - ✅ Endpoint API `/api/productos/[id]/ajustar-stock`
  - ✅ Modal UI con 3 tipos de movimiento
  - ✅ Integración en ProductCard y ProductDetailModal
  - ✅ Testing básico y corrección de errores

**Días 2-5:**
- ❌ Gestión de Lotes (inicio)
  - Schemas de validación
  - Funciones DB
  - 3 endpoints API principales

---

### **Semana 2 (5 días hábiles)**
**Días 6-8:**
- ✅ Gestión de Lotes (finalizar)
  - 2 endpoints adicionales
  - 4 componentes UI
  - Hooks personalizados
  - Integración con inventario
  - Testing completo

**Días 9-10:**
- ✅ Costos de Producción (inicio)
  - Schemas de validación
  - Funciones DB
  - Endpoints API

---

### **Semana 3 (5 días hábiles)**
**Días 11-13:**
- ✅ Costos de Producción (finalizar)
  - Componentes UI
  - Hooks personalizados
  - Integración con inventario
  - Testing completo

**Día 14:**
- ✅ Alertas de Stock y Vencimiento
  - 2 endpoints API
  - 2 widgets para dashboard
  - Testing

**Día 15:**
- ✅ Buffer / Testing general

---

### **Semana 4 (Opcional - Configuración)**
**Días 16-18:**
- ✅ CRUD de Categorías, Unidades, Proveedores
- ✅ Testing completo del módulo

---

## 🎯 CRITERIOS DE ACEPTACIÓN

### **Módulo completo cuando:**
- [x] Usuario puede ajustar stock manualmente desde UI ✅ **COMPLETADO 30 Nov**
- [ ] Usuario puede crear y gestionar lotes de productos
- [ ] Usuario puede registrar costos de producción
- [ ] Usuario puede ver rentabilidad de productos
- [ ] Dashboard muestra alertas de stock crítico
- [ ] Dashboard muestra alertas de vencimientos
- [ ] Admin puede gestionar categorías
- [ ] Admin puede gestionar unidades productivas
- [ ] Admin puede gestionar proveedores
- [ ] Todas las funciones tienen testing básico
- [ ] Documentación actualizada

---

## 📝 NOTAS IMPORTANTES

### **Lo que NO es parte de este módulo:**
❌ Movimientos entre unidades (`movimientos_unidades`) → Módulo separado (Fase 4)
❌ Solicitudes de transferencia (`solicitudes_transferencia`) → Módulo separado (Fase 12)
❌ Reportes avanzados → Módulo de reportes (Fase 5)
❌ Dashboard completo → Módulo de dashboard (Fase 5)
❌ Sistema de ventas/POS → Módulo de ventas (Fase 3)

### **Dependencias:**
- ✅ NextAuth configurado (Fase 1 completa)
- ✅ Base de datos con 30 tablas
- ✅ Prisma ORM configurado
- ✅ UI components (shadcn/ui)
- ✅ Validación (Zod)

---

## 🚀 PRÓXIMOS PASOS

**✅ COMPLETADO (30 Nov 2025):**
1. ✅ **Subtarea 2.1: Ajuste Manual de Stock** - Funcionalidad de uso diario
   - Endpoint API completo con autenticación y validación
   - Modal UI con 3 tipos de movimiento (entrada/salida/ajuste)
   - Integración en ProductCard y ProductDetailModal
   - Validaciones completas y manejo de errores

**SIGUIENTE (1 Dic 2025):**
1. Comenzar con **Subtarea 2.2: Gestión de Lotes** (3-4 días)
   - Crítico para trazabilidad y cumplimiento INVIMA
   - Productos perecederos requieren control por lote
   - Alertas de vencimiento

**Después:**
3. Costos de Producción (3-4 días)
4. Alertas (1 día)
5. CRUD de configuración (4-7 días opcional)

---

**PROGRESO ACTUAL:** 65% completo (↑ desde 60%)  
**TOTAL ESTIMADO RESTANTE:** 10-16 días para módulo 100% completo  
**MÍNIMO VIABLE RESTANTE:** 7-9 días (sin CRUD de configuración)
