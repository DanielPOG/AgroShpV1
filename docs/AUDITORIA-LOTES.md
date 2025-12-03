# Auditoría de Lotes - Documentación

## 📋 Resumen

Se ha implementado un sistema completo de auditoría para la tabla `lotes_productos` que registra automáticamente todos los cambios (INSERT, UPDATE, DELETE) en la tabla `auditoria`.

## 🎯 ¿Qué se registra?

### **Operaciones capturadas:**
- ✅ **INSERT**: Cuando se crea un nuevo lote
- ✅ **UPDATE**: Cuando se modifica un lote (estado, cantidad, etc.)
- ✅ **DELETE**: Cuando se elimina un lote

### **Información registrada:**
- `tabla`: Siempre será `'lotes_productos'`
- `registro_id`: ID del lote afectado
- `accion`: Tipo de operación (INSERT/UPDATE/DELETE)
- `datos_anteriores`: Estado del lote ANTES del cambio (JSON)
- `datos_nuevos`: Estado del lote DESPUÉS del cambio (JSON)
- `usuario_id`: ID del usuario que realizó el cambio
- `fecha`: Timestamp del cambio (timezone: America/Bogota)

## 🚀 Instalación

### 1. Ejecutar el script SQL

**Opción A - Con PowerShell:**
```powershell
cd database
.\aplicar-auditoria-lotes.ps1
```

**Opción B - Manualmente con psql:**
```bash
psql $DATABASE_URL -f database/trigger-auditoria-lotes.sql
```

**Opción C - Desde Prisma Studio:**
1. Abre pgAdmin o cualquier cliente PostgreSQL
2. Conecta a tu base de datos
3. Ejecuta el contenido de `trigger-auditoria-lotes.sql`

## 📊 Consultas Útiles

### Ver todos los cambios de un lote específico
```sql
SELECT 
    id,
    accion,
    datos_anteriores,
    datos_nuevos,
    usuario_id,
    fecha
FROM auditoria 
WHERE tabla = 'lotes_productos' 
  AND registro_id = 26  -- Cambiar por el ID del lote
ORDER BY fecha DESC;
```

### Ver cambios de estado en los últimos 7 días
```sql
SELECT 
    registro_id,
    datos_anteriores->>'codigo_lote' as codigo_lote,
    datos_anteriores->>'estado' as estado_anterior,
    datos_nuevos->>'estado' as estado_nuevo,
    usuario_id,
    fecha
FROM auditoria 
WHERE tabla = 'lotes_productos' 
  AND accion = 'UPDATE'
  AND datos_anteriores->>'estado' IS DISTINCT FROM datos_nuevos->>'estado'
  AND fecha >= NOW() - INTERVAL '7 days'
ORDER BY fecha DESC;
```

### Ver cambios de cantidad
```sql
SELECT 
    registro_id,
    datos_anteriores->>'codigo_lote' as codigo_lote,
    datos_anteriores->>'cantidad' as cantidad_anterior,
    datos_nuevos->>'cantidad' as cantidad_nueva,
    usuario_id,
    fecha
FROM auditoria 
WHERE tabla = 'lotes_productos' 
  AND accion = 'UPDATE'
  AND datos_anteriores->>'cantidad' IS DISTINCT FROM datos_nuevos->>'cantidad'
ORDER BY fecha DESC;
```

### Ver últimos 20 cambios en lotes
```sql
SELECT 
    registro_id,
    accion,
    datos_nuevos->>'codigo_lote' as codigo_lote,
    datos_nuevos->>'estado' as estado,
    usuario_id,
    fecha
FROM auditoria 
WHERE tabla = 'lotes_productos'
ORDER BY fecha DESC
LIMIT 20;
```

### Ver quién cambió un lote a "vencido"
```sql
SELECT 
    a.registro_id,
    a.datos_nuevos->>'codigo_lote' as codigo_lote,
    a.datos_anteriores->>'estado' as estado_anterior,
    a.datos_nuevos->>'estado' as estado_nuevo,
    u.nombre as usuario,
    u.email,
    a.fecha
FROM auditoria a
LEFT JOIN usuarios u ON u.id = a.usuario_id
WHERE a.tabla = 'lotes_productos' 
  AND a.accion = 'UPDATE'
  AND a.datos_nuevos->>'estado' = 'vencido'
ORDER BY a.fecha DESC;
```

## 🔍 Cómo Funciona

