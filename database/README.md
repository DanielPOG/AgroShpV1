# 🗄️ Base de Datos AgroShop

## Descripción General

Este directorio contiene el esquema completo de la base de datos PostgreSQL para el sistema AgroShop del SENA Centro Agropecuario.

## 📋 Contenido

- **schema.sql**: Script SQL completo con todas las tablas, relaciones, índices, vistas y triggers

## 🏗️ Arquitectura de la Base de Datos

### Tablas Principales

#### 1. **Usuarios y Autenticación**
- `roles`: Roles del sistema (Admin, Inventarista, Cajero, Consulta)
- `usuarios`: Usuarios del sistema con autenticación

#### 2. **Catálogo de Productos**
- `categorias`: Categorías de productos (Hortalizas, Lácteos, etc.)
- `productos`: Catálogo completo de productos
- `lotes_productos`: Control de lotes para productos perecederos

#### 3. **Unidades Productivas**
- `unidades_productivas`: Unidades del SENA (Huerta, Granja, Panadería, etc.)

#### 4. **Inventario y Movimientos**
- `movimientos_unidades`: Transferencias entre unidades productivas
- `detalle_movimientos`: Detalle de productos transferidos
- `historial_inventario`: Auditoría completa de movimientos

#### 5. **Ventas y Facturación**
- `ventas`: Registro de ventas
- `detalle_ventas`: Productos vendidos por venta
- `metodos_pago`: Métodos de pago disponibles
- `pagos_venta`: Pagos realizados (soporta pago mixto)

#### 6. **Sistema**
- `configuracion`: Configuraciones del sistema
- `notificaciones`: Notificaciones y alertas

### Vistas Útiles

- `vista_productos_completa`: Productos con toda su información relacionada
- `vista_ventas_diarias`: Resumen de ventas por día
- `vista_productos_vencimiento`: Productos próximos a vencer

### Funciones y Triggers

- **actualizar_updated_at()**: Actualiza automáticamente el campo `updated_at`
- **registrar_movimiento_inventario()**: Registra cambios en el inventario
- **generar_codigo_producto()**: Genera códigos automáticos para productos

## 🚀 Instalación

### Opción 1: PostgreSQL Local

```bash
# 1. Crear la base de datos
createdb agroshop

# 2. Ejecutar el script
psql -U tu_usuario -d agroshop -f schema.sql
```

### Opción 2: Supabase

