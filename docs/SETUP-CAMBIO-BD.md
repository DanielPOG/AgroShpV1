# 🔄 SETUP RÁPIDO - CAMBIO DE BASE DE DATOS

## ✅ ESTADO ACTUAL

Tu proyecto **YA TIENE** migraciones configuradas:
```
prisma/migrations/
├── 20241204000000_fix_lotes_triggers/
├── 20251203000000_add_triggers_and_views/
├── 20251204101214_init/
└── 20251204101300_add_triggers_and_views/
```

## 🚀 CÓMO CAMBIAR DE BASE DE DATOS

### Opción 1: BD Nueva Vacía (Recomendado)

```powershell
# 1. Crear nueva base de datos en PostgreSQL
psql -U postgres
CREATE DATABASE agroshop_db_nueva;
\q

# 2. Actualizar .env con la nueva conexión
DATABASE_URL="postgresql://postgres:password@localhost:5432/agroshop_db_nueva"

# 3. Aplicar todas las migraciones
npx prisma migrate deploy

# 4. Generar Prisma Client
npx prisma generate

# 5. (Opcional) Cargar datos iniciales
npx prisma db seed
```

**¡Listo!** La nueva BD tendrá toda la estructura y triggers.

### Opción 2: BD Existente (Producción)

```powershell
# 1. Hacer backup de la BD actual
pg_dump -U postgres -d agroshop_db > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# 2. Actualizar .env
DATABASE_URL="postgresql://postgres:password@servidor:5432/agroshop_db_prod"

# 3. Verificar estado de migraciones
npx prisma migrate status

# 4. Aplicar migraciones pendientes
npx prisma migrate deploy

# 5. Generar Prisma Client
npx prisma generate
```

### Opción 3: Resetear BD Actual (Desarrollo)

```powershell
# ⚠️ CUIDADO: Esto BORRA todos los datos

# Resetear completamente y aplicar todas las migraciones
npx prisma migrate reset

# Esto hace automáticamente:
# 1. DROP DATABASE
# 2. CREATE DATABASE
# 3. Aplicar todas las migraciones
# 4. Ejecutar seed (si existe)
```

---

## 📋 SCRIPTS RÁPIDOS

### PowerShell: setup-nueva-bd.ps1

```powershell
# Guardar como: scripts/setup-nueva-bd.ps1

param(
    [string]$NombreDB = "agroshop_db",
    [string]$Usuario = "postgres",
    [string]$Password = "postgres",
    [string]$Host = "localhost",
    [string]$Puerto = "5432"
)

Write-Host "🔧 Configurando nueva base de datos: $NombreDB" -ForegroundColor Cyan

# 1. Crear BD
Write-Host "📦 Creando base de datos..." -ForegroundColor Yellow
psql -U $Usuario -c "DROP DATABASE IF EXISTS $NombreDB;"
psql -U $Usuario -c "CREATE DATABASE $NombreDB;"

# 2. Actualizar .env
Write-Host "📝 Actualizando .env..." -ForegroundColor Yellow
$envContent = Get-Content .env -Raw
$newDatabaseUrl = "DATABASE_URL=`"postgresql://${Usuario}:${Password}@${Host}:${Puerto}/${NombreDB}`""
$envContent -replace 'DATABASE_URL=.*', $newDatabaseUrl | Set-Content .env

# 3. Aplicar migraciones
Write-Host "🚀 Aplicando migraciones..." -ForegroundColor Yellow
npx prisma migrate deploy

# 4. Generar Prisma Client
Write-Host "⚙️ Generando Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# 5. Seed (opcional)
Write-Host "🌱 ¿Cargar datos iniciales? (S/N)" -ForegroundColor Yellow
$respuesta = Read-Host
if ($respuesta -eq "S" -or $respuesta -eq "s") {
    npx prisma db seed
}

Write-Host "✅ ¡Base de datos configurada correctamente!" -ForegroundColor Green
Write-Host "🎯 Puedes ejecutar: npm run dev" -ForegroundColor Cyan
```

### Uso del Script

```powershell
# Configuración básica (usa valores por defecto)
.\scripts\setup-nueva-bd.ps1

# Configuración personalizada
.\scripts\setup-nueva-bd.ps1 -NombreDB "agroshop_test" -Password "mipassword"

# BD en servidor remoto
.\scripts\setup-nueva-bd.ps1 -Host "192.168.1.100" -Usuario "admin" -Password "secret"
```

---

## 🔄 WORKFLOW DE EQUIPO

### Developer 1: Crea cambio

```powershell
# Modificar schema.prisma
# Agregar campo: observaciones String? en lotes_productos

# Crear migración
npx prisma migrate dev --name add_observaciones_lotes

# Commit
git add prisma/migrations prisma/schema.prisma
git commit -m "feat: add observaciones to lotes"
git push
```

### Developer 2: Aplica cambio

```powershell
# Obtener cambios
git pull

