# 🚀 Mejoras y Recomendaciones para AgroShop - Antes de Empezar

## 📊 Análisis del Proyecto Actual

**Estado actual:**
- ✅ Diseño UI completo de v0 (Next.js 16 + Tailwind v4)
- ✅ Componentes shadcn/ui implementados
- ✅ Mock data estructurado
- ✅ Rutas y navegación definidas
- ✅ Schema de base de datos PostgreSQL diseñado

**Lo que falta:**
- ❌ Conexión con base de datos real
- ❌ Sistema de autenticación funcional
- ❌ API routes implementadas
- ❌ Validaciones de formularios
- ❌ Manejo de estado global
- ❌ Sistema de caché y optimización

---

## 🎯 Mejoras Críticas (Implementar ANTES de empezar)

### 1. **Mejoras en la Base de Datos**

#### 1.1 Agregar Tabla de Clientes
**Por qué:** Actualmente solo guardas nombre/email/teléfono en la tabla `ventas`, pero deberías tener una tabla dedicada.

```sql
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    tipo_cliente VARCHAR(20) DEFAULT 'ocasional', -- 'ocasional', 'frecuente', 'institucional'
    tipo_documento VARCHAR(20), -- 'CC', 'NIT', 'CE'
    numero_documento VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    apellido VARCHAR(150),
    email VARCHAR(150),
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    
    -- Para clientes institucionales (otras dependencias SENA)
    es_institucional BOOLEAN DEFAULT false,
    dependencia VARCHAR(200),
    
    -- Estadísticas
    total_compras DECIMAL(10, 2) DEFAULT 0,
    ultima_compra TIMESTAMP,
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modificar tabla ventas para referenciar clientes
ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id);
```

**Beneficios:**
- Historial de compras por cliente
- Programas de fidelización futuros
- Reportes de clientes frecuentes
- Facturación más profesional

#### 1.2 Agregar Sistema de Descuentos
**Por qué:** El SENA podría dar descuentos a aprendices, empleados o compras al por mayor.

```sql
CREATE TABLE descuentos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL, -- 'porcentaje', 'monto_fijo', 'por_cantidad'
    valor DECIMAL(10, 2) NOT NULL,
    
    -- Condiciones
    minimo_compra DECIMAL(10, 2),
    maximo_descuento DECIMAL(10, 2),
    aplica_a VARCHAR(20), -- 'todos', 'categoria', 'producto'
    categoria_id INTEGER REFERENCES categorias(id),
    producto_id INTEGER REFERENCES productos(id),
    
    -- Restricciones de uso
    usos_maximos INTEGER,
    usos_actuales INTEGER DEFAULT 0,
    fecha_inicio DATE,
    fecha_fin DATE,
    
    -- Restricciones de usuario
    solo_aprendices BOOLEAN DEFAULT false,
    solo_empleados BOOLEAN DEFAULT false,
    solo_institucional BOOLEAN DEFAULT false,
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para aplicar descuentos a ventas
CREATE TABLE descuentos_aplicados (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    descuento_id INTEGER REFERENCES descuentos(id),
    monto_descuento DECIMAL(10, 2) NOT NULL,
    aplicado_por INTEGER REFERENCES usuarios(id),
    fecha_aplicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 1.3 Agregar Tabla de Proveedores (para insumos externos futuros)
**Por qué:** Aunque ahora todo es producción interna, eventualmente necesitarán insumos externos.

```sql
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    nit VARCHAR(50),
    contacto_nombre VARCHAR(150),
    contacto_email VARCHAR(150),
    contacto_telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    tipo_productos TEXT[], -- Array de tipos de productos que provee
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar campo a productos para rastrear origen
ALTER TABLE productos ADD COLUMN proveedor_id INTEGER REFERENCES proveedores(id);
ALTER TABLE productos ADD COLUMN es_produccion_propia BOOLEAN DEFAULT true;
```

#### 1.4 Mejorar Sistema de Auditoría
**Por qué:** Necesitas rastrear QUIÉN hizo QUÉ y CUÁNDO para cumplir con auditorías del SENA.

```sql
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    registro_id INTEGER NOT NULL,
    accion VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    usuario_id INTEGER REFERENCES usuarios(id),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);