1. Crea un nuevo proyecto en [Supabase](https://supabase.com)
2. Ve a SQL Editor
3. Copia y pega el contenido de `schema.sql`
4. Ejecuta el script

### Opción 3: Neon

1. Crea un nuevo proyecto en [Neon](https://neon.tech)
2. Conecta con el cliente psql:
```bash
psql postgresql://usuario:password@ep-xxx.neon.tech/agroshop
```
3. Ejecuta el script:
```sql
\i schema.sql
```

## 🔧 Configuración con Prisma

### 1. Instalar Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

### 2. Configurar DATABASE_URL

Edita `.env`:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/agroshop"
```

### 3. Generar Schema de Prisma desde la DB

```bash
# Ejecuta primero el schema.sql en tu base de datos
psql -U usuario -d agroshop -f database/schema.sql

# Luego genera el schema de Prisma
npx prisma db pull

# Genera el cliente
npx prisma generate
```

### 4. Abrir Prisma Studio (opcional)

```bash
npx prisma studio
```

Esto abre una UI visual en `http://localhost:5555` para explorar tus datos.

## 📊 Diagrama de Relaciones

```
usuarios ──┬─── ventas
           ├─── movimientos_unidades
           └─── historial_inventario

roles ─── usuarios

categorias ─── productos ──┬─── lotes_productos
                           ├─── detalle_ventas
                           ├─── detalle_movimientos
                           └─── historial_inventario

unidades_productivas ──┬─── productos
                       ├─── lotes_productos
                       ├─── movimientos_unidades (origen)
                       └─── movimientos_unidades (destino)

ventas ──┬─── detalle_ventas
         └─── pagos_venta

metodos_pago ─── pagos_venta
```

## 🔐 Seguridad

### Passwords

Los passwords se almacenan hasheados con bcrypt:

```javascript
import bcrypt from 'bcryptjs'

// Hashear password
const hash = await bcrypt.hash('password123', 10)

// Verificar password
const isValid = await bcrypt.compare('password123', hash)
```

### Roles y Permisos

Los permisos se almacenan en formato JSON en la tabla `roles`:

```json
{
  "inventario": true,
  "movimientos": true,
  "pos": false,
  "reportes": true
}
```

## 📈 Datos de Ejemplo

El script incluye datos iniciales:

- 4 roles predefinidos
- 6 unidades productivas del SENA
- 8 categorías de productos
- 4 métodos de pago
- Configuraciones del sistema

## 🧪 Testing

### Verificar instalación

```sql
-- Ver todas las tablas
\dt

-- Contar registros iniciales
SELECT 'roles' as tabla, COUNT(*) FROM roles
UNION ALL
SELECT 'categorias', COUNT(*) FROM categorias
UNION ALL
SELECT 'unidades_productivas', COUNT(*) FROM unidades_productivas
UNION ALL
SELECT 'metodos_pago', COUNT(*) FROM metodos_pago;
```

### Crear usuario de prueba

```sql
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id)
VALUES (
  'Admin',
  'SENA',
  'admin@sena.edu.co',
  '$2a$10$ejemplo_hash_bcrypt',
  (SELECT id FROM roles WHERE nombre = 'Admin')
);
```

## 🔄 Migraciones

Si necesitas hacer cambios al schema:

### Con Prisma

```bash
# 1. Modifica prisma/schema.prisma
# 2. Crea la migración
npx prisma migrate dev --name nombre_de_la_migracion

# 3. Aplica en producción
npx prisma migrate deploy
```

### Con SQL directo

```bash
# Crea un archivo de migración
touch database/migrations/001_add_campo.sql

# Aplica la migración
psql -U usuario -d agroshop -f database/migrations/001_add_campo.sql
```

## 📝 Índices Importantes

El schema incluye índices optimizados para:

- Búsqueda de productos por código de barras
- Filtrado por categoría y unidad productiva
- Consultas de ventas por fecha
- Búsqueda de texto completo en productos
- Alertas de stock bajo y vencimiento

## 🚨 Alertas Automáticas

El sistema puede generar alertas automáticas para:

- **Stock bajo**: Cuando `stock_actual <= stock_minimo`
- **Próximo a vencer**: Cuando `fecha_vencimiento - CURRENT_DATE <= dias_alerta_vencimiento`
- **Sin stock**: Cuando `stock_actual = 0`

## 🛠️ Mantenimiento

### Backup

```bash
# Backup completo
pg_dump -U usuario agroshop > backup_$(date +%Y%m%d).sql

# Restaurar
psql -U usuario agroshop < backup_20250126.sql
```

### Vacuum (optimización)

```sql
-- Analizar y optimizar
VACUUM ANALYZE;

-- Ver estadísticas
SELECT schemaname, tablename, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

## 📚 Recursos

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Neon Documentation](https://neon.tech/docs)

## ❓ Preguntas Frecuentes

### ¿Cómo agrego un nuevo producto?

```sql
INSERT INTO productos (
  nombre, descripcion, categoria_id, precio_unitario,
  tipo_medida, unidad, stock_actual, unidad_productiva_id
) VALUES (
  'Tomate Cherry', 'Tomate cherry orgánico', 1, 5000,
  'peso', 'kg', 50, 1
);
```

### ¿Cómo registro una venta?

```sql
-- 1. Crear la venta
INSERT INTO ventas (codigo_venta, usuario_id, subtotal, impuesto, total)
VALUES ('VTA-001', 1, 10000, 1900, 11900)
RETURNING id;

-- 2. Agregar productos
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
VALUES (1, 1, 2, 5000, 10000);

-- 3. Registrar pago
INSERT INTO pagos_venta (venta_id, metodo_pago_id, monto)
VALUES (1, 1, 11900);
```

### ¿Cómo transfiero productos entre unidades?

```sql
-- 1. Crear movimiento
INSERT INTO movimientos_unidades (
  codigo_movimiento, unidad_origen_id, unidad_destino_id, usuario_id
) VALUES ('MOV-001', 1, 2, 1)
RETURNING id;

-- 2. Agregar detalle
INSERT INTO detalle_movimientos (movimiento_id, producto_id, cantidad, unidad)
VALUES (1, 1, 10, 'kg');

-- 3. Actualizar stock (esto se puede automatizar con triggers)
UPDATE productos SET stock_actual = stock_actual - 10 WHERE id = 1;
```

---

**Desarrollado para SENA Centro Agropecuario** 🌱
