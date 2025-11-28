# 🗄️ Guía de Configuración de Base de Datos - AgroShop

## 📋 Opciones de Base de Datos

Tienes 3 opciones para configurar PostgreSQL:

### Opción 1: PostgreSQL Local (Desarrollo)
### Opción 2: Supabase (Recomendado - Gratis)
### Opción 3: Neon (Alternativa - Gratis)

---

## 🔧 Opción 1: PostgreSQL Local

### 1. Instalar PostgreSQL

**Windows:**
- Descargar de: https://www.postgresql.org/download/windows/
- Ejecutar instalador
- Recordar la contraseña del usuario `postgres`

**Verificar instalación:**
```bash
psql --version
```

### 2. Crear Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE agroshop;

# Crear usuario (opcional)
CREATE USER agroshop_user WITH PASSWORD 'tu_password_seguro';

# Dar permisos
GRANT ALL PRIVILEGES ON DATABASE agroshop TO agroshop_user;

# Salir
\q
```

### 3. Ejecutar Schemas SQL

```bash
# Navegar a la carpeta del proyecto
cd c:\Users\santi\OneDrive\Documentos\GitHub\AgroShpV1

# Ejecutar schema principal
psql -U postgres -d agroshop -f database/schema.sql

# Ejecutar mejoras
psql -U postgres -d agroshop -f database/schema-mejoras.sql
```

### 4. Configurar .env.local

Edita `.env.local` y actualiza:

```env
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/agroshop"
```

---

## ☁️ Opción 2: Supabase (Recomendado)

### 1. Crear Cuenta

- Ve a: https://supabase.com
- Crea una cuenta gratis
- Crea un nuevo proyecto

### 2. Obtener Connection String

1. En tu proyecto, ve a **Settings** → **Database**
2. Copia el **Connection String** (URI)
3. Reemplaza `[YOUR-PASSWORD]` con tu contraseña

Ejemplo:
```
postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### 3. Ejecutar Schemas SQL

1. En Supabase, ve a **SQL Editor**
2. Crea un nuevo query
3. Copia y pega el contenido de `database/schema.sql`
4. Ejecuta (Run)
5. Repite con `database/schema-mejoras.sql`

### 4. Configurar .env.local

```env
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**Ventajas de Supabase:**
- ✅ Gratis hasta 500MB
- ✅ Backups automáticos
- ✅ Storage para imágenes incluido
- ✅ Realtime subscriptions
- ✅ Dashboard visual

---

## 🚀 Opción 3: Neon

### 1. Crear Cuenta

- Ve a: https://neon.tech
- Crea una cuenta gratis
- Crea un nuevo proyecto

### 2. Obtener Connection String

1. En tu proyecto, copia el **Connection String**
2. Selecciona "Pooled connection"

Ejemplo:
```
postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
```

### 3. Ejecutar Schemas SQL

**Opción A: Desde terminal**
```bash
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb" -f database/schema.sql
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb" -f database/schema-mejoras.sql
```

**Opción B: Desde Neon Console**
1. Ve a **SQL Editor** en Neon
2. Copia y pega los schemas
3. Ejecuta

### 4. Configurar .env.local

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb"
```

---

## 🔄 Configurar Prisma

Una vez que tengas la base de datos configurada:

### 1. Inicializar Prisma

```bash
npx prisma init
```

Esto crea:
- `prisma/schema.prisma`
- `.env` (si no existe)

### 2. Generar Schema desde la Base de Datos

```bash
# Esto lee tu base de datos y genera el schema de Prisma
npx prisma db pull
```

### 3. Generar Cliente de Prisma

```bash
# Esto genera los tipos TypeScript
npx prisma generate
```

### 4. Verificar Conexión

```bash
# Abre Prisma Studio para ver tus datos
npx prisma studio
```

Esto abre una UI en `http://localhost:5555` donde puedes ver y editar tus datos.

---

## ✅ Verificación

### Verificar que todo funciona:

```bash
# Ver tablas creadas
npx prisma studio
```

Deberías ver:
- ✅ 22 tablas (15 principales + 7 mejoras)
- ✅ Datos iniciales (roles, categorías, unidades productivas, métodos de pago)

### Verificar datos iniciales:

En Prisma Studio o con SQL:

```sql
-- Ver roles
SELECT * FROM roles;
-- Debe mostrar: Admin, Inventarista, Cajero, Consulta

-- Ver categorías
SELECT * FROM categorias;
-- Debe mostrar: 8 categorías

-- Ver unidades productivas
SELECT * FROM unidades_productivas;
-- Debe mostrar: 6 unidades

-- Ver métodos de pago
SELECT * FROM metodos_pago;
-- Debe mostrar: 4 métodos
```

---

## 🔐 Crear Usuario Inicial

Para poder hacer login, necesitas crear un usuario en la base de datos:

```sql
-- Crear usuario admin (password: admin123)
-- Hash generado con bcrypt, rounds=10
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, activo)
VALUES (
  'Administrador',
  'SENA',
  'admin@sena.edu.co',
  '$2a$10$rKJ5YwX8qF.vYxYvYxYvYxYvYxYvYxYvYxYvYxYvYxYvYxYvYxYvY',
  (SELECT id FROM roles WHERE nombre = 'Admin'),
  true
);
```

**IMPORTANTE:** Este es un hash de ejemplo. En la Fase 1 crearemos un script para generar usuarios con contraseñas reales hasheadas.

---

## 🚨 Solución de Problemas

### Error: "relation does not exist"
- Verifica que ejecutaste ambos schemas SQL
- Verifica que estás conectado a la base de datos correcta

### Error: "password authentication failed"
- Verifica tu contraseña en DATABASE_URL
- Verifica que el usuario tiene permisos

### Error: "database does not exist"
- Crea la base de datos primero
- Verifica el nombre en DATABASE_URL

### Prisma no encuentra las tablas
- Ejecuta `npx prisma db pull` de nuevo
- Verifica DATABASE_URL en .env.local

---

## 📝 Próximos Pasos

Una vez configurada la base de datos:

1. ✅ Verificar que Prisma Studio funciona
2. ✅ Ver que hay datos iniciales
3. ✅ Proceder con Fase 1: Autenticación

---

## 💡 Recomendación

Para desarrollo, recomiendo **Supabase** porque:
- Es gratis
- Fácil de configurar
- Incluye storage para imágenes
- Dashboard visual muy útil
- Backups automáticos

Para producción, puedes usar el mismo Supabase o migrar a otro servicio.

---

**¿Problemas?** Revisa los logs de error y verifica:
1. DATABASE_URL está correcta
2. Base de datos existe
3. Schemas SQL se ejecutaron sin errores
4. Usuario tiene permisos
