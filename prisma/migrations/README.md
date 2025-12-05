# Migraciones de Base de Datos - AgroShop

## 📚 ¿Qué son las migraciones?

Las migraciones de Prisma son archivos SQL que registran los cambios en la estructura de tu base de datos. Cada vez que modificas el `schema.prisma`, Prisma genera automáticamente una migración.

## 🏗️ Estructura de Carpetas

```
prisma/
├── schema.prisma                          # Definición de modelos y relaciones
└── migrations/
    ├── 20241204000000_fix_lotes_triggers/ # Migración de triggers de lotes
    │   └── migration.sql                  # SQL con los triggers correctos
    └── [otras migraciones]/
```

## 🚀 Cómo Crear una Nueva Base de Datos

Cuando necesites crear una base de datos desde cero:

### Opción 1: Usar Prisma Migrate (Recomendado)

```bash
# 1. Crea la base de datos vacía en PostgreSQL
createdb agroshop_db

# 2. Aplica todas las migraciones automáticamente
npx prisma migrate deploy

# 3. Genera el cliente de Prisma
npx prisma generate
```

**Esto aplicará:**
- ✅ Todas las tablas definidas en `schema.prisma`
- ✅ Todas las relaciones (foreign keys)
- ✅ Todos los índices
- ✅ **Todos los triggers personalizados** (incluidos en las migraciones)
- ✅ Todas las funciones de PostgreSQL

### Opción 2: Desarrollo Local

```bash
# En desarrollo, usa migrate dev para aplicar migraciones pendientes
npx prisma migrate dev
```

## 🔧 Migraciones Personalizadas

### Migración: `20241204000000_fix_lotes_triggers`

**Propósito:** Corrige y establece los triggers correctos para sincronización de stock con lotes.

**Funciones creadas:**
- `sync_stock_on_lote_insert()` - Suma stock al insertar lote disponible
- `sync_stock_on_lote_update()` - Ajusta stock al cambiar estado/cantidad de lote

**Triggers creados:**
- `trg_sync_stock_on_lote_insert` - Se ejecuta AFTER INSERT
- `trg_sync_stock_on_lote_update` - Se ejecuta AFTER UPDATE

**Triggers eliminados (problemáticos):**
- `trigger_auditoria_lotes` - Intentaba insertar en tabla inexistente
- `trigger_sync_stock_*` - Versiones antiguas duplicadas

## 📝 ¿Qué Incluye una Migración?

Las migraciones de Prisma pueden incluir:

1. **Cambios de Schema Automáticos** (generados por Prisma):
   - CREATE TABLE
   - ALTER TABLE
   - CREATE INDEX
   - ADD CONSTRAINT

2. **SQL Personalizado** (añadido manualmente):
   - CREATE TRIGGER
   - CREATE FUNCTION
   - CREATE VIEW
   - INSERT (datos iniciales)

## 🛠️ Comandos Útiles

```bash
# Ver estado de migraciones
npx prisma migrate status

# Aplicar migraciones pendientes (producción)
npx prisma migrate deploy

# Crear nueva migración (desarrollo)
npx prisma migrate dev --name nombre_descriptivo

# Crear migración vacía para SQL personalizado
npx prisma migrate dev --create-only --name custom_trigger

# Marcar migración como aplicada (si ya se ejecutó manualmente)
npx prisma migrate resolve --applied nombre_migracion

# Resetear base de datos (⚠️ ELIMINA TODOS LOS DATOS)
npx prisma migrate reset
```

## 🚨 Solución de Problemas

### Error: "The column `registro` does not exist"

**Causa:** Triggers antiguos intentando acceder a columnas inexistentes.

**Solución:** Ejecutar el script de corrección:

```bash
# Opción 1: Aplicar migración correctiva
npx prisma migrate deploy

# Opción 2: Ejecutar script SQL directamente
psql -U postgres -d agroshop_db -f fix-database-schema.sql
```

### Error: "Migration failed to apply"

**Causa:** La base de datos ya tiene algunos cambios aplicados.

**Solución:**

```bash
# Marcar migración problemática como aplicada
npx prisma migrate resolve --applied nombre_migracion

# Luego continuar con migraciones pendientes
npx prisma migrate deploy
```

## 📖 Buenas Prácticas

1. **Siempre usa migraciones** - No modifiques la BD manualmente en producción
2. **Nombres descriptivos** - Usa nombres que expliquen qué hace la migración
3. **Una migración = Un propósito** - No mezcles cambios no relacionados
4. **Prueba antes de producción** - Aplica en desarrollo primero
5. **Documenta SQL personalizado** - Añade comentarios explicativos
6. **Backup antes de migrar** - Especialmente en producción

## 🔄 Sincronización de Stock con Lotes

### ¿Cómo Funciona?

Cuando trabajas con lotes, el stock del producto se sincroniza **automáticamente** gracias a los triggers:

**Insertar un lote disponible:**
```sql
INSERT INTO lotes_productos (producto_id, cantidad, estado, ...)
-- Trigger suma automáticamente la cantidad al stock_actual del producto
```

**Cambiar estado de lote a "retirado":**
```sql
UPDATE lotes_productos SET estado = 'retirado' WHERE id = 1
-- Trigger resta automáticamente la cantidad del stock_actual
```

**Reactivar un lote:**
```sql
UPDATE lotes_productos SET estado = 'disponible' WHERE id = 1
-- Trigger suma de nuevo la cantidad al stock_actual
```

### Estados de Lote

- `disponible` → **Cuenta en el stock**
- `retirado` → No cuenta en el stock
- `agotado` → No cuenta en el stock
- `vencido` → No cuenta en el stock

## 📞 Soporte

Si encuentras problemas con migraciones:

1. Revisa el estado: `npx prisma migrate status`
2. Lee los logs de PostgreSQL
3. Verifica que los triggers existan: `\df+ sync_stock_*` en psql
4. Consulta este README
5. Ejecuta `fix-database-schema.sql` si hay problemas con triggers

---

**Última actualización:** 4 de diciembre de 2025
**Versión de Prisma:** 6.19.0
