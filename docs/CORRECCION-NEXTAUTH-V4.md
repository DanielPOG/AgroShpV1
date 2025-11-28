# ✅ Corrección Final: NextAuth v4 (Estable)

## 🔧 **Problema con NextAuth v5 Beta**

NextAuth v5 (beta.30) tenía errores:
```
TypeError: Function.prototype.apply was called on #<Object>
GET /api/auth/providers 500
```

**Causa:** NextAuth v5 está en beta y tiene APIs inestables.

---

## ✅ **Solución: Cambio a NextAuth v4**

### **1. Desinstalado NextAuth v5 Beta**
```bash
npm uninstall next-auth
```

### **2. Instalado NextAuth v4 Estable**
```bash
npm install next-auth@^4.24.0
```

**Versión instalada:** `next-auth@4.24.10` (estable y probada)

---

## 📂 **Archivos Actualizados**

### **1. `app/api/auth/[...nextauth]/route.ts`** ✅

**Ahora usa NextAuth v4:**
```typescript
import NextAuth, { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
    // ... configuración
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**Cambios:**
- ✅ API estable de NextAuth v4
- ✅ `NextAuthOptions` en lugar de `NextAuthConfig`
- ✅ Export de `authOptions` para usar en otros archivos

---

### **2. `lib/auth.server.ts`** ✅ NUEVO

**Para usar en Server Components:**
```typescript
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function auth() {
    return await getServerSession(authOptions)
}
```

**Uso:**
```typescript
import { auth } from "@/lib/auth.server"
import { redirect } from "next/navigation"

export default async function Page() {
    const session = await auth()
    if (!session) redirect('/login')
    return <div>Hola {session.user.name}</div>
}
```

---

### **3. Eliminados Archivos Obsoletos** ✅

- ❌ `lib/auth.config.ts` - Ya no es necesario
- ✅ Todo está en el route handler

---

## 🚀 **Ventajas de NextAuth v4**

| Característica | v5 Beta | v4 Estable |
|----------------|---------|------------|
| **Estabilidad** | ⚠️ Beta | ✅ Estable |
| **Bugs** | ❌ Muchos | ✅ Pocos |
| **Documentación** | ⚠️ Incompleta | ✅ Completa |
| **Soporte** | ⚠️ Experimental | ✅ Full |
| **Producción** | ❌ No recomendado | ✅ Listo |

---

## 📚 **Cómo Usar Autenticación Ahora**

### **Server Components (RECOMENDADO) ⭐**

```typescript
import { auth } from "@/lib/auth.server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    const session = await auth()
    
    if (!session) {
        redirect('/login')
    }
    
    return (
        <div>
            <h1>Dashboard</h1>
            <p>Bienvenido {session.user.name}</p>
            <p>Rol: {session.user.role}</p>
        </div>
    )
}
```

**Ventajas:**
- ✅ Más rápido
- ✅ Menos JavaScript al cliente
- ✅ Mejor SEO
- ✅ Verificación en servidor

---

### **Client Components (para UI interactiva)**

```typescript
"use client"
import { useAuth } from "@/hooks/use-auth"

export function UserProfile() {
    const { user, isAuthenticated, isLoading } = useAuth()
    
    if (isLoading) return <Spinner />
    if (!isAuthenticated) return <LoginPrompt />
    
    return (
        <div>
            <p>Hola {user.name}</p>
            <Button onClick={() => alert('Click!')}>
                Interactivo
            </Button>
        </div>
    )
}
```

**Ventajas:**
- ✅ Interactividad
- ✅ Hooks de React
- ✅ Estados locales
- ✅ Eventos onClick

---

### **API Routes**

```typescript
import { auth } from "@/lib/auth.server"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    
    if (!session) {
        return NextResponse.json(
            { error: 'No autorizado' }, 
            { status: 401 }
        )
    }
    
    // Verificar permisos
    if (session.user.role !== 'Admin') {
        return NextResponse.json(
            { error: 'Forbidden' }, 
            { status: 403 }
        )
    }
    
    // Lógica de API
    return NextResponse.json({ data: "..." })
}
```

---

## 🧪 **Probar Ahora**

### **1. El servidor debe reiniciarse**

Verifica la terminal:
```
✓ Starting...
✓ Ready in X seconds
✓ Compiled successfully
```

### **2. Si no se reinició, hazlo manual**

```bash
# Detener el servidor (Ctrl+C)
npm run dev
```

### **3. Ir a Login**

```
http://localhost:3000/login
```

**Deberías ver:**
- ✅ Formulario de login sin errores
- ✅ Botones de quick login funcionando
- ✅ Sin errores 500 en /api/auth/providers

### **4. Probar Login**

```
Email: admin@sena.edu.co
Password: agroshop2024
```

**Debería:**
- ✅ Hacer login correctamente
- ✅ Redirigir a /dashboard
- ✅ Mostrar tu nombre en el header

---

## ✅ **Resumen de Cambios**

1. ✅ **Desinstalado NextAuth v5 beta** (inestable)
2. ✅ **Instalado NextAuth v4 estable** (probado)
3. ✅ **Actualizado configuración** para v4
4. ✅ **Creado helper** para Server Components
5. ✅ **Limpiado caché** (.next)
6. ✅ **Sin errores de linter**

---

## 🎯 **Estado Final**

| Componente | Estado |
|------------|--------|
| NextAuth | ✅ v4.24.10 (estable) |
| Configuración | ✅ Actualizada |
| Server Components | ✅ Soportado |
| Client Components | ✅ Soportado |
| API Routes | ✅ Soportado |
| Middleware | ✅ Funcionando |
| Login Form | ✅ Actualizado |
| Caché | ✅ Limpiado |

---

## 📝 **Próximo Paso**

✅ **Probar el login**
- Si funciona, continuar con Fase 2
- Si hay errores, revisar `.env.local` y ejecutar seed de usuarios

---

**Estado:** ✅ Listo para probar  
**Configuración:** NextAuth v4 (estable y probado)  
**Recomendación:** Usar Server Components para mejor rendimiento

