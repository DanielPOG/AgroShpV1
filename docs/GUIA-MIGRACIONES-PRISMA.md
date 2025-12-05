# 📋 GUÍA COMPLETA: MIGRACIONES CON PRISMA

## 🎯 ¿Qué es una Migración?

Una migración es un archivo que describe **cambios en la estructura de la base de datos**. Es como un historial de cambios que permite:
- ✅ Recrear la BD desde cero en otra máquina
- ✅ Sincronizar cambios entre desarrollo, staging y producción
- ✅ Revertir cambios si algo sale mal
- ✅ Trabajar en equipo sin conflictos

---

## 🚨 PROBLEMA ACTUAL

Has estado haciendo cambios directos en PostgreSQL:
- Scripts SQL ejecutados manualmente
- Triggers creados con psql
- Columnas agregadas sin migración
- Schema.prisma sincronizado manualmente

**Consecuencia:** Si cambias de BD o otra persona clona el proyecto, no tendrá los cambios.

---

## ✅ SOLUCIÓN: WORKFLOW CON MIGRACIONES

### 🔄 Flujo de Trabajo Ideal

```
1. Modificar schema.prisma
   ↓
2. Crear migración: npx prisma migrate dev
   ↓
3. Prisma genera SQL automáticamente
   ↓
4. Se aplica a la BD
   ↓
5. Commit de la migración
```

---

## 📁 ESTADO ACTUAL DEL PROYECTO

### Archivos SQL Sueltos (NO son migraciones)
```
database/
├── init-database.sql                    ← Script inicial
├── schema.sql                           ← Esquema completo
├── schema-mejoras.sql                   ← Mejoras aplicadas
├── schema-configuracion-mejorada.sql    ← Más mejoras
├── schema-control-caja.sql              ← Control de caja
├── fix-historial-usuario-id.sql         ← Corrección fase 67
├── fix-lotes-auditoria-completa.sql     ← Corrección fase 70
└── seed-usuarios.sql                    ← Datos de prueba
```

**Problema:** Estos scripts NO son rastreados por Prisma como migraciones.

### Schema.prisma Actual
```
prisma/
└── schema.prisma  ← Refleja el estado actual de la BD
```

**Problema:** No hay carpeta `prisma/migrations/` con el historial.

---

## 🛠️ CÓMO CREAR EL ESTADO INICIAL (BASELINE)

### Opción 1: Crear Baseline desde BD Actual (RECOMENDADO)

```powershell
# 1. Asegurar que schema.prisma esté sincronizado
npx prisma db pull

# 2. Crear migración baseline (sin aplicar cambios)
npx prisma migrate dev --name init --create-only

# 3. Revisar el SQL generado
# Se crea: prisma/migrations/YYYYMMDDHHMMSS_init/migration.sql

# 4. Marcar como aplicada (no ejecutar de nuevo)
npx prisma migrate resolve --applied init

# 5. Commit del resultado
git add prisma/migrations
git commit -m "feat: create baseline migration from existing database"
```

**Resultado:**
```
prisma/
├── schema.prisma
└── migrations/
    ├── migration_lock.toml
    └── 20251205120000_init/
        └── migration.sql  ← Estado completo de la BD
```

### Opción 2: Consolidar Scripts Existentes

```powershell
# 1. Crear carpeta de migraciones manualmente
mkdir prisma\migrations\20251205120000_init

# 2. Combinar todos tus scripts SQL en uno
# Copiar contenido en el siguiente orden:
#    - init-database.sql
#    - schema.sql
#    - schema-mejoras.sql
#    - schema-configuracion-mejorada.sql
#    - schema-control-caja.sql
#    - fix-historial-usuario-id.sql
#    - fix-lotes-auditoria-completa.sql

# 3. Crear archivo de migración
notepad prisma\migrations\20251205120000_init\migration.sql

# 4. Marcar como aplicada
npx prisma migrate resolve --applied 20251205120000_init

# 5. Commit
git add prisma/migrations
git commit -m "feat: consolidate all database changes into baseline migration"
```

---

## 🔄 WORKFLOW FUTURO: NUEVOS CAMBIOS

### Paso 1: Modificar schema.prisma

