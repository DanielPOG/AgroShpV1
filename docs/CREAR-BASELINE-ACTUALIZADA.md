# 🔄 CREAR BASELINE ACTUALIZADA

## ¿Por Qué Crear Una Nueva Baseline?

Las migraciones actuales son de diciembre 2024, pero has hecho muchos cambios desde entonces:
- ✅ Triggers de auditoría con usuario_id
- ✅ Triggers de lotes mejorados
- ✅ Campo usuario_id en lotes_productos
- ✅ Índices de rendimiento
- ✅ 30+ modelos actualizados

**Problema:** Si alguien clona el repo y ejecuta las migraciones antiguas, no tendrá estos cambios.

**Solución:** Crear una migración baseline ACTUALIZADA desde tu BD actual.

---

## 🎯 Dos Opciones

### Opción 1: Script Automatizado (Recomendado)

```powershell
# Ejecutar script
.\scripts\crear-baseline-actualizada.ps1

# Con confirmación automática
.\scripts\crear-baseline-actualizada.ps1 -Force
```

**Qué hace:**
1. ✅ Hace backup de migraciones actuales
2. ✅ Sincroniza schema.prisma desde BD
3. ✅ Elimina migraciones antiguas
4. ✅ Crea nueva baseline completa
5. ✅ Marca como aplicada (no ejecuta de nuevo)
6. ✅ Genera Prisma Client

**Tiempo:** ~2 minutos

---

### Opción 2: Manual (Más Control)

#### Paso 1: Backup Manual

```powershell
# Crear carpeta de backup
$fecha = Get-Date -Format "yyyyMMdd_HHmmss"
New-Item -Path "prisma\migrations\backup_$fecha" -ItemType Directory

# Copiar migraciones actuales
Copy-Item -Path "prisma\migrations\*" -Destination "prisma\migrations\backup_$fecha" -Recurse
```

#### Paso 2: Sincronizar Schema

```powershell
# Obtener estructura actual de BD
npx prisma db pull

# Verificar cambios en schema.prisma
git diff prisma/schema.prisma
```

#### Paso 3: Eliminar Migraciones Antiguas

```powershell
# Listar migraciones actuales
Get-ChildItem -Path "prisma\migrations" -Directory

# Eliminar carpetas de migraciones (NO eliminar migration_lock.toml)
Remove-Item "prisma\migrations\20241204000000_fix_lotes_triggers" -Recurse -Force
Remove-Item "prisma\migrations\20251203000000_add_triggers_and_views" -Recurse -Force
Remove-Item "prisma\migrations\20251204101214_init" -Recurse -Force
Remove-Item "prisma\migrations\20251204101300_add_triggers_and_views" -Recurse -Force
```

#### Paso 4: Crear Nueva Baseline

```powershell
# Crear migración baseline (sin aplicar)
npx prisma migrate dev --name baseline_completa --create-only
```

**Importante:** Esto generará SQL con TODAS las tablas, triggers, y funciones actuales.

#### Paso 5: Marcar Como Aplicada

```powershell
# Marcar que ya está aplicada (evita ejecutar de nuevo)
npx prisma migrate resolve --applied baseline_completa

# O con el nombre completo que se generó
npx prisma migrate resolve --applied 20251205XXXXXX_baseline_completa
```

#### Paso 6: Verificar

```powershell
# Ver estado
npx prisma migrate status

# Debe decir: "Database schema is up to date!"
```

#### Paso 7: Generar Cliente

```powershell
npx prisma generate
```

---

## 📋 Qué Incluirá la Nueva Baseline

La migración baseline contendrá TODO el estado actual:

