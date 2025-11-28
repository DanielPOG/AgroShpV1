# 🔐 Configuración de Credenciales AgroShop

## Credenciales de Base de Datos

```
Nombre BD: AgroShop
Usuario: postgres
Contraseña: root
Host: localhost
Puerto: 5432 (por defecto)
```

## DATABASE_URL Completo

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/AgroShop"
```

## Crear archivo .env.local

Crea un archivo llamado `.env.local` en la raíz del proyecto con este contenido:

```env
# =====================================================
# AGROSHOP - VARIABLES DE ENTORNO
# =====================================================

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:root@localhost:5432/AgroShop"

# NextAuth (Autenticación)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="AgroShop2025SecretKeyParaSENACentroAgropecuario123456789"

# Configuración de la Aplicación
NEXT_PUBLIC_APP_NAME="AgroShop SENA"
NEXT_PUBLIC_IVA_PERCENTAGE="19"
NEXT_PUBLIC_STOCK_BAJO_UMBRAL="10"
NEXT_PUBLIC_DIAS_ALERTA_VENCIMIENTO="7"

# Cloudinary (Opcional - Para subir imágenes en Fase 7)
# CLOUDINARY_CLOUD_NAME=""
# CLOUDINARY_API_KEY=""
# CLOUDINARY_API_SECRET=""

# Resend (Opcional - Para emails en el futuro)
# RESEND_API_KEY=""
```

## Próximos Pasos

### 1. Crear el archivo .env.local

```powershell
# En la raíz del proyecto
New-Item -Path ".env.local" -ItemType File -Force
```

Luego copia el contenido de arriba en ese archivo.

### 2. Sincronizar Prisma con la Base de Datos

```powershell
# Pull: Genera el schema desde la BD
npx prisma db pull

# Generate: Genera el cliente de Prisma
npx prisma generate
```

### 3. Verificar que funciona

```powershell
# Abre Prisma Studio para ver tus datos
npx prisma studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde podrás ver todas tus tablas.

### 4. Iniciar el servidor de desarrollo

```powershell
npm run dev
```

## ⚠️ Problemas Comunes

### Error: "Can't reach database server"

Verifica que:
1. PostgreSQL esté corriendo
2. El usuario `postgres` y contraseña `root` sean correctos
3. La base de datos `AgroShop` exista
4. El puerto sea 5432

### Error: "database does not exist"

```sql
-- Ejecuta en pgAdmin:
CREATE DATABASE "AgroShop";
```

### Error en npx prisma db pull

Si falla, verifica que el `DATABASE_URL` en `.env.local` esté exactamente así:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/AgroShop"
```

Nota: `AgroShop` con A mayúscula (respeta mayúsculas/minúsculas).