```prisma
// Ejemplo: Agregar campo nuevo
model productos {
  // ... campos existentes
  fecha_ultima_actualizacion DateTime? @default(now())
}
```

### Paso 2: Crear Migración

```powershell
npx prisma migrate dev --name add_fecha_actualizacion_productos
```

**Qué hace:**
1. ✅ Genera SQL automáticamente
2. ✅ Aplica cambios a tu BD local
3. ✅ Actualiza Prisma Client
4. ✅ Crea archivo en `prisma/migrations/`

**Archivo generado:**
```
prisma/migrations/20251205150000_add_fecha_actualizacion_productos/
└── migration.sql
```

```sql
-- CreateIndex
ALTER TABLE "productos" ADD COLUMN "fecha_ultima_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
```

### Paso 3: Commit

```powershell
git add prisma/migrations
git add prisma/schema.prisma
git commit -m "feat: add fecha_ultima_actualizacion to productos"
```

### Paso 4: Aplicar en Producción

```powershell
# En el servidor de producción
npx prisma migrate deploy
```

---

## 🔧 COMANDOS PRINCIPALES

### Desarrollo

```powershell
# Crear migración y aplicar
npx prisma migrate dev --name nombre_descriptivo

# Solo crear migración sin aplicar
npx prisma migrate dev --name nombre_descriptivo --create-only

# Sincronizar schema.prisma desde BD
npx prisma db pull

# Ver estado de migraciones
npx prisma migrate status
```

### Producción

```powershell
# Aplicar migraciones pendientes (NO crea nuevas)
npx prisma migrate deploy

# Resetear BD (¡CUIDADO! Borra todo)
npx prisma migrate reset
```

### Resolver Problemas

```powershell
# Marcar migración como aplicada (sin ejecutar)
npx prisma migrate resolve --applied NOMBRE_MIGRACION

# Marcar migración como revertida
npx prisma migrate resolve --rolled-back NOMBRE_MIGRACION
```

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### ❌ ANTES (Estado Actual)

```
1. Crear archivo SQL en database/
2. Ejecutar con psql manualmente
3. Actualizar schema.prisma manualmente
4. npx prisma generate
5. ❌ Cambios NO rastreados
6. ❌ Difícil de replicar en otra BD
```

### ✅ DESPUÉS (Con Migraciones)

```
1. Modificar schema.prisma
2. npx prisma migrate dev --name cambio
3. ✅ SQL generado automáticamente
4. ✅ Aplicado a BD automáticamente
5. ✅ Prisma Client actualizado automáticamente
6. ✅ Commit del archivo de migración
7. ✅ Fácil de aplicar en cualquier BD
```

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Crear Baseline (HOY)

```powershell
# Opción A: Desde BD actual (más rápido)
npx prisma db pull
npx prisma migrate dev --name init --create-only
npx prisma migrate resolve --applied init

# Opción B: Consolidar scripts (más completo)
# Ver "Opción 2: Consolidar Scripts Existentes" arriba
```

### Fase 2: Limpiar Scripts Antiguos

```powershell
# Mover scripts a carpeta de histórico
mkdir database\historico
move database\*.sql database\historico\

# Mantener solo:
# - seed-usuarios.sql (datos de prueba)
# - README.md (documentación)
```

### Fase 3: Workflow Futuro

```
SIEMPRE que hagas cambios en BD:
1. Modificar schema.prisma
2. npx prisma migrate dev --name cambio_descriptivo
3. Commit de la migración
```

---

## 🚀 VENTAJAS DEL NUEVO SISTEMA

### Para Ti (Desarrollador)
- ✅ Cambios versionados en Git
- ✅ Historial completo de cambios
- ✅ Fácil revertir si algo sale mal
- ✅ No más scripts manuales
- ✅ Prisma Client siempre sincronizado

### Para el Equipo
- ✅ Otros desarrolladores obtienen cambios con `git pull`
- ✅ Aplican con `npx prisma migrate dev`
- ✅ No necesitan scripts SQL manuales

### Para Producción
- ✅ Migraciones confiables y probadas
- ✅ Comando simple: `npx prisma migrate deploy`
- ✅ Rollback posible si es necesario
- ✅ Trazabilidad completa