### Estructura Completa
```sql
-- 30 Tablas
CREATE TABLE usuarios (...);
CREATE TABLE productos (...);
CREATE TABLE lotes_productos (...);
-- ... todas las demás

-- Índices Optimizados
CREATE INDEX idx_lotes_producto ON lotes_productos(producto_id);
CREATE INDEX idx_lotes_estado ON lotes_productos(estado);
CREATE INDEX idx_auditoria_tabla_registro ON auditoria(tabla, registro_id);
-- ... todos los índices

-- Funciones de Triggers
CREATE FUNCTION sync_stock_on_lote_insert() ...;
CREATE FUNCTION sync_stock_on_lote_update() ...;
CREATE FUNCTION sync_stock_on_lote_delete() ...;
CREATE FUNCTION auditar_lotes_productos() ...;
-- ... todas las funciones

-- Triggers
CREATE TRIGGER trg_sync_stock_on_lote_insert ...;
CREATE TRIGGER trg_sync_stock_on_lote_update ...;
CREATE TRIGGER trg_sync_stock_on_lote_delete ...;
CREATE TRIGGER trigger_auditoria_lotes_productos ...;
-- ... todos los triggers

-- Relaciones y Constraints
ALTER TABLE lotes_productos ADD CONSTRAINT ...;
-- ... todas las FKs
```

---

## ✅ Verificación Post-Baseline

### 1. Verificar Archivo de Migración

```powershell
# Abrir archivo generado
notepad prisma\migrations\YYYYMMDDHHMMSS_baseline_completa\migration.sql

# Buscar en el archivo:
# ✅ Debe tener CREATE TABLE para todas las tablas
# ✅ Debe tener CREATE FUNCTION para triggers
# ✅ Debe tener CREATE TRIGGER
# ✅ Debe tener CREATE INDEX
```

### 2. Verificar Estado de Migraciones

```powershell
npx prisma migrate status

# Output esperado:
# "Database schema is up to date!"
# "1 migration found in prisma/migrations"
```

### 3. Probar en BD Limpia

```powershell
# Crear BD de prueba
.\scripts\setup-nueva-bd.ps1 -NombreDB "test_baseline" -DropExisting

# Verificar que funcione
npx prisma studio
# Abrir y verificar que todas las tablas existan
```

### 4. Verificar Triggers

```powershell
# Conectar a BD de prueba
psql -U postgres -d test_baseline

# Listar triggers
\dft

# Verificar que existan:
# - trg_sync_stock_on_lote_insert
# - trg_sync_stock_on_lote_update
# - trg_sync_stock_on_lote_delete
# - trigger_auditoria_lotes_productos
```

---

## 🔄 Usar la Nueva Baseline

### En Tu Máquina (Ya Aplicada)

```powershell
# No necesitas hacer nada, ya tienes todo
npm run dev
```

### En Nueva Máquina / BD Nueva

```powershell
# Clonar repo
git clone https://github.com/tu-usuario/AgroShpV1.git
cd AgroShpV1

# Instalar dependencias
npm install

# Setup BD (incluye aplicar baseline)
.\scripts\setup-nueva-bd.ps1 -Seed

# Listo!
npm run dev
```

### En Otro Desarrollador

```powershell
# Obtener cambios
git pull

# Aplicar nuevas migraciones (si las hay)
npx prisma migrate dev

# Listo!
npm run dev
```

---

## 🚨 Posibles Problemas y Soluciones

### Problema 1: "Migration failed to apply"

**Causa:** Prisma intenta crear tablas que ya existen

**Solución:**
```powershell
# Marcar como aplicada sin ejecutar
npx prisma migrate resolve --applied baseline_completa
```

### Problema 2: "Database schema is not in sync"

**Causa:** Hay diferencias entre schema.prisma y BD

**Solución:**
```powershell
# Sincronizar desde BD
npx prisma db pull

# Crear migración de ajuste
npx prisma migrate dev --name fix_sync
```

### Problema 3: Error en Shadow Database

**Causa:** Prisma no puede crear BD temporal para validar

**Solución:**
```powershell
# Agregar a .env
SHADOW_DATABASE_URL="postgresql://postgres:password@localhost:5432/agroshop_shadow"

# Crear shadow database
psql -U postgres -c "CREATE DATABASE agroshop_shadow;"

# Reintentar
npx prisma migrate dev --name baseline_completa --create-only
```

### Problema 4: Baseline Muy Grande

