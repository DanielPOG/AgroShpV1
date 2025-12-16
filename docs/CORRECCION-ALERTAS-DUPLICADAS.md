# 🔔 CORRECCIÓN: Sistema de Alertas - Duplicados al Reiniciar

## 🐛 Problema Identificado

Cuando se borraba el caché de Next.js (`.next`) o se reiniciaba el servidor:

- Las alertas se duplicaban aunque el usuario ya las hubiera leído
- El sistema creaba alertas nuevas para los mismos problemas (stock bajo, lotes próximos a vencer)
- Las notificaciones "fantasma" aparecían como nuevas cada vez

## 🔍 Causa Raíz

El código original solo verificaba alertas **NO LEÍDAS** (`leida: false`):

```typescript
// ❌ CÓDIGO ANTERIOR (PROBLEMÁTICO)
const alertaExistente = await prisma.notificaciones.findFirst({
  where: {
    tipo: tipoAlerta,
    referencia_id: producto.id,
    referencia_tipo: "producto",
    leida: false, // ❌ Solo busca no leídas
  },
});
```

**Flujo del problema:**

1. Usuario ve alerta de "Stock bajo: Tomate"
2. Usuario marca como leída ✅
3. Se borra `.next` o reinicia servidor
4. Sistema verifica: "¿Hay alerta NO LEÍDA?" → NO
5. Sistema crea nueva alerta ❌ (duplicado)
6. Usuario ve la misma alerta de nuevo 😡

## ✅ Solución Implementada

### 1. Verificación de 24 Horas

Ahora el sistema verifica si existe **cualquier alerta** (leída o no) creada en las últimas 24 horas:

```typescript
// ✅ CÓDIGO CORREGIDO
const hace24Horas = new Date();
hace24Horas.setHours(hace24Horas.getHours() - 24);

const alertaExistente = await prisma.notificaciones.findFirst({
  where: {
    tipo: tipoAlerta,
    referencia_id: producto.id,
    referencia_tipo: "producto",
    created_at: {
      gte: hace24Horas, // ✅ Busca alertas creadas en las últimas 24 horas (leídas o no)
    },
  },
});
```

### 2. Lógica de Actualización

```typescript
if (!alertaExistente) {
  // No existe alerta reciente → Crear nueva
  await prisma.notificaciones.create({ ... })

} else if (!alertaExistente.leida) {
  // Existe alerta NO LEÍDA → Actualizar mensaje y timestamp
  await prisma.notificaciones.update({
    where: { id: alertaExistente.id },
    data: {
      mensaje, // Stock actualizado
      created_at: new Date() // Renovar timestamp
    }
  })

} else {
  // Existe alerta LEÍDA (últimas 24h) → No hacer nada
  console.log(`⏭️ Alerta ya fue leída recientemente`)
}
```

## 🎯 Beneficios

✅ **No más duplicados**: Si el usuario leyó la alerta, no se crea otra por 24 horas  
✅ **Alertas frescas**: Después de 24 horas, se puede crear nueva alerta si el problema persiste  
✅ **Actualización inteligente**: Si la alerta NO está leída, se actualiza en lugar de duplicar  
✅ **Funciona tras reinicio**: Borrar `.next` no afecta las alertas ya procesadas

## 🧹 Script de Limpieza

Para limpiar alertas duplicadas existentes:

### Opción 1: PowerShell

```powershell
.\limpiar-alertas.ps1
```

### Opción 2: Manual

```bash
npx ts-node scripts/limpiar-alertas-duplicadas.ts
```

El script:

- Agrupa alertas por tipo + referencia
- Mantiene solo la más reciente de cada grupo
- Elimina todas las duplicadas
- Muestra reporte detallado

## 📋 Archivos Modificados

1. **lib/db/alertas.ts**

   - `checkStockBajo()`: Agregada verificación de 24 horas
   - `checkLotesProximosVencer()`: Agregada verificación de 24 horas

2. **scripts/limpiar-alertas-duplicadas.ts** (NUEVO)

   - Script Node.js para limpiar duplicados

3. **limpiar-alertas.ps1** (NUEVO)
   - Script PowerShell wrapper

## 🧪 Testing

### Probar el fix:

1. **Verificar alertas existentes:**

   ```bash
   npm run dev
   # Ir a /dashboard → Ver notificaciones
   ```

2. **Marcar como leídas:**

   - Marcar todas las alertas como leídas

3. **Reiniciar servidor:**

   ```bash
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

4. **Verificar:** Las alertas NO deben reaparecer ✅

### Probar creación después de 24h:

```typescript
// En consola del navegador o script de test
const hace25Horas = new Date();
hace25Horas.setHours(hace25Horas.getHours() - 25);

// Actualizar timestamp de alerta manualmente
await fetch("/api/test/update-alert-timestamp", {
  method: "POST",
  body: JSON.stringify({ created_at: hace25Horas }),
});

// Recargar → Debería crear nueva alerta
```

## 📊 Comportamiento Esperado

| Situación         | Alerta Existe | Estado Alerta | Acción                 |
| ----------------- | ------------- | ------------- | ---------------------- |
| Primera detección | ❌ No         | -             | ✅ Crear nueva         |
| Reinicio servidor | ✅ Sí (< 24h) | 📬 No leída   | 🔄 Actualizar          |
| Reinicio servidor | ✅ Sí (< 24h) | 📖 Leída      | ⏭️ Ignorar             |
| Reinicio servidor | ✅ Sí (> 24h) | 📖 Leída      | ✅ Crear nueva         |
| Problema resuelto | ✅ Sí         | Cualquiera    | 🗑️ Eliminar (limpieza) |

## ⚙️ Configuración

El período de 24 horas está hardcodeado, pero se puede parametrizar:

```typescript
// lib/db/alertas.ts
const HORAS_COOLDOWN_ALERTA = 24; // Cambiar aquí

const haceCooldown = new Date();
haceCooldown.setHours(haceCooldown.getHours() - HORAS_COOLDOWN_ALERTA);
```

## 🔄 Integración con Limpieza Automática

La función `limpiarAlertasResueltas()` ya elimina alertas cuando:

- Stock vuelve a niveles normales
- Lote ya no está disponible
- Producto desactivado

Estas alertas se **eliminan** (no solo se marcan como leídas), permitiendo crear nuevas si el problema vuelve a ocurrir.

## 📝 Notas Adicionales

- ✅ La corrección es **retrocompatible**
- ✅ No afecta alertas existentes (usar script de limpieza)
- ✅ Funciona para stock bajo, stock agotado, stock exceso y lotes
- ✅ Logs informativos en consola del servidor
- ✅ Sin cambios en base de datos ni migraciones necesarias

## 🚀 Próximos Pasos (Opcional)

1. **Parametrizar cooldown**: Mover 24 horas a `configuracion` tabla
2. **Dashboard de alertas**: Panel para administrar alertas manualmente
3. **Historial**: Guardar historial de alertas eliminadas
4. **Notificaciones push**: Integrar con WebSockets para alertas en tiempo real
