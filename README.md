# 🌱 AgroShop - Sistema de Gestión Agropecuario SENA

Sistema integral de gestión de ventas, inventario y producción para el SENA Centro Agropecuario.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC)

## 📋 Descripción

AgroShop es un sistema web completo que permite al SENA Centro Agropecuario gestionar:

- 📦 **Inventario** de productos agrícolas y pecuarios
- 💰 **Punto de Venta (POS)** con escáner de código de barras
- 🔄 **Movimientos** entre unidades productivas
- 📊 **Reportes** y análisis de ventas
- 👥 **Gestión de usuarios** con roles y permisos
- 🌐 **Catálogo público** para aprendices

## ✨ Características Principales

### 🎯 Funcionalidades Core

- ✅ Sistema de autenticación con roles (Admin, Inventarista, Cajero, Consulta)
- ✅ Gestión completa de productos (CRUD)
- ✅ Control de inventario en tiempo real
- ✅ Punto de venta con múltiples métodos de pago
- ✅ Movimientos entre unidades productivas
- ✅ Reportes y gráficas interactivas
- ✅ Catálogo público para consulta

### 🚀 Funcionalidades Avanzadas (Fase 7+)

- 🔜 Sistema de clientes con historial
- 🔜 Descuentos y promociones
- 🔜 Gestión de proveedores
- 🔜 Análisis de costos y rentabilidad
- 🔜 Auditoría completa del sistema
- 🔜 Sistema de turnos para POS

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4
- **Componentes:** shadcn/ui + Radix UI
- **Gráficas:** Recharts
- **Iconos:** Lucide React
- **Formularios:** React Hook Form + Zod
- **Estado:** Zustand

### Backend
- **API:** Next.js API Routes
- **ORM:** Prisma
- **Base de Datos:** PostgreSQL 15+
- **Autenticación:** NextAuth.js v5
- **Validación:** Zod

### DevOps
- **Hosting:** Vercel (recomendado)
- **Base de Datos:** Supabase / Neon
- **Storage:** Cloudinary (imágenes)
- **Emails:** Resend (opcional)

## 📦 Instalación

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL 15+ (o cuenta en Supabase/Neon)
- npm o pnpm

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/AgroShpV1.git
cd AgroShpV1
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar base de datos

Sigue la guía completa en [`DATABASE_SETUP.md`](./DATABASE_SETUP.md)

**Opción rápida con Supabase:**
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `database/schema.sql` en SQL Editor
3. Ejecutar `database/schema-mejoras.sql` en SQL Editor

### 4. Configurar variables de entorno

Copia `.env.example` a `.env.local` y configura:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"
```

### 5. Configurar Prisma

```bash
npx prisma init
npx prisma db pull
npx prisma generate
```

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
AgroShpV1/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   ├── dashboard/            # Rutas protegidas
│   ├── login/                # Autenticación
│   └── page.tsx              # Catálogo público
│
├── components/               # Componentes React
│   ├── ui/                   # shadcn/ui components
│   ├── dashboard/            # Dashboard components
│   ├── inventory/            # Inventario components
│   ├── pos/                  # POS components
│   └── reports/              # Reportes components
│
├── lib/                      # Utilidades
│   ├── prisma.ts             # Cliente Prisma
│   ├── auth.ts               # NextAuth config
│   ├── constants.ts          # Constantes
│   └── validations/          # Schemas Zod
│
├── types/                    # TypeScript types
├── database/                 # Schemas SQL
├── prisma/                   # Prisma schema
└── middleware.ts             # Protección de rutas
```

## 🔐 Usuarios de Prueba

Después de configurar la base de datos, puedes crear usuarios de prueba:

```sql
-- Ver DATABASE_SETUP.md para instrucciones completas
```

## 📚 Documentación

- [Plan de Implementación](./implementation_plan.md)
- [Configuración de Base de Datos](./DATABASE_SETUP.md)
- [Stack Recomendado](./STACK_RECOMENDADO.md)
- [Mejoras Recomendadas](./MEJORAS_RECOMENDADAS.md)
- [Fase 0 Completada](./FASE_0_COMPLETADA.md)

## 🗺️ Roadmap

### ✅ Fase 0: Preparación (Completada)
- Configuración de entorno
- Instalación de dependencias
- Configuración de Prisma

### 🔄 Fase 1: Autenticación (En progreso)
- NextAuth.js
- Sistema de roles
- Protección de rutas

### 📋 Fases Siguientes
- Fase 2: Productos e Inventario
- Fase 3: Ventas y POS
- Fase 4: Movimientos
- Fase 5: Reportes
- Fase 6: Catálogo Público
- Fase 7: Features Adicionales
- Fase 8: Testing y Optimización

Ver [implementation_plan.md](./implementation_plan.md) para detalles completos.

## 🤝 Contribuir

Este proyecto está en desarrollo activo. Para contribuir:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es para uso del SENA Centro Agropecuario.

## 👥 Autores

- **Equipo de Desarrollo** - SENA Centro Agropecuario

## 🙏 Agradecimientos

- SENA Centro Agropecuario
- Aprendices y formadores
- Comunidad de Next.js y Prisma

---

**Desarrollado con ❤️ para el SENA Centro Agropecuario** 🌱
- Daniel Caicedo Desarrollador Full Stack