### Para Cambio de BD
```powershell
# Nueva máquina o BD vacía
git clone repo
npm install
npx prisma migrate deploy  # Aplica todas las migraciones
npx prisma db seed         # Datos iniciales (si existe)
```

---

## 📝 EJEMPLO COMPLETO: AGREGAR CAMPO

### 1. Modificar schema.prisma

```prisma
model lotes_productos {
  id                   Int       @id @default(autoincrement())
  producto_id          Int?
  codigo_lote          String    @unique @db.VarChar(50)
  cantidad             Decimal   @db.Decimal(10, 2)
  // ... otros campos
  observaciones        String?   // ← NUEVO CAMPO
  created_at           DateTime? @default(now())
}
```

### 2. Crear Migración

```powershell
npx prisma migrate dev --name add_observaciones_to_lotes
```

**Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "agroshop_db"

Applying migration `20251205160000_add_observaciones_to_lotes`

The following migration has been created and applied from new schema changes:

migrations/
  └─ 20251205160000_add_observaciones_to_lotes/
    └─ migration.sql

✔ Generated Prisma Client
```

### 3. Archivo Generado

**prisma/migrations/20251205160000_add_observaciones_to_lotes/migration.sql**
```sql
-- AlterTable
ALTER TABLE "lotes_productos" ADD COLUMN "observaciones" TEXT;
```

### 4. Commit

```powershell
git add prisma/migrations/20251205160000_add_observaciones_to_lotes
git add prisma/schema.prisma
git commit -m "feat: add observaciones field to lotes_productos"
git push
```

### 5. Otro Desarrollador

```powershell
git pull
npx prisma migrate dev  # Aplica la nueva migración
# ¡Listo! BD sincronizada
```

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error: "Migration failed to apply cleanly"

**Causa:** Cambio manual en BD no coincide con migración.

**Solución:**
```powershell
# Ver diferencias
npx prisma migrate status

# Opción 1: Resolver como aplicada
npx prisma migrate resolve --applied NOMBRE_MIGRACION

# Opción 2: Resetear (¡CUIDADO! Borra datos)
npx prisma migrate reset
```

### Error: "Drift detected"

**Causa:** BD tiene cambios no reflejados en migraciones.

**Solución:**
```powershell
# Ver diferencias
npx prisma migrate diff

# Crear migración de ajuste
npx prisma migrate dev --name fix_drift
```

### Error: Schema y BD no coinciden

**Solución:**
```powershell
# Sincronizar schema desde BD
npx prisma db pull

# Crear migración con diferencias
npx prisma migrate dev --name sync_schema
```

---

## 📚 RECURSOS ADICIONALES

### Documentación Oficial
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Baseline Migration](https://www.prisma.io/docs/guides/migrate/production-troubleshooting#baselining-a-database)
- [Migration Workflows](https://www.prisma.io/docs/guides/migrate/migration-workflows)

### Comandos de Referencia Rápida
```powershell
# Ver ayuda
npx prisma migrate --help

# Ver estado
npx prisma migrate status

# Generar solo cliente (sin migración)
npx prisma generate

# Push directo (desarrollo rápido, NO recomendado)
npx prisma db push
```

---

## ✅ CHECKLIST FINAL

- [ ] Crear baseline migration desde BD actual
- [ ] Marcar baseline como aplicada
- [ ] Commit de prisma/migrations/
- [ ] Mover scripts SQL a carpeta histórico
- [ ] Actualizar README.md con nuevo workflow
- [ ] Documentar comando de setup: `npx prisma migrate deploy`
- [ ] Probar en BD limpia que funcione
- [ ] Entrenar a equipo en nuevo workflow

---

## 🎉 RESULTADO FINAL

```
Tu proyecto tendrá:
✅ Historial completo de cambios en BD
✅ Migraciones versionadas en Git
✅ Setup automático con un comando
✅ Sincronización fácil entre entornos
✅ Rollback posible si hay problemas
✅ Workflow profesional y escalable
```

**¡Con esto, cambiar de BD será tan simple como ejecutar `npx prisma migrate deploy`!**