**Causa:** La migración tiene miles de líneas

**Solución:** Esto es normal. La baseline debe tener TODO el schema.

Para verificar el tamaño:
```powershell
$archivo = Get-ChildItem "prisma\migrations\*_baseline_completa\migration.sql"
Get-Content $archivo | Measure-Object -Line

# Es normal tener 1000-3000 líneas
```

---

## 📊 Comparación: Antes vs Después

### ❌ ANTES (Migraciones Antiguas)

```
prisma/migrations/
├── 20241204000000_fix_lotes_triggers/     ← Dic 2024
├── 20251203000000_add_triggers_and_views/ ← Dic 2024
├── 20251204101214_init/                   ← Dic 2024
└── 20251204101300_add_triggers_and_views/ ← Dic 2024

Problemas:
❌ No incluyen cambios recientes
❌ Triggers sin usuario_id completo
❌ Falta índices de rendimiento
❌ 4 migraciones fragmentadas
```

### ✅ DESPUÉS (Baseline Actualizada)

```
prisma/migrations/
└── 20251205XXXXXX_baseline_completa/      ← NUEVA
    └── migration.sql                      ← TODO incluido

Ventajas:
✅ Incluye estado actual completo
✅ Triggers con usuario_id
✅ Todos los índices
✅ 1 sola migración clara
✅ Fácil de aplicar y entender
```

---

## 🎯 Cuándo Crear Nueva Baseline

### ✅ CREAR cuando:
- Has hecho muchos cambios manuales en BD
- Migraciones actuales son muy antiguas
- Quieres punto de partida limpio
- Proyecto nuevo con equipo nuevo

### ❌ NO CREAR cuando:
- Solo hiciste 1-2 cambios pequeños
- Migraciones actuales funcionan bien
- Equipo activo usando migraciones existentes
- Estás en producción activa

**En tu caso:** ✅ SÍ deberías crear baseline porque:
- Migraciones de diciembre 2024 (hace un mes)
- Has hecho muchos cambios desde entonces
- Quieres estado actual como punto de partida

---

## 💡 Mejores Prácticas

### 1. Baseline al Inicio del Proyecto
```powershell
# Al configurar proyecto por primera vez
npx prisma db pull
npx prisma migrate dev --name init --create-only
npx prisma migrate resolve --applied init
```

### 2. Cambios Incrementales Después
```powershell
# Para cada cambio nuevo
# 1. Editar schema.prisma
# 2. Crear migración
npx prisma migrate dev --name descripcion_cambio
# 3. Commit
git add prisma/migrations prisma/schema.prisma
git commit -m "feat: descripción"
```

### 3. Nueva Baseline Solo Si Es Necesario
```powershell
# Cada 3-6 meses o después de muchos cambios
.\scripts\crear-baseline-actualizada.ps1
```

---

## 📝 Checklist de Ejecución

Antes de crear baseline:
- [ ] Backup de BD actual (por seguridad)
- [ ] Commit de cambios pendientes
- [ ] Verificar que BD funciona correctamente
- [ ] Avisar a equipo (si hay uno)

Durante la creación:
- [ ] Ejecutar script o pasos manuales
- [ ] Verificar que no hay errores
- [ ] Revisar archivo de migración generado

Después de crear:
- [ ] Verificar con `npx prisma migrate status`
- [ ] Probar en BD limpia
- [ ] Verificar triggers con psql
- [ ] Probar aplicación `npm run dev`
- [ ] Commit de nueva baseline

---

## 🎉 Resultado Final

Después de crear la baseline tendrás:

```
✅ 1 migración limpia con TODO el estado actual
✅ Incluye 30 modelos completos
✅ Incluye todos los triggers de lotes
✅ Incluye triggers de auditoría
✅ Incluye índices de rendimiento
✅ Fácil de aplicar con: npx prisma migrate deploy
✅ Punto de partida claro para futuros cambios
```

**Comando para aplicar en nueva BD:**
```powershell
npx prisma migrate deploy
```

**¡Eso es todo! BD completa con un solo comando.**