# Aplicar nuevas migraciones automáticamente
npx prisma migrate dev

# ¡Listo!
```

---

## 📊 VERIFICAR ESTADO

### Verificar Estructura Actual

```powershell
# Ver estado de migraciones
npx prisma migrate status

# Ver diferencias entre schema.prisma y BD
npx prisma migrate diff

# Abrir visualizador de BD
npx prisma studio
```

### Sincronizar Schema con BD

```powershell
# Si hiciste cambios manuales en BD, sincronizar schema
npx prisma db pull

# Ver los cambios detectados
git diff prisma/schema.prisma

# Si todo OK, crear migración de ajuste
npx prisma migrate dev --name sync_manual_changes
```

---

## 🐛 SOLUCIONAR PROBLEMAS

### Problema: Migraciones rotas

```powershell
# Ver estado
npx prisma migrate status

# Marcar como aplicada sin ejecutar
npx prisma migrate resolve --applied NOMBRE_MIGRACION

# O resetear completamente (desarrollo)
npx prisma migrate reset
```

### Problema: Shadow Database Error

```powershell
# Agregar al .env:
# SHADOW_DATABASE_URL="postgresql://postgres:password@localhost:5432/agroshop_shadow"

# Crear shadow database
psql -U postgres -c "CREATE DATABASE agroshop_shadow;"

# Reintentar
npx prisma migrate dev
```

### Problema: Schema desincronizado

```powershell
# 1. Backup de datos importantes
pg_dump -U postgres -d agroshop_db > backup_antes_sync.sql

# 2. Sincronizar desde BD
npx prisma db pull

# 3. Crear migración de ajuste
npx prisma migrate dev --name fix_schema_drift

# 4. Verificar
npx prisma migrate status
```

---

## 📦 EXPORTAR/IMPORTAR BASE DE DATOS

### Exportar BD Completa

```powershell
# Solo estructura
pg_dump -U postgres -s agroshop_db > estructura.sql

# Con datos
pg_dump -U postgres agroshop_db > backup_completo.sql

# Solo tabla específica
pg_dump -U postgres -t lotes_productos agroshop_db > lotes_backup.sql
```

### Importar BD

```powershell
# Crear BD nueva
psql -U postgres -c "CREATE DATABASE agroshop_db_restored;"

# Importar estructura
psql -U postgres -d agroshop_db_restored < estructura.sql

# Importar datos
psql -U postgres -d agroshop_db_restored < backup_completo.sql

# Actualizar .env y aplicar migraciones pendientes
npx prisma migrate deploy
```

---

## 🎯 COMANDOS ESENCIALES

```powershell
# Desarrollo: Crear y aplicar migración
npx prisma migrate dev --name descripcion_cambio

# Producción: Solo aplicar migraciones existentes
npx prisma migrate deploy

# Ver estado
npx prisma migrate status

# Sincronizar schema desde BD
npx prisma db pull

# Resetear BD (desarrollo, borra datos)
npx prisma migrate reset

# Generar Prisma Client
npx prisma generate

# Abrir Prisma Studio
npx prisma studio

# Aplicar seed
npx prisma db seed
```

---

## ✅ CHECKLIST CAMBIO DE BD

- [ ] Hacer backup de BD actual
- [ ] Crear nueva BD en PostgreSQL
- [ ] Actualizar DATABASE_URL en .env
- [ ] Ejecutar `npx prisma migrate deploy`
- [ ] Ejecutar `npx prisma generate`
- [ ] (Opcional) Ejecutar `npx prisma db seed`
- [ ] Verificar con `npx prisma migrate status`
- [ ] Probar aplicación con `npm run dev`
- [ ] Verificar que triggers funcionan

---

## 📚 REFERENCIAS

### Archivos Importantes

```
.env                          ← Conexión a BD
prisma/schema.prisma          ← Definición del schema
prisma/migrations/            ← Historial de cambios
prisma/seed.ts                ← Datos iniciales
```

### Migraciones Actuales

```
20241204000000_fix_lotes_triggers/      ← Corrección triggers lotes
20251203000000_add_triggers_and_views/  ← Triggers y vistas
20251204101214_init/                    ← Estructura inicial
20251204101300_add_triggers_and_views/  ← Más triggers
```

### Documentación

- `docs/GUIA-MIGRACIONES-PRISMA.md` - Guía completa de migraciones
- `docs/AUDITORIA-MODULO-LOTES-COMPLETA.md` - Auditoría de lotes
- `database/README.md` - Documentación de scripts SQL

---

## 🎉 RESULTADO

Con este setup:
- ✅ **1 comando** para configurar BD nueva
- ✅ **Migraciones versionadas** en Git
- ✅ **Triggers incluidos** automáticamente
- ✅ **Sincronización fácil** entre entornos
- ✅ **Rollback posible** si hay problemas
- ✅ **Equipo sincronizado** con git pull + migrate

**¡Cambiar de BD es tan simple como ejecutar `npx prisma migrate deploy`!**