```

#### 1.5 Agregar Tabla de Costos de Producción
**Por qué:** Para calcular rentabilidad real de cada producto.

```sql
CREATE TABLE costos_produccion (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes_productos(id),
    
    -- Costos
    costo_materia_prima DECIMAL(10, 2) DEFAULT 0,
    costo_mano_obra DECIMAL(10, 2) DEFAULT 0,
    costo_insumos DECIMAL(10, 2) DEFAULT 0,
    costo_energia DECIMAL(10, 2) DEFAULT 0,
    otros_costos DECIMAL(10, 2) DEFAULT 0,
    costo_total DECIMAL(10, 2) GENERATED ALWAYS AS (
        costo_materia_prima + costo_mano_obra + costo_insumos + costo_energia + otros_costos
    ) STORED,
    
    cantidad_producida DECIMAL(10, 2) NOT NULL,
    costo_unitario DECIMAL(10, 2) GENERATED ALWAYS AS (
        (costo_materia_prima + costo_mano_obra + costo_insumos + costo_energia + otros_costos) / NULLIF(cantidad_producida, 0)
    ) STORED,
    
    fecha_registro DATE DEFAULT CURRENT_DATE,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. **Mejoras en la Arquitectura del Proyecto**

#### 2.1 Estructura de Carpetas Mejorada

```
AgroShpV1/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # Datos iniciales
│
├── src/ (o raíz si prefieres)
│   ├── app/
│   │   ├── (auth)/                # Grupo de rutas de autenticación
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/           # Grupo de rutas protegidas
│   │   │   ├── dashboard/
│   │   │   ├── inventario/
│   │   │   ├── movimientos/
│   │   │   ├── pos/
│   │   │   ├── reportes/
│   │   │   └── layout.tsx         # Layout con sidebar
│   │   ├── api/                   # API Routes
│   │   │   ├── auth/
│   │   │   ├── productos/
│   │   │   ├── ventas/
│   │   │   ├── movimientos/
│   │   │   └── reportes/
│   │   └── catalogo/              # Página pública
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── forms/                 # Formularios reutilizables
│   │   ├── tables/                # Tablas de datos
│   │   ├── charts/                # Gráficas
│   │   └── shared/                # Componentes compartidos
│   │
│   ├── lib/
│   │   ├── prisma.ts              # Cliente de Prisma
│   │   ├── auth.ts                # Configuración NextAuth
│   │   ├── utils.ts
│   │   ├── constants.ts           # Constantes
│   │   ├── validations/           # Schemas de Zod
│   │   └── db/                    # Funciones de base de datos
│   │
│   ├── hooks/                     # Custom hooks
│   ├── store/                     # Zustand stores
│   ├── types/                     # TypeScript types
│   └── middleware.ts              # Middleware de Next.js
```

#### 2.2 Crear Archivo de Constantes

**Crear:** `lib/constants.ts`

```typescript
// Roles del sistema
export const ROLES = {
  ADMIN: 'Admin',
  INVENTARISTA: 'Inventarista',
  CAJERO: 'Cajero',
  CONSULTA: 'Consulta',
} as const

// Permisos por rol
export const PERMISSIONS = {
  [ROLES.ADMIN]: ['all'],
  [ROLES.INVENTARISTA]: ['inventario', 'movimientos', 'productos'],
  [ROLES.CAJERO]: ['pos', 'ventas'],
  [ROLES.CONSULTA]: ['reportes', 'consulta'],
} as const

// Estados de productos
export const PRODUCT_STATUS = {
  DISPONIBLE: 'disponible',
  BAJO_STOCK: 'bajo-stock',
  AGOTADO: 'agotado',
  PROXIMO_VENCER: 'proximo-vencer',
} as const

// Métodos de pago
export const PAYMENT_METHODS = {
  EFECTIVO: 'efectivo',
  NEQUI: 'nequi',
  TARJETA: 'tarjeta',
  TRANSFERENCIA: 'transferencia',
  MIXTO: 'mixto',
} as const

// Configuración
export const CONFIG = {
  IVA_PERCENTAGE: 19,
  STOCK_BAJO_UMBRAL: 10,
  DIAS_ALERTA_VENCIMIENTO: 7,
  ITEMS_PER_PAGE: 20,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const
```

---

### 3. **Mejoras de Seguridad**

#### 3.1 Implementar Rate Limiting
**Por qué:** Prevenir ataques de fuerza bruta en login.

**Instalar:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

#### 3.2 Middleware de Autenticación Mejorado

**Crear:** `middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  // Redirigir a login si no está autenticado
  if (isDashboard && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirigir a dashboard si ya está autenticado
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
```

---

### 4. **Mejoras de UX/UI**

#### 4.1 Sistema de Notificaciones en Tiempo Real
- Notificar cuando un producto está bajo stock
- Alertar cuando hay un producto próximo a vencer
- Notificar ventas en tiempo real al admin

#### 4.2 Mejorar el Sistema de Búsqueda
**Instalar:**
```bash
npm install fuse.js
```

**Características:**
- Búsqueda fuzzy por nombre, código, categoría
- Autocompletado
- Historial de búsquedas

#### 4.3 Atajos de Teclado Globales
- Ctrl/Cmd + K = Búsqueda global
- F2 = Ir a POS
- F3 = Ir a Inventario
- F4 = Ir a Reportes

---

### 5. **Mejoras Técnicas**

#### 5.1 Optimización de Imágenes
**Usar Cloudinary o Supabase Storage:**

```bash
npm install cloudinary
```

**Características:**
- Redimensionamiento automático
- Conversión a WebP
- CDN global
- Lazy loading

#### 5.2 Implementar Logging
```bash
npm install pino pino-pretty
```

#### 5.3 Monitoreo de Errores
```bash
npm install @sentry/nextjs
```

---

### 6. **Mejoras en el Sistema de Reportes**

#### 6.1 Exportación a Excel
```bash
npm install xlsx
```

#### 6.2 Generación de PDFs
```bash
npm install @react-pdf/renderer
```

**Tipos de PDFs:**
- Facturas con logo SENA
- Reportes de ventas
- Reportes de inventario
- Certificados de productos

---

### 7. **Mejoras en el POS**

#### 7.1 Soporte para Escáneres
- Escáner USB
- Cámara del dispositivo
- Entrada manual

#### 7.2 Impresión de Recibos
```bash
npm install react-to-print
```

**Características:**
- Recibo térmico
- QR con información de la venta
- Logo del SENA

---

## 📋 Checklist de Implementación Recomendada

### Fase 0: Preparación (1 semana)
- [ ] Implementar mejoras en la base de datos
- [ ] Crear estructura de carpetas mejorada
- [ ] Configurar variables de entorno
- [ ] Instalar dependencias adicionales
- [ ] Configurar Prisma
- [ ] Crear schemas de validación con Zod

### Fase 1: Autenticación (1 semana)
- [ ] Configurar NextAuth.js
- [ ] Implementar login
- [ ] Sistema de roles y permisos
- [ ] Middleware de protección de rutas

### Fase 2: API Routes (2 semanas)
- [ ] API de productos
- [ ] API de ventas
- [ ] API de movimientos
- [ ] API de reportes

### Fase 3: Migrar Mock Data a DB (1 semana)
- [ ] Conectar componentes con API
- [ ] Eliminar mock data
- [ ] Implementar loading states
- [ ] Manejo de errores

### Fase 4: Features Avanzadas (2-3 semanas)
- [ ] Sistema de notificaciones
- [ ] Búsqueda mejorada
- [ ] Optimización de imágenes
- [ ] Reportes avanzados

### Fase 5: Testing y Deploy (1 semana)
- [ ] Testing
- [ ] Optimización de rendimiento
- [ ] Deploy a Vercel
- [ ] Documentación

---

## 🎯 Prioridades Inmediatas

### 🔴 Alta Prioridad (Hacer AHORA)
1. ✅ Mejorar schema de base de datos (clientes, descuentos, auditoría)
2. ✅ Crear estructura de carpetas organizada
3. ✅ Configurar Prisma
4. ✅ Crear schemas de validación con Zod
5. ✅ Implementar sistema de autenticación

### 🟡 Media Prioridad (Fase 2-3)
6. Sistema de notificaciones
7. Búsqueda mejorada
8. Optimización de imágenes
9. Reportes avanzados

### 🟢 Baja Prioridad (Después)
10. PWA (modo offline)
11. Sistema de turnos
12. Análisis avanzados

---

## 💡 Recomendaciones Finales

### ✅ Hacer
- Empezar simple y escalar gradualmente
- Usar TypeScript en todo el proyecto
- Documentar código importante
- Hacer commits frecuentes
- Probar en móvil desde el inicio
- Validar todo en el backend

### ❌ Evitar
- No implementar todo de golpe
- No ignorar la seguridad
- No dejar la documentación para el final
- No hardcodear valores
- No ignorar el rendimiento

---

## 🚀 Próximo Paso Sugerido

**Recomiendo empezar con:**

1. **Ejecutar el schema.sql mejorado** con las nuevas tablas
2. **Configurar Prisma** y generar el cliente
3. **Crear la estructura de carpetas** organizada
4. **Implementar NextAuth.js** con roles
5. **Crear las primeras API routes** (productos)

¿Quieres que te ayude con alguno de estos pasos específicamente? 🎯
