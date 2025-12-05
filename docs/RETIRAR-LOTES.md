# Gestión de Retiro y Eliminación de Lotes

## 📋 Descripción

Sistema completo para retirar o eliminar lotes del inventario, con validaciones automáticas y auditoría completa.

## 🎯 Funcionalidades Implementadas

### 1. **Cambiar Estado a "Retirado"**
- Marca el lote como retirado del inventario
- El stock se descuenta automáticamente (trigger de BD)
- Se mantiene en el historial para auditoría
- **Casos de uso:**
  - Productos dañados
  - Lotes vencidos
  - Problemas de calidad
  - Retiro por control sanitario

### 2. **Eliminación Física**
- Elimina el lote permanentemente de la base de datos
- Solo disponible si NO tiene relaciones:
  - Sin ventas asociadas
  - Sin movimientos registrados
  - Sin costos de producción
- **Casos de uso:**
  - Lote creado por error
  - Registro duplicado
  - Error en datos iniciales

## 🔒 Validaciones y Seguridad

### Validaciones Backend (`lib/db/lotes.ts`)
```typescript
// Validación de eliminación
const ventasCount = await prisma.detalle_ventas.count({ where: { lote_id: id } })
if (ventasCount > 0) {
  throw new Error('No se puede eliminar porque tiene ventas asociadas')
}
```

### Permisos
- **Retirar lote:** Admin, Inventarista
- **Eliminar lote:** Admin, Inventarista
- Ambas acciones registradas en auditoría con usuario_id

## 📊 Auditoría y Trazabilidad

### Registros Automáticos
1. **Tabla `auditoria`:**
   - Registro del cambio de estado o eliminación
   - Datos antes y después (JSONB)
   - Usuario que ejecutó la acción
   - Timestamp con zona horaria de Colombia

2. **Tabla `historial_inventario`:**
   - Movimiento de stock (si aplica)
   - Cantidad anterior y nueva
   - Observaciones del motivo
   - Usuario responsable

### Ejemplo de Auditoría
```sql
-- Ver últimos retiros/eliminaciones
SELECT 
    a.accion,
    a.datos_anteriores->>'codigo_lote' as codigo,
    a.datos_anteriores->>'estado' as estado_anterior,
    a.datos_nuevos->>'estado' as estado_nuevo,
    u.nombre || ' ' || u.apellido as usuario,
    a.fecha
FROM auditoria a
LEFT JOIN usuarios u ON a.usuario_id = u.id
WHERE a.tabla = 'lotes_productos'
ORDER BY a.fecha DESC
LIMIT 10;
```

## 🎨 Interfaz de Usuario

### Modal de Retiro (`RetireLoteModal`)

**Paso 1: Selección de Acción**
- Opción 1: Cambiar a Retirado (recomendado)
  - Visual: Icono naranja XCircle
  - Color: Orange/Warning
  - Descripción clara del efecto
  
- Opción 2: Eliminar Permanentemente
  - Visual: Icono rojo Trash2
  - Color: Destructive/Red
  - Advertencia de acción irreversible

**Paso 2: Confirmación**
- Campo de motivo (opcional para retiro, recomendado para eliminación)
- Alerta según la acción seleccionada
- Botón de "Atrás" para cambiar de opinión
- Botón de confirmación con loading state

### Integración en LotesList
```tsx
<DropdownMenuItem 
  onClick={() => onRetire(lote.id, lote.codigo_lote)}
  className="text-destructive"
>
  <Trash2 className="mr-2 h-4 w-4" />
  Retirar Lote
</DropdownMenuItem>
```

## 🔄 Flujo de Uso

### Desde Dashboard → Inventario
1. Usuario hace clic en producto
2. Ve lista de lotes en `ProductDetailModal`
3. Clic en "..." → "Retirar Lote"
4. Modal `RetireLoteModal` se abre
5. Selecciona acción (retirar/eliminar)
6. Ingresa motivo (opcional)
7. Confirma acción
8. Sistema ejecuta:
   - Valida permisos y relaciones
   - Actualiza estado o elimina
   - Trigger actualiza stock
   - Se crea registro de auditoría
9. Modal se cierra y recarga datos

### Desde Dashboard → Lotes
1. Usuario ve lista completa de lotes
2. Clic en "..." en cualquier lote → "Retirar Lote"
3. Mismo flujo que arriba

## 📁 Archivos Modificados/Creados

### Backend
- ✅ `lib/db/lotes.ts` - Funciones `retirarLote()` y `deleteLote()`
- ✅ `app/api/lotes/[id]/route.ts` - Endpoint DELETE con query params

### Frontend
- ✅ `hooks/use-lote-mutations.ts` - Hook nuevo para mutaciones
- ✅ `components/inventory/retire-lote-modal.tsx` - Modal nuevo
- ✅ `components/inventory/lotes-list.tsx` - Botón "Retirar Lote"
- ✅ `components/inventory/product-detail-modal.tsx` - Integración modal
- ✅ `components/inventory/lotes-page-client.tsx` - Integración completa

## 🧪 Testing

### Casos de Prueba Recomendados

**Test 1: Retirar lote disponible**
```
1. Crear lote con estado "disponible"
2. Ejecutar "Retirar" → action=retire
3. Verificar:
   - Estado cambió a "retirado"
   - Stock se descontó
   - Registro en auditoria existe
   - Motivo aparece en historial
```

**Test 2: Eliminar lote sin ventas**
```
1. Crear lote nuevo (sin ventas)
2. Ejecutar "Retirar" → action=delete
3. Verificar:
   - Lote eliminado de BD
   - Stock actualizado
   - Auditoría registra DELETE
```

**Test 3: Intentar eliminar con ventas**
```
1. Crear lote
2. Registrar una venta con ese lote
3. Ejecutar "Retirar" → action=delete
4. Verificar:
   - Error: "tiene ventas asociadas"
   - Mensaje sugiere usar "Retirar"
   - Lote sigue existiendo
```

**Test 4: Permisos**
```
1. Login como "Cajero" (sin permisos)
2. Intentar retirar lote
3. Verificar:
   - Error 403 Forbidden
   - Mensaje de permisos insuficientes
```

## 🚀 Próximas Mejoras

### Posibles Extensiones
1. **Reportes de lotes retirados:**
   - Dashboard con gráficos de retiros por mes
   - Motivos más comunes de retiro
   - Valor monetario de pérdidas

2. **Notificaciones automáticas:**
   - Email al retirar lote de alto valor
   - Alerta a supervisores en eliminaciones

3. **Reversión de retiro:**
   - Opción para cambiar "retirado" → "disponible"
   - Solo si no pasó mucho tiempo
   - Requiere autorización superior

4. **Exportar historial:**
   - CSV/PDF de lotes retirados
   - Filtros por fecha, producto, motivo
   - Para auditorías externas

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs de auditoría en la BD
2. Verifica permisos del usuario
3. Confirma que el trigger de stock esté activo
4. Consulta este documento para casos de uso

---

**Fecha de Implementación:** 4 de diciembre de 2025  
**Desarrollado por:** GitHub Copilot + Santiago  
**Versión:** 1.0.0