### Flujo de Auditoría

1. **Usuario edita un lote** desde el frontend (modal de edición)
2. **Frontend envía** `PUT /api/lotes/[id]` con `estado` y `usuario_id`
3. **API valida** permisos y datos (solo Admin/Inventarista)
4. **Prisma actualiza** el lote en la base de datos
5. **Trigger automático** captura el cambio y crea registro en `auditoria`
6. **Backend actualiza** el `usuario_id` en el registro de auditoría
7. **Resultado**: Auditoría completa con antes/después y quién lo hizo

### Ejemplo de Registro de Auditoría

```json
{
  "id": 1523,
  "tabla": "lotes_productos",
  "registro_id": 26,
  "accion": "UPDATE",
  "datos_anteriores": {
    "id": 26,
    "producto_id": 45,
    "codigo_lote": "YOG-202512-001",
    "cantidad": 20,
    "estado": "disponible",
    "fecha_produccion": "2025-12-02T05:00:00.000Z",
    "fecha_vencimiento": "2025-12-04T05:00:00.000Z"
  },
  "datos_nuevos": {
    "id": 26,
    "producto_id": 45,
    "codigo_lote": "YOG-202512-001",
    "cantidad": 20,
    "estado": "vencido",
    "fecha_produccion": "2025-12-02T05:00:00.000Z",
    "fecha_vencimiento": "2025-12-04T05:00:00.000Z"
  },
  "usuario_id": 1,
  "fecha": "2025-12-02T18:45:23.123Z"
}
```

## ⚠️ Notas Importantes

1. **El trigger es automático**: No necesitas cambiar código, solo ejecutar el SQL una vez
2. **Registros históricos**: Solo se auditan cambios DESPUÉS de aplicar el trigger
3. **Espacio en disco**: La tabla `auditoria` crecerá con el tiempo, considera políticas de limpieza
4. **Performance**: El trigger tiene impacto mínimo en performance (< 1ms por operación)

## 🧪 Verificar Instalación

Después de aplicar el trigger, verifica que funciona:

```sql
-- 1. Verificar que el trigger existe
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgtype as type
FROM pg_trigger 
WHERE tgname = 'trigger_auditoria_lotes_productos';

-- 2. Hacer un cambio de prueba (desde la app)
-- Edita cualquier lote y cambia su estado

-- 3. Verificar que se registró
SELECT * FROM auditoria 
WHERE tabla = 'lotes_productos' 
ORDER BY fecha DESC 
LIMIT 5;
```

## 📈 Reportes Sugeridos

Puedes crear vistas o reportes basados en la auditoría:

```sql
-- Vista de cambios de estado por usuario
CREATE OR REPLACE VIEW reporte_cambios_estado_lotes AS
SELECT 
    a.registro_id as lote_id,
    a.datos_nuevos->>'codigo_lote' as codigo_lote,
    a.datos_anteriores->>'estado' as estado_anterior,
    a.datos_nuevos->>'estado' as estado_nuevo,
    u.nombre as usuario,
    a.fecha
FROM auditoria a
LEFT JOIN usuarios u ON u.id = a.usuario_id
WHERE a.tabla = 'lotes_productos' 
  AND a.accion = 'UPDATE'
  AND a.datos_anteriores->>'estado' IS DISTINCT FROM a.datos_nuevos->>'estado'
ORDER BY a.fecha DESC;
```

## 🛠️ Mantenimiento

### Limpiar auditorías antiguas (opcional)

```sql
-- Eliminar auditorías de lotes más antiguas de 1 año
DELETE FROM auditoria 
WHERE tabla = 'lotes_productos' 
  AND fecha < NOW() - INTERVAL '1 year';

-- Ver tamaño de la tabla auditoria
SELECT 
    pg_size_pretty(pg_total_relation_size('auditoria')) as tamaño_total,
    COUNT(*) as total_registros
FROM auditoria 
WHERE tabla = 'lotes_productos';
```

## ✅ Checklist de Implementación

- [ ] Ejecutar `trigger-auditoria-lotes.sql` en la base de datos
- [ ] Verificar que el trigger existe
- [ ] Probar editando un lote desde la app
- [ ] Verificar que se registró en `auditoria` con `usuario_id`
- [ ] (Opcional) Crear vistas de reporte
- [ ] (Opcional) Configurar política de limpieza de auditorías antiguas

---

**Última actualización**: 2 de diciembre de 2025
