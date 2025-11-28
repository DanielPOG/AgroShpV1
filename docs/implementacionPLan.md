🚀 Plan de Implementación Completo - AgroShop
📋 Análisis del Diseño Actual
Estructura del Proyecto Existente
AgroShpV1/
├── app/
│   ├── page.tsx                    # ✅ Catálogo público (usa mockProducts)
│   ├── login/page.tsx              # ✅ Login (usa localStorage)
│   ├── dashboard/
│   │   ├── page.tsx                # ✅ Dashboard principal (datos estáticos)
│   │   ├── inventario/page.tsx     # ✅ Gestión inventario (usa mockProducts)
│   │   ├── movimientos/page.tsx    # ✅ Movimientos (usa mockMovements)
│   │   ├── pos/page.tsx            # ✅ Punto de venta (usa mockProducts)
│   │   └── reportes/page.tsx       # ✅ Reportes (datos estáticos)
│   └── catalogo/page.tsx           # ✅ Catálogo alternativo
│
├── components/
│   ├── catalog/                    # 4 componentes
│   ├── dashboard/                  # 5 componentes (gráficas, stats)
│   ├── inventory/                  # 4 componentes (CRUD productos)
│   ├── movements/                  # 2 componentes (wizard, historial)
│   ├── pos/                        # 6 componentes (scanner, cart, checkout)
│   ├── reports/                    # 4 componentes (reportes)
│   ├── sidebar.tsx                 # Navegación
│   ├── dashboard-header.tsx        # Header
│   └── ui/                         # 57+ componentes shadcn/ui
│
├── lib/
│   ├── mock-data.ts                # ⚠️ TODOS LOS DATOS MOCK
│   ├── auth.ts                     # ⚠️ AUTH CON LOCALSTORAGE
│   └── utils.ts
│
└── hooks/
    ├── use-mobile.ts
    └── use-toast.ts
Datos Mock Actuales
lib/mock-data.ts
 contiene:

✅ mockProducts (8 productos de ejemplo)
✅ productiveUnits (5 unidades productivas)
✅ mockMovements (2 movimientos)
✅ mockSales (2 ventas)
Sistema de Autenticación Actual
lib/auth.ts
 usa:

❌ localStorage para guardar usuario
❌ Mock users hardcodeados
❌ Sin validación real de contraseñas
✅ Sistema de roles bien definido (admin, inventarista, cajero, consulta)
Componentes que Usan Mock Data
Página/Componente	Mock Data Usado	Prioridad
app/page.tsx
mockProducts, productiveUnits	🟡 Media
app/dashboard/page.tsx
Datos estáticos hardcodeados	🔴 Alta
app/dashboard/inventario/page.tsx
mockProducts	🔴 Alta
app/dashboard/pos/page.tsx
mockProducts	🔴 Alta
app/dashboard/movimientos/page.tsx
mockMovements, productiveUnits	🟡 Media
app/dashboard/reportes/page.tsx
Datos estáticos	🟡 Media
components/dashboard/*	Datos estáticos	🔴 Alta
🎯 Objetivos del Plan
Migrar de mock data a PostgreSQL usando Prisma
Implementar autenticación real con NextAuth.js
Crear API routes para todas las operaciones
Mantener el diseño exacto de v0
Agregar validaciones con Zod
Implementar manejo de errores robusto
Optimizar rendimiento con caché y paginación
📐 Arquitectura Propuesta
Stack Tecnológico Final
Frontend:
├── Next.js 16 (App Router) ✅ Ya existe
├── TypeScript ✅ Ya existe
├── Tailwind CSS v4 ✅ Ya existe
├── shadcn/ui ✅ Ya existe
└── Recharts ✅ Ya existe
Backend:
├── Next.js API Routes (nuevo)
├── Prisma ORM (nuevo)
├── PostgreSQL (nuevo)
└── NextAuth.js v4.24 (nuevo)
Validación:
├── Zod (nuevo)
└── React Hook Form ✅ Ya existe
Estado:
├── Zustand (nuevo - para carrito POS)
└── React useState (actual)
Estructura de Carpetas Final
AgroShpV1/
├── prisma/
│   ├── schema.prisma              # Schema de Prisma
│   ├── migrations/                # Migraciones
│   └── seed.ts                    # Datos iniciales
│
├── app/
│   ├── api/                       # ⭐ NUEVO
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts
│   │   ├── productos/
│   │   │   ├── route.ts           # GET, POST
│   │   │   └── [id]/route.ts      # GET, PUT, DELETE
│   │   ├── categorias/route.ts
│   │   ├── unidades/route.ts
│   │   ├── ventas/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── movimientos/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── reportes/
│   │   │   ├── dashboard/route.ts
│   │   │   ├── ventas/route.ts
│   │   │   └── inventario/route.ts
│   │   └── upload/route.ts        # Subir imágenes
│   │
│   ├── (public)/                  # ⭐ NUEVO - Rutas públicas
│   │   ├── page.tsx               # Catálogo público
│   │   └── catalogo/page.tsx
│   │
│   ├── (auth)/                    # ⭐ NUEVO - Rutas de auth
│   │   └── login/page.tsx
│   │
│   └── (dashboard)/               # ⭐ NUEVO - Rutas protegidas
│       ├── layout.tsx             # Layout con sidebar
│       ├── dashboard/page.tsx
│       ├── inventario/page.tsx
│       ├── movimientos/page.tsx
│       ├── pos/page.tsx
│       └── reportes/page.tsx
│
├── lib/
│   ├── prisma.ts                  # ⭐ NUEVO - Cliente Prisma
│   ├── auth.ts                    # ⭐ MODIFICAR - NextAuth config
│   ├── constants.ts               # ⭐ NUEVO - Constantes
│   ├── validations/               # ⭐ NUEVO
│   │   ├── product.schema.ts
│   │   ├── sale.schema.ts
│   │   ├── movement.schema.ts
│   │   └── user.schema.ts
│   ├── db/                        # ⭐ NUEVO - Funciones DB
│   │   ├── products.ts
│   │   ├── sales.ts
│   │   ├── movements.ts
│   │   └── users.ts
│   └── utils.ts                   # ✅ Mantener
│
├── hooks/
│   ├── use-products.ts            # ⭐ NUEVO
│   ├── use-sales.ts               # ⭐ NUEVO
│   └── use-auth.ts                # ⭐ NUEVO
│
├── store/
│   └── cart-store.ts              # ⭐ NUEVO - Zustand para POS
│
├── types/
│   ├── database.types.ts          # ⭐ NUEVO
│   └── api.types.ts               # ⭐ NUEVO
│
└── middleware.ts                  # ⭐ NUEVO - Protección rutas
🗂️ Plan de Implementación por Fases
FASE 0: Preparación del Entorno (1-2 días)
Tareas
Instalar dependencias necesarias
# Prisma
npm install prisma @prisma/client
# NextAuth
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
# Validación
npm install zod
# Estado global
npm install zustand
# Utilidades
npm install date-fns
# Imágenes (opcional)
npm install cloudinary
Configurar base de datos

Crear base de datos en Supabase o local
Ejecutar 
database/schema.sql
Ejecutar 
database/schema-mejoras.sql
Configurar Prisma

npx prisma init
npx prisma db pull
npx prisma generate
Configurar variables de entorno
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
Crear archivos base
lib/prisma.ts - Cliente de Prisma
lib/constants.ts - Constantes del sistema
middleware.ts - Protección de rutas
Archivos a Crear
lib/prisma.ts

import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
lib/constants.ts

export const ROLES = {
  ADMIN: 'Admin',
  INVENTARISTA: 'Inventarista',
  CAJERO: 'Cajero',
  CONSULTA: 'Consulta',
} as const
export const PERMISSIONS = {
  [ROLES.ADMIN]: ['all'],
  [ROLES.INVENTARISTA]: ['inventario', 'movimientos', 'productos'],
  [ROLES.CAJERO]: ['pos', 'ventas'],
  [ROLES.CONSULTA]: ['reportes', 'consulta'],
} as const
export const CONFIG = {
  IVA_PERCENTAGE: 19,
  STOCK_BAJO_UMBRAL: 10,
  DIAS_ALERTA_VENCIMIENTO: 7,
  ITEMS_PER_PAGE: 20,
} as const
FASE 1: Autenticación con NextAuth.js (2-3 días)
Tareas
Configurar NextAuth.js

Crear app/api/auth/[...nextauth]/route.ts
Configurar 
lib/auth.ts
 con NextAuth
Implementar CredentialsProvider
Hashear contraseñas con bcrypt
Crear usuarios iniciales en DB

Script de seed con usuarios de prueba
Contraseñas hasheadas
Modificar página de login

Conectar con NextAuth
Manejar errores de autenticación
Redireccionar después de login
Implementar middleware

Proteger rutas /dashboard/*
Verificar permisos por rol
Redireccionar no autenticados
Crear hooks de autenticación

hooks/use-auth.ts - Hook para obtener sesión
Reemplazar localStorage por sesión
Archivos a Crear/Modificar
app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        const user = await prisma.usuarios.findUnique({
          where: { email: credentials.email as string },
          include: { rol: true }
        })
        if (!user || !user.activo) return null
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )
        if (!isValid) return null
        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.nombre} ${user.apellido}`,
          role: user.rol?.nombre
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" }
})
export { handlers as GET, handlers as POST }
middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  if (isDashboard && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
FASE 2: API Routes - Productos e Inventario (3-4 días)
Tareas
Crear schemas de validación con Zod

lib/validations/product.schema.ts
Validar todos los campos de productos
Crear funciones de base de datos

lib/db/products.ts - CRUD de productos
Funciones reutilizables con Prisma
Crear API routes de productos

GET /api/productos - Listar con filtros y paginación
POST /api/productos - Crear producto
GET /api/productos/[id] - Obtener uno
PUT /api/productos/[id] - Actualizar
DELETE /api/productos/[id] - Eliminar
Crear API routes auxiliares

GET /api/categorias - Listar categorías
GET /api/unidades - Listar unidades productivas
Migrar componentes de inventario

Reemplazar mockProducts con llamadas a API
Implementar loading states
Manejar errores
Archivos a Crear
lib/validations/product.schema.ts

import { z } from 'zod'
export const productSchema = z.object({
  nombre: z.string().min(3).max(150),
  descripcion: z.string().optional(),
  categoria_id: z.number().int().positive(),
  unidad_productiva_id: z.number().int().positive(),
  tipo_medida: z.enum(['unidad', 'peso', 'volumen', 'lote']),
  unidad: z.string().min(1),
  precio_unitario: z.number().positive(),
  stock_actual: z.number().min(0).default(0),
  stock_minimo: z.number().min(0).default(0),
  es_perecedero: z.boolean().default(false),
  imagen_url: z.string().url().optional(),
})
export type ProductFormData = z.infer<typeof productSchema>
lib/db/products.ts

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
export async function getProducts(filters?: {
  categoria?: number
  unidad?: number
  tipo?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const where: Prisma.productosWhereInput = {
    activo: true,
  }
  if (filters?.categoria) {
    where.categoria_id = filters.categoria
  }
  if (filters?.unidad) {
    where.unidad_productiva_id = filters.unidad
  }
  if (filters?.search) {
    where.OR = [
      { nombre: { contains: filters.search, mode: 'insensitive' } },
      { codigo: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit
  const [products, total] = await Promise.all([
    prisma.productos.findMany({
      where,
      include: {
        categoria: true,
        unidad_productiva: true,
      },
      skip,
      take: limit,
      orderBy: { nombre: 'asc' },
    }),
    prisma.productos.count({ where }),
  ])
  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
export async function getProductById(id: number) {
  return prisma.productos.findUnique({
    where: { id },
    include: {
      categoria: true,
      unidad_productiva: true,
      lotes_productos: {
        where: { estado: 'disponible' },
        orderBy: { fecha_vencimiento: 'asc' },
      },
    },
  })
}
export async function createProduct(data: Prisma.productosCreateInput) {
  return prisma.productos.create({
    data,
    include: {
      categoria: true,
      unidad_productiva: true,
    },
  })
}
export async function updateProduct(id: number, data: Prisma.productosUpdateInput) {
  return prisma.productos.update({
    where: { id },
    data,
    include: {
      categoria: true,
      unidad_productiva: true,
    },
  })
}
export async function deleteProduct(id: number) {
  return prisma.productos.update({
    where: { id },
    data: { activo: false },
  })
}
app/api/productos/route.ts

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getProducts, createProduct } from '@/lib/db/products'
import { productSchema } from '@/lib/validations/product.schema'
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const filters = {
      categoria: searchParams.get('categoria') ? Number(searchParams.get('categoria')) : undefined,
      unidad: searchParams.get('unidad') ? Number(searchParams.get('unidad')) : undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
    }
    const result = await getProducts(filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const body = await request.json()
    const validatedData = productSchema.parse(body)
    const product = await createProduct(validatedData)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
  }
}
FASE 3: API Routes - Ventas y POS (3-4 días)
Tareas
Crear schemas de validación

lib/validations/sale.schema.ts
Validar ventas, items, pagos
Crear funciones de base de datos

lib/db/sales.ts - CRUD de ventas
Transacciones para ventas (venta + items + pagos + actualizar stock)
Crear API routes de ventas

POST /api/ventas - Crear venta completa
GET /api/ventas - Listar ventas
GET /api/ventas/[id] - Obtener una venta
POST /api/ventas/[id]/factura - Generar factura PDF
Crear store de Zustand para carrito

store/cart-store.ts - Estado del carrito POS
Persistir en localStorage
Migrar componente POS

Usar Zustand para carrito
Conectar checkout con API
Validar stock antes de vender
Archivos a Crear
lib/validations/sale.schema.ts

import { z } from 'zod'
export const saleItemSchema = z.object({
  producto_id: z.number().int().positive(),
  cantidad: z.number().positive(),
  precio_unitario: z.number().positive(),
})
export const paymentSchema = z.object({
  metodo_pago_id: z.number().int().positive(),
  monto: z.number().positive(),
  referencia: z.string().optional(),
})
export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  pagos: z.array(paymentSchema).min(1),
  cliente_id: z.number().int().positive().optional(),
  requiere_factura: z.boolean().default(false),
  observaciones: z.string().optional(),
})
export type SaleFormData = z.infer<typeof saleSchema>
store/cart-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
interface CartItem {
  id: number
  nombre: string
  precio: number
  cantidad: number
  stock: number
  imagen?: string
  unidad: string
}
interface CartStore {
  items: CartItem[]
  addItem: (product: CartItem) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, cantidad: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        const items = get().items
        const existing = items.find(item => item.id === product.id)
        
        if (existing) {
          set({
            items: items.map(item =>
              item.id === product.id
                ? { ...item, cantidad: item.cantidad + 1 }
                : item
            )
          })
        } else {
          set({ items: [...items, { ...product, cantidad: 1 }] })
        }
      },
      
      removeItem: (id) => {
        set({ items: get().items.filter(item => item.id !== id) })
      },
      
      updateQuantity: (id, cantidad) => {
        if (cantidad < 1) return
        set({
          items: get().items.map(item =>
            item.id === id ? { ...item, cantidad } : item
          )
        })
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        return get().items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
      },
      
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.cantidad, 0)
      },
    }),
    {
      name: 'agroshop-cart',
    }
  )
)
app/api/ventas/route.ts

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saleSchema } from '@/lib/validations/sale.schema'
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const body = await request.json()
    const validatedData = saleSchema.parse(body)
    // Usar transacción para garantizar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // 1. Calcular totales
      const subtotal = validatedData.items.reduce(
        (sum, item) => sum + (item.precio_unitario * item.cantidad),
        0
      )
      const impuesto = subtotal * 0.19
      const total = subtotal + impuesto
      // 2. Crear venta
      const venta = await tx.ventas.create({
        data: {
          codigo_venta: `VTA-${Date.now()}`,
          usuario_id: Number(session.user.id),
          subtotal,
          impuesto,
          total,
          cliente_id: validatedData.cliente_id,
          requiere_factura: validatedData.requiere_factura,
          observaciones: validatedData.observaciones,
          estado: 'completada',
        },
      })
      // 3. Crear items de venta
      for (const item of validatedData.items) {
        await tx.detalle_ventas.create({
          data: {
            venta_id: venta.id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.precio_unitario * item.cantidad,
          },
        })
        // 4. Actualizar stock
        await tx.productos.update({
          where: { id: item.producto_id },
          data: {
            stock_actual: {
              decrement: item.cantidad,
            },
          },
        })
      }
      // 5. Registrar pagos
      for (const pago of validatedData.pagos) {
        await tx.pagos_venta.create({
          data: {
            venta_id: venta.id,
            metodo_pago_id: pago.metodo_pago_id,
            monto: pago.monto,
            referencia: pago.referencia,
          },
        })
      }
      return venta
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 })
  }
}
FASE 3.5: Control de Caja y Flujo de Efectivo (3-4 días) 🆕 CRÍTICO
Tareas
Ejecutar schema de control de caja

database/schema-control-caja.sql
5 tablas nuevas: cajas, sesiones_caja, movimientos_caja, retiros_caja, gastos_caja, arqueos_caja
Crear schemas de validación

lib/validations/cash-session.schema.ts - Apertura/cierre de caja
lib/validations/cash-movement.schema.ts - Movimientos de efectivo
lib/validations/cash-withdrawal.schema.ts - Retiros autorizados
lib/validations/expense.schema.ts - Gastos menores
lib/validations/cash-count.schema.ts - Arqueo de caja
Crear funciones de base de datos

lib/db/cash-sessions.ts - CRUD de sesiones de caja
lib/db/cash-movements.ts - Registro de movimientos
lib/db/cash-withdrawals.ts - Retiros autorizados
lib/db/expenses.ts - Gastos de caja chica
lib/db/cash-counts.ts - Arqueos
Crear API routes

POST /api/caja/abrir - Abrir sesión de caja
POST /api/caja/cerrar - Cerrar sesión de caja
GET /api/caja/sesiones - Listar sesiones
GET /api/caja/sesion-activa - Obtener sesión abierta del cajero
POST /api/caja/retiro - Solicitar retiro (requiere autorización)
PUT /api/caja/retiro/[id]/autorizar - Autorizar retiro
POST /api/caja/gasto - Registrar gasto menor
POST /api/caja/arqueo - Realizar conteo de efectivo
GET /api/caja/cuadre - Ver cuadre del día
GET /api/reportes/flujo-caja - Flujo de caja diario
Integrar con POS

Verificar sesión abierta antes de vender
Registrar automáticamente ventas en movimientos_caja
Mostrar efectivo esperado en tiempo real
Alertar si no hay sesión abierta
Crear componentes UI

components/cash/session-status.tsx - Estado de caja actual
components/cash/open-session-modal.tsx - Abrir caja
components/cash/close-session-modal.tsx - Cerrar caja con arqueo
components/cash/cash-count-form.tsx - Formulario de conteo
components/cash/withdrawal-request-modal.tsx - Solicitar retiro
components/cash/expense-modal.tsx - Registrar gasto
components/cash/daily-cash-flow.tsx - Resumen del día
components/cash/session-list.tsx - Historial de sesiones
Implementar lógica de negocio

Validar que solo haya 1 sesión abierta por cajero
Calcular automáticamente efectivo esperado
Registrar cada venta como movimiento
Validar retiros con autorización
Calcular diferencia al cerrar (contado vs esperado)
Generar alertas si diferencia > umbral
Testing

Probar apertura y cierre de caja
Verificar cálculos automáticos
Probar flujo de retiros con autorización
Validar que ventas se registren correctamente
Probar arqueo con diferencias
Por qué es CRÍTICO este módulo:

Sin control de caja, el negocio puede perder dinero sin detectarlo
Permite detectar robos internos o errores de cambio
Responsabilidad individual por cajero
Auditoría completa de cada peso que entra/sale
Cuadre diario exacto
Base para reportes financieros precisos
FASE 4: API Routes - Movimientos (2-3 días)
Tareas
Crear schemas de validación

lib/validations/movement.schema.ts
Crear funciones de base de datos

lib/db/movements.ts
Transacciones para movimientos
Crear API routes

POST /api/movimientos - Crear movimiento
GET /api/movimientos - Listar movimientos
GET /api/movimientos/[id] - Obtener uno
Migrar componente de movimientos

Conectar wizard con API
Validar stock disponible
FASE 5: API Routes - Reportes y Dashboard (2-3 días)
Tareas
Crear API routes de reportes

GET /api/reportes/dashboard - KPIs del dashboard
GET /api/reportes/ventas - Reporte de ventas
GET /api/reportes/inventario - Reporte de inventario
GET /api/reportes/metodos-pago - Distribución de pagos
Migrar componentes de dashboard

Reemplazar datos estáticos con API
Implementar gráficas con datos reales
Migrar componentes de reportes

Conectar con API
Implementar exportación PDF/Excel
FASE 6: Catálogo Público (1-2 días)
Tareas
Crear API pública de productos

GET /api/public/productos - Sin autenticación
Solo productos activos y con stock
Migrar página pública

Conectar con API pública
Mantener diseño actual
FASE 7: Features Adicionales (3-4 días)
Tareas
Sistema de subida de imágenes

POST /api/upload - Subir a Cloudinary
Integrar en formulario de productos
Generación de PDFs

Facturas con logo SENA
Reportes exportables
Notificaciones

Toast para operaciones exitosas/fallidas
Alertas de stock bajo
Búsqueda mejorada

Implementar búsqueda fuzzy
Autocompletado
FASE 8: Testing y Optimización (2-3 días)
Tareas
Testing

Probar todos los flujos
Verificar validaciones
Probar en móvil
Optimización

Implementar caché
Optimizar queries de Prisma
Lazy loading de imágenes
Documentación

Documentar API routes
Guía de uso del sistema
📊 Mapeo Detallado: Mock Data → API
Productos
Componente Actual	Mock Data	Nueva API	Método
app/page.tsx
mockProducts	/api/public/productos	GET
app/dashboard/inventario/page.tsx
mockProducts	/api/productos?page=1&limit=20	GET
components/inventory/product-card.tsx
Props	/api/productos/[id]	GET
components/inventory/create-product-modal.tsx
-	/api/productos	POST
app/dashboard/pos/page.tsx
mockProducts	/api/productos?stock_gt=0	GET
Ventas
Componente Actual	Mock Data	Nueva API	Método
components/pos/checkout-modal.tsx
-	/api/ventas	POST
components/dashboard/sales-chart.tsx
Estático	/api/reportes/ventas?period=7d	GET
components/reports/sales-report.tsx
Estático	/api/reportes/ventas?period=30d	GET
Movimientos
Componente Actual	Mock Data	Nueva API	Método
app/dashboard/movimientos/page.tsx
mockMovements	/api/movimientos	GET
components/movements/movement-wizard.tsx
-	/api/movimientos	POST
components/movements/movement-history.tsx
mockMovements	/api/movimientos?limit=10	GET
Dashboard
Componente Actual	Mock Data	Nueva API	Método
components/dashboard/stats-card.tsx
Estático	/api/reportes/dashboard	GET
components/dashboard/top-products.tsx
Estático	/api/reportes/top-productos	GET
components/dashboard/recent-activity.tsx
Estático	/api/reportes/actividad-reciente	GET
🔄 Estrategia de Migración Gradual
Opción Recomendada: Migración por Módulos
Semana 1: Auth + Productos

Implementar NextAuth
API de productos
Migrar inventario
Semana 2: POS + Ventas

API de ventas
Migrar POS
Store de carrito
Semana 3: Movimientos + Reportes

API de movimientos
API de reportes
Migrar dashboard
Semana 4: Pulido + Testing

Features adicionales
Testing completo
Optimización
✅ Verificación y Testing
Plan de Verificación
Fase 1: Autenticación
 Login funciona con usuarios de DB
 Roles se asignan correctamente
 Middleware protege rutas
 Logout funciona
 Sesión persiste en refresh
Fase 2: Productos
 Listar productos con filtros
 Crear producto nuevo
 Editar producto existente
 Eliminar producto (soft delete)
 Búsqueda funciona
 Paginación funciona
Fase 3: Ventas
 Agregar productos al carrito
 Calcular totales correctamente
 Procesar venta completa
 Actualizar stock automáticamente
 Registrar múltiples métodos de pago
 Generar factura PDF
Fase 4: Movimientos
 Crear movimiento entre unidades
 Validar stock disponible
 Actualizar inventarios
 Ver historial de movimientos
Fase 5: Reportes
 Dashboard muestra datos reales
 Gráficas se actualizan
 Reportes se generan correctamente
 Exportación PDF/Excel funciona
Fase 6: General
 Responsive en móvil
 Loading states funcionan
 Errores se manejan bien
 Validaciones funcionan
 Performance es aceptable
🚨 Consideraciones Importantes
Mantener el Diseño Exacto
CRÍTICO: No modificar el diseño de v0. Solo cambiar la fuente de datos.

Estrategia:

Mantener misma estructura de componentes
Usar mismos props
Solo cambiar de donde vienen los datos
Mantener loading states visuales
Manejo de Errores
Implementar manejo robusto:

try {
  const data = await fetch('/api/productos')
  if (!data.ok) throw new Error('Error')
  return data.json()
} catch (error) {
  toast({
    title: 'Error',
    description: 'No se pudieron cargar los productos',
    variant: 'destructive'
  })
}
Performance
Implementar paginación en todas las listas
Usar React.memo en componentes pesados
Lazy loading de imágenes
Debounce en búsquedas
📝 Próximos Pasos Inmediatos
Para Empezar HOY:
Ejecutar schemas SQL
psql -U usuario -d agroshop -f database/schema.sql
psql -U usuario -d agroshop -f database/schema-mejoras.sql
Configurar Prisma
npx prisma init
npx prisma db pull
npx prisma generate
Instalar dependencias
npm install prisma @prisma/client next-auth@beta bcryptjs zod zustand
Crear archivos base
lib/prisma.ts
lib/constants.ts
middleware.ts
Empezar con Fase 1: Autenticación
FASE 9: Sistema de Clientes (2-3 días)
Tareas
Crear schemas de validación

lib/validations/client.schema.ts
Tipos de cliente: ocasional, frecuente, institucional
Crear funciones de base de datos

lib/db/clients.ts - CRUD de clientes
Actualizar total de compras automáticamente
Crear API routes

GET /api/clientes - Listar clientes
POST /api/clientes - Crear cliente
GET /api/clientes/[id] - Obtener uno
PUT /api/clientes/[id] - Actualizar
DELETE /api/clientes/[id] - Eliminar (soft delete)
GET /api/clientes/[id]/historial - Historial de compras
Crear componentes UI

components/clients/client-list.tsx
components/clients/client-form-modal.tsx
components/clients/client-detail-modal.tsx
components/clients/client-search.tsx
Integrar con POS

Buscar cliente en checkout
Asociar venta a cliente
Actualizar estadísticas automáticamente
FASE 10: Sistema de Descuentos y Promociones (2-3 días)
Tareas
Crear schemas de validación

lib/validations/discount.schema.ts
Tipos: porcentaje, monto_fijo, por_cantidad
Crear funciones de base de datos

lib/db/discounts.ts - CRUD de descuentos
Validación de condiciones y restricciones
Crear API routes

GET /api/descuentos - Listar descuentos activos
POST /api/descuentos - Crear descuento
PUT /api/descuentos/[id] - Actualizar
DELETE /api/descuentos/[id] - Desactivar
POST /api/descuentos/validar - Validar código de descuento
Crear componentes UI

components/discounts/discount-list.tsx
components/discounts/discount-form-modal.tsx
components/discounts/discount-badge.tsx
components/pos/discount-input.tsx - Aplicar en POS
Integrar con POS

Input para código de descuento
Cálculo automático de descuento
Validación de condiciones (mínimo de compra, etc.)
Registro de descuentos aplicados
FASE 11: Costos de Producción y Rentabilidad (2-3 días)
Tareas
Crear schemas de validación

lib/validations/production-cost.schema.ts
Desglose: materia prima, mano de obra, insumos, energía
Crear funciones de base de datos

lib/db/production-costs.ts
Cálculo automático de costo unitario
Análisis de rentabilidad por producto
Crear API routes

GET /api/costos - Listar costos por producto
POST /api/costos - Registrar costos de lote
GET /api/reportes/rentabilidad - Análisis de rentabilidad
GET /api/reportes/margen-productos - Productos por margen
Crear componentes UI

components/costs/cost-form-modal.tsx
components/costs/cost-detail.tsx
components/reports/profitability-report.tsx
components/reports/margin-analysis-chart.tsx
Integrar con inventario

Registrar costos al crear lotes
Calcular precio sugerido basado en costos
Alertas de productos con bajo margen
FASE 12: Solicitudes de Transferencia (2-3 días)
Tareas
Crear schemas de validación

lib/validations/transfer-request.schema.ts
Estados: pendiente, aprobada, rechazada, completada
Crear funciones de base de datos

lib/db/transfer-requests.ts
Workflow de aprobación
Notificaciones a responsables
Crear API routes

GET /api/solicitudes - Listar solicitudes
POST /api/solicitudes - Crear solicitud
PUT /api/solicitudes/[id]/aprobar - Aprobar
PUT /api/solicitudes/[id]/rechazar - Rechazar
PUT /api/solicitudes/[id]/completar - Completar transferencia
Crear componentes UI

components/transfers/request-wizard.tsx - Crear solicitud
components/transfers/request-list.tsx - Lista de solicitudes
components/transfers/request-approval-modal.tsx - Aprobar/Rechazar
components/transfers/pending-requests-badge.tsx - Contador
Integrar con movimientos

Opción: Crear movimiento inmediato o solicitud
Aprobar solicitud → Genera movimiento automático
Notificaciones a unidades involucradas
FASE 13: Sistema de Turnos para POS (1-2 días)
Tareas
Crear schemas de validación

lib/validations/turn.schema.ts
Estados: esperando, atendiendo, completado, cancelado
Crear funciones de base de datos

lib/db/turns.ts
Generación automática de número de turno
Gestión de cola
Crear API routes

GET /api/turnos - Turnos del día
POST /api/turnos - Generar turno
PUT /api/turnos/[id]/atender - Atender turno
PUT /api/turnos/[id]/completar - Completar turno
GET /api/turnos/siguiente - Obtener siguiente turno
Crear componentes UI

components/turns/turn-generator.tsx - Pantalla para clientes
components/turns/turn-display.tsx - Pantalla de visualización
components/pos/turn-manager.tsx - Gestión en POS
components/turns/turn-queue.tsx - Cola de espera
Integrar con POS

Botón "Llamar siguiente turno"
Display de turno actual
Estadísticas de tiempo de atención
FASE 14: Sistema de Auditoría Completa (1-2 días)
Tareas
Crear funciones de auditoría

lib/db/audit.ts
Registro automático de todas las operaciones
Captura de IP y user agent
Crear API routes

GET /api/auditoria - Listar auditoría
GET /api/auditoria/[tabla]/[id] - Auditoría de registro
Crear componentes UI

components/audit/audit-log.tsx
components/audit/audit-timeline.tsx
components/audit/audit-filters.tsx
Implementar triggers de auditoría

Auditar todas las tablas críticas
Registrar INSERT, UPDATE, DELETE
Incluir datos anteriores y nuevos
FASE 15: Gestión de Proveedores (Futuro - 2-3 días)
Tareas
Crear schemas de validación

lib/validations/supplier.schema.ts
Crear funciones de base de datos

lib/db/suppliers.ts
Crear API routes

GET /api/proveedores - Listar
POST /api/proveedores - Crear
PUT /api/proveedores/[id] - Actualizar
Crear componentes UI

components/suppliers/supplier-list.tsx
components/suppliers/supplier-form-modal.tsx
Integrar con productos

Campo "proveedor" en productos
Filtro por proveedor
Reporte de compras a proveedores
FASE 16: Notificaciones en Tiempo Real (1-2 días)
Tareas
Crear sistema de notificaciones

lib/notifications.ts - Sistema de notificaciones
Tipos: stock_bajo, vencimiento_proximo, venta, movimiento
Crear API routes

GET /api/notificaciones - Listar notificaciones
PUT /api/notificaciones/[id]/leer - Marcar como leída
PUT /api/notificaciones/leer-todas - Marcar todas
DELETE /api/notificaciones/[id] - Eliminar
Crear componentes UI

components/notifications/notification-bell.tsx - Icono con contador
components/notifications/notification-list.tsx - Lista desplegable
components/notifications/notification-item.tsx
Implementar generación automática

Notificar stock bajo
Notificar productos próximos a vencer
Notificar ventas importantes
Notificar solicitudes pendientes
FASE 18: Panel de Administración y Configuración (2-3 días) 🆕 CRÍTICA
Tareas
Crear schemas de validación

lib/validations/config.schema.ts - Validación de configuraciones
Crear funciones de base de datos

lib/db/config.ts - CRUD de configuraciones
lib/db/users-admin.ts - CRUD completo de usuarios (admin)
Crear API routes

GET /api/config - Obtener todas las configuraciones
GET /api/config/[key] - Obtener configuración específica
PUT /api/config/[key] - Actualizar configuración
POST /api/config/bulk - Actualizar múltiples configs
GET /api/usuarios - Listar usuarios (admin)
POST /api/usuarios - Crear usuario
PUT /api/usuarios/[id] - Actualizar usuario
DELETE /api/usuarios/[id] - Desactivar usuario
POST /api/usuarios/[id]/reset-password - Resetear contraseña
GET /api/roles - Listar roles con permisos
GET /api/categorias - CRUD categorías (admin)
GET /api/unidades - CRUD unidades productivas (admin)
Crear página de administración

app/dashboard/admin/page.tsx - Panel principal
app/dashboard/admin/configuracion/page.tsx - Configuración del sistema
app/dashboard/admin/usuarios/page.tsx - Gestión de usuarios
app/dashboard/admin/categorias/page.tsx - Gestión de categorías
app/dashboard/admin/unidades/page.tsx - Gestión de unidades
Crear componentes UI

components/admin/config-form.tsx - Formulario configuración
components/admin/config-section.tsx - Sección de config
components/admin/user-form.tsx - Formulario usuarios
components/admin/user-list.tsx - Lista de usuarios
components/admin/category-form.tsx - Formulario categorías
components/admin/unit-form.tsx - Formulario unidades
Implementar configuración editable

IVA (%)
Nombre de la tienda
Email/Teléfono de contacto
Stock mínimo por defecto (para nuevos productos)
Días de alerta de vencimiento
Fondo inicial sugerido para caja
Umbral de diferencia aceptable en caja
Monto mínimo que requiere autorización
Prefijo de factura
Configuración de impresora
Proteger rutas de admin

Middleware que verifica rol === 'Admin'
Redirigir si no es admin
Testing

Probar edición de configuraciones
Verificar que se aplican los cambios
Probar CRUD de usuarios
Probar CRUD de categorías y unidades
Por qué es CRÍTICA esta fase:

Las configuraciones están hardcodeadas y no son editables
Cambiar el IVA o configuraciones requiere modificar código
No hay forma de gestionar usuarios desde la interfaz
Cada negocio necesita configurar sus propios parámetros
FASE 17: Testing, Optimización y Deployment (3-4 días)
Tareas
Testing completo de todos los módulos

Probar todos los flujos de usuario
Verificar validaciones
Probar en diferentes dispositivos
Testing de carga y performance
Optimización

Implementar caché en API routes
Optimizar queries de Prisma (incluir/select)
Implementar paginación en todas las listas
Lazy loading de componentes pesados
Optimización de imágenes
Debounce en búsquedas
Seguridad

Validar todos los permisos por rol
Sanitizar inputs
Implementar rate limiting
Validar tokens en todas las rutas
Documentación

Documentar todas las API routes
Crear guía de usuario
Crear manual técnico
Documentar variables de entorno
Deployment

Configurar variables de entorno en producción
Migrar base de datos a producción
Deploy en Vercel
Configurar dominio
Testing en producción
🎯 Resumen Ejecutivo ACTUALIZADO
Tiempo Estimado Total: 6-8 semanas (proyecto completo)

Fases Core (Obligatorias)
Fase	Duración	Prioridad	Descripción
Fase 0: Preparación	1-2 días	🔴 Alta	Configuración de entorno
Fase 1: Autenticación	2-3 días	🔴 Alta	NextAuth + usuarios
Fase 2: Productos/Inventario	3-4 días	🔴 Alta	CRUD productos + filtros
Fase 3: Ventas/POS	3-4 días	🔴 Alta	POS + checkout + facturación
Fase 3.5: Control de Caja 🆕	3-4 días	🔴 CRÍTICA	Flujo de efectivo + arqueo diario
Fase 4: Movimientos	2-3 días	🔴 Alta	Transferencias entre unidades
Fase 5: Reportes/Dashboard	2-3 días	🔴 Alta	KPIs + gráficas reales
Fase 6: Catálogo Público	1-2 días	🟡 Media	Vista pública sin auth
Fase 7: Features Básicos	3-4 días	🟡 Media	Upload imágenes + PDFs
Fase 8: Testing Básico	2-3 días	🔴 Alta	Testing de funcionalidades core
Subtotal Fases Core: 23-32 días (4.5-6.5 semanas)

Fases Avanzadas (Recomendadas)
Fase	Duración	Prioridad	Descripción
Fase 9: Clientes	2-3 días	🟡 Media	Sistema de clientes completo
Fase 10: Descuentos	2-3 días	🟡 Media	Promociones y descuentos
Fase 11: Costos/Rentabilidad	2-3 días	🟢 Baja	Análisis de costos
Fase 12: Solicitudes Transfer.	2-3 días	🟢 Baja	Workflow de aprobación
Fase 13: Turnos POS	1-2 días	🟢 Baja	Gestión de cola
Fase 14: Auditoría	1-2 días	🟡 Media	Auditoría completa
Fase 15: Proveedores	2-3 días	🟢 Baja	Gestión de proveedores
Fase 16: Notificaciones	1-2 días	🟡 Media	Notificaciones en tiempo real
Fase 17: Testing/Deploy	3-4 días	🔴 Alta	Testing final + deployment
Subtotal Fases Avanzadas: 16-23 días (3-4.5 semanas)

Totales Proyecto Completo
Core (MVP Funcional): 4.5-6.5 semanas
Core + Avanzadas (Sistema Completo): 7-9 semanas

Archivos a Crear
Fase Core: ~60 archivos (+10 por control de caja)
Fase Avanzada: ~40 archivos adicionales
Total: ~100 archivos

API Routes
Fase Core: ~35 endpoints (+10 por control de caja)
Fase Avanzada: ~35 endpoints adicionales
Total: ~70 endpoints

Componentes UI
Fase Core: ~55 componentes (+10 por control de caja)
Fase Avanzada: ~30 componentes adicionales
Total: ~85 componentes

Tablas de Base de Datos
Schema Principal: 15 tablas
Schema Mejoras: 9 tablas
Control de Caja: 6 tablas 🆕
Total: 30 tablas

📊 Funcionalidades de la Base de Datos
Funcionalidades Básicas (Schema Principal)
✅ Roles y usuarios con permisos
✅ Unidades productivas
✅ Categorías de productos
✅ Productos con stock
✅ Lotes para productos perecederos
✅ Movimientos entre unidades
✅ Ventas con múltiples items
✅ Múltiples métodos de pago por venta
✅ Historial de inventario (auditoría)
✅ Configuración del sistema
✅ Sistema de notificaciones básico

Funcionalidades Avanzadas (Schema Mejoras)
🆕 Sistema completo de clientes (ocasional, frecuente, institucional)
🆕 Descuentos y promociones con condiciones
🆕 Gestión de proveedores
🆕 Auditoría completa del sistema (JSONB)
🆕 Costos de producción detallados
🆕 Cálculo automático de rentabilidad
🆕 Solicitudes de transferencia con workflow
🆕 Sistema de turnos para POS
🆕 Vistas SQL optimizadas para reportes
🆕 Triggers automáticos para auditoría
🆕 Validaciones de stock en tiempo real

🎯 Estrategia de Implementación Recomendada
Semana 1-2: Preparación + Auth + Productos (Fases 0, 1, 2)
Semana 3: Ventas + POS (Fase 3)
Semana 4: Movimientos + Reportes (Fases 4, 5)
Semana 5: Catálogo + Features + Testing Core (Fases 6, 7, 8) ← MVP LISTO
Semana 6: Clientes + Descuentos + Notificaciones (Fases 9, 10, 16)
Semana 7: Costos + Solicitudes + Turnos (Fases 11, 12, 13)
Semana 8: Auditoría + Testing Final + Deploy (Fases 14, 17) ← SISTEMA COMPLETO

✅ ¿Listo para empezar?
Dime si quieres:

Opción A: Implementar solo Core (4-5 semanas) - Sistema funcional básico
Opción B: Implementar todo (6-8 semanas) - Sistema completo con todas las funcionalidades
Opción C: Core primero, luego Avanzadas - Desarrollo incremental

¡Guía paso a paso disponible para cada fase! 🚀