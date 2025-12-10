# 💳 PAGO MIXTO - Guía de Uso

**Fecha:** 10 de Diciembre 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 ¿Qué es el Pago Mixto?

El **Pago Mixto** permite al cliente dividir el pago de una venta entre **múltiples métodos de pago**. Esto es especialmente útil cuando:

- 💵 El cliente no tiene suficiente efectivo
- 🏦 El cajero no tiene cambio suficiente
- 📱 El cliente quiere usar múltiples tarjetas o apps
- ⚖️ Se busca balance entre efectivo y digital

---

## 🖥️ Interfaz de Usuario

### Selección de Método de Pago

```
┌───────────────────────────────────────────┐
│  Selecciona el método de pago             │
├───────────────────────────────────────────┤
│                                           │
│  ┌──────────┐  ┌──────────┐             │
│  │    $     │  │    📱    │             │
│  │ Efectivo │  │  Nequi   │             │
│  └──────────┘  └──────────┘             │
│                                           │
│  ┌──────────┐  ┌──────────┐             │
│  │    💳    │  │    ⇄     │             │
│  │ Tarjeta  │  │Pago Mixto│  ← NUEVO   │
│  │          │  │Efectivo + │             │
│  │          │  │  Digital  │             │
│  └──────────┘  └──────────┘             │
└───────────────────────────────────────────┘
```

### Formulario de Pago Mixto

```
┌───────────────────────────────────────────┐
│ 💰 Pago Mixto - Divide el pago           │
│ Total a pagar: $11.900                    │
├───────────────────────────────────────────┤
│                                           │
│ $ Efectivo                                │
│ Disponible: $4.000                        │
│ ┌─────────────────────────────────┐      │
│ │ [    $4.000    ]                │      │
│ └─────────────────────────────────┘      │
│                                           │
│ 📱 Nequi                                  │
│ ┌─────────────────────────────────┐      │
│ │ [    $7.900    ]                │      │
│ └─────────────────────────────────┘      │
│                                           │
│ 💳 Tarjeta                                │
│ ┌─────────────────────────────────┐      │
│ │ [     $0       ]                │      │
│ └─────────────────────────────────┘      │
│                                           │
├───────────────────────────────────────────┤
│ Total Pagado:           $11.900 ✓        │
│ Falta:                      $0           │
│ ✓ Pago completo                          │
└───────────────────────────────────────────┘
```

---

## 🎬 Casos de Uso

### **Caso 1: Efectivo Insuficiente para Cambio** 💡

**Escenario:**

```
Efectivo en caja: $4.000
Venta: $11.900
Cliente tiene: Billete de $20.000
Cambio requerido: $8.100 ❌ (No hay suficiente)
```

**Solución con Pago Mixto:**

```
1. Cliente ve alerta: "Efectivo insuficiente para dar cambio"
2. Cajero sugiere: "¿Le parece bien pagar mixto?"
3. Cliente acepta:
   - $4.000 en efectivo (todo el disponible en caja)
   - $7.900 por Nequi
4. Total: $11.900 ✓
5. Cambio: $0 (no requiere cambio)
```

**Resultado:**

- ✅ Venta exitosa
- ✅ Cliente paga completo
- ✅ No se requiere cambio
- ✅ Caja mantiene efectivo

---

### **Caso 2: Cliente sin Suficiente Efectivo** 💵

**Escenario:**

```
Venta: $11.900
Cliente tiene: Solo $5.000 en efectivo
```

**Solución con Pago Mixto:**

```
1. Cliente: "Solo tengo $5.000 en efectivo"
2. Cajero: "Sin problema, puede pagar mixto"
3. Cliente paga:
   - $5.000 en efectivo
   - $6.900 por tarjeta
4. Total: $11.900 ✓
```

**Resultado:**

- ✅ Venta exitosa
- ✅ Cliente usa todo su efectivo
- ✅ Complementa con tarjeta
- ✅ Experiencia positiva

---

### **Caso 3: Distribución Estratégica** ⚖️

**Escenario:**

```
Venta: $50.000
Estrategia: Cliente quiere mantener efectivo
```

**Solución con Pago Mixto:**

```
1. Cliente prefiere no gastar todo el efectivo
2. Decide dividir:
   - $10.000 en efectivo
   - $20.000 por Nequi
   - $20.000 por tarjeta
3. Total: $50.000 ✓
```

**Resultado:**

- ✅ Venta exitosa
- ✅ Cliente mantiene liquidez
- ✅ Distribución entre métodos
- ✅ Flexibilidad máxima

---

## 🔄 Flujo Completo del Sistema

### **1. Cliente Selecciona Productos**

```
Carrito:
- Producto A: $5.000
- Producto B: $6.900
Total: $11.900
```

### **2. Intenta Pago en Efectivo**

```
Cliente paga: $30.000
Cambio requerido: $18.100
Sistema valida: ❌ Solo hay $4.000 en caja
```

### **3. Sistema Muestra Alerta**

```
⚠️ Efectivo insuficiente para dar cambio
Disponible: $4.000
Necesario: $18.100

Sugerencias:
• Solicitar billete más pequeño
• Usar pago exacto ($11.900)
• Cambiar a tarjeta o Nequi
• Usar pago mixto (efectivo + digital) ← RECOMENDADO
```

### **4. Cajero Selecciona Pago Mixto**

```
Click en botón "Pago Mixto"
→ Aparece formulario con 3 campos:
  - Efectivo
  - Nequi
  - Tarjeta
```

### **5. Cajero Ingresa Montos**

```
Efectivo:  $4.000  (máximo disponible)
Nequi:     $7.900  (completar el total)
Tarjeta:   $0      (no usado)
─────────────────
Total:     $11.900 ✓
Falta:     $0
✓ Pago completo
```

### **6. Sistema Valida y Procesa**

```
Backend valida:
✓ Total correcto ($11.900)
✓ Efectivo no excede disponible ($4.000)
✓ Métodos de pago válidos

Crea venta con múltiples pagos:
- Pago 1: Efectivo $4.000 (ID método: 1)
- Pago 2: Nequi $7.900 (ID método: 2)
```

### **7. Genera Factura**

```
╔═══════════════════════════════════╗
║        FACTURA DE VENTA          ║
╟───────────────────────────────────╢
║ Código: VTA-2025-001              ║
║ Total: $11.900                    ║
║                                   ║
║ Método de Pago:                   ║
║ Mixto (Efectivo: $4.000,          ║
║        Nequi: $7.900)             ║
║                                   ║
║ ✓ Pago Completado                 ║
╚═══════════════════════════════════╝
```

### **8. Actualiza Caja**

```
Efectivo anterior: $4.000
Efectivo vendido:  +$4.000
Efectivo nuevo:    $8.000 ✓

(Nequi va a cuenta digital, no afecta efectivo físico)
```

---

## 🛡️ Validaciones Implementadas

### **1. Monto Total Correcto**

```typescript
const totalPagado = mixtoPayments.reduce((sum, p) => sum + p.monto, 0);
if (totalPagado < total) {
  // Botón deshabilitado
  // Muestra "Falta: $X"
}
```

### **2. Efectivo No Excede Disponible**

```typescript
const efectivoMethod = paymentMethods.find((m) => m.nombre === "Efectivo");
const montoPagadoEfectivo =
  mixtoPayments.find((p) => p.metodo_pago_id === efectivoMethod.id)?.monto || 0;

// Si excede, muestra alerta (pero permite proceder si total es correcto)
```

### **3. Al Menos Un Método de Pago**

```typescript
if (mixtoPayments.length === 0) {
  return false; // No puede completar
}
```

### **4. Validación en Backend**

```typescript
// createSale() valida que:
// - Cada método de pago exista en BD
// - Suma de pagos = total de venta
// - Si hay efectivo, no exceda cambio disponible
```

---

## 📊 Registro en Base de Datos

### **Tabla: ventas**

```sql
id | codigo_venta | total   | estado
1  | VTA-2025-001 | 11900.00| completada
```

### **Tabla: pagos_venta**

```sql
id | venta_id | metodo_pago_id | monto   | referencia
1  | 1        | 1 (Efectivo)   | 4000.00 | Pago mixto - Efectivo
2  | 1        | 2 (Nequi)      | 7900.00 | Pago mixto - Nequi
```

### **Consulta de Métodos de Pago por Venta**

```sql
SELECT
  v.codigo_venta,
  v.total,
  mp.nombre as metodo,
  pv.monto,
  pv.referencia
FROM ventas v
INNER JOIN pagos_venta pv ON pv.venta_id = v.id
INNER JOIN metodos_pago mp ON mp.id = pv.metodo_pago_id
WHERE v.id = 1;

Resultado:
VTA-2025-001 | $11.900 | Efectivo | $4.000  | Pago mixto - Efectivo
VTA-2025-001 | $11.900 | Nequi    | $7.900  | Pago mixto - Nequi
```

---

## 💡 Ventajas del Pago Mixto

### **Para el Cliente:**

- ✅ Flexibilidad total en forma de pago
- ✅ No necesita tener todo el efectivo
- ✅ Puede distribuir entre múltiples tarjetas
- ✅ Mantiene control de su liquidez

### **Para el Cajero:**

- ✅ Resuelve problema de cambio insuficiente
- ✅ Reduce necesidad de billetes pequeños
- ✅ Aumenta tasa de conversión de ventas
- ✅ Mejora experiencia del cliente

### **Para el Negocio:**

- ✅ No pierde ventas por falta de cambio
- ✅ Reduce riesgo de efectivo excesivo
- ✅ Mejor balance entre efectivo y digital
- ✅ Mayor satisfacción del cliente

---

## 🎨 Código de Colores

### **Estado del Pago**

- 🟢 **Verde:** Pago completo (`totalPagado >= total`)
- 🟡 **Amarillo:** Falta dinero (`totalPagado < total`)
- 🔴 **Rojo:** Error crítico (raro en pago mixto)

### **Indicador de Efectivo**

```tsx
// En campo de efectivo
{
  efectivoDisponible < 10000 && (
    <span className="text-xs text-red-600">⚠️ Efectivo bajo en caja</span>
  );
}

// Si intenta pagar más efectivo del disponible
{
  montoEfectivo > efectivoDisponible && (
    <span className="text-xs text-yellow-600">
      ⚠️ Excede efectivo disponible
    </span>
  );
}
```

---

## 🧪 Casos de Prueba

### **Test 1: Pago Mixto Balanceado**

```
Input:
  Total: $10.000
  Efectivo: $5.000
  Nequi: $5.000

Expected:
  ✓ Botón habilitado
  ✓ Total Pagado: $10.000
  ✓ Falta: $0
  ✓ Venta exitosa
```

### **Test 2: Pago Incompleto**

```
Input:
  Total: $10.000
  Efectivo: $3.000
  Nequi: $5.000

Expected:
  ✗ Botón deshabilitado
  ✗ Total Pagado: $8.000
  ✗ Falta: $2.000
  ✗ No puede proceder
```

### **Test 3: Solo Un Método (Debería Usar Simple)**

```
Input:
  Total: $10.000
  Efectivo: $10.000
  Nequi: $0
  Tarjeta: $0

Expected:
  ✓ Funciona, pero debería usar pago simple
  💡 UI podría sugerir cambiar a método simple
```

### **Test 4: Tres Métodos Activos**

```
Input:
  Total: $30.000
  Efectivo: $10.000
  Nequi: $10.000
  Tarjeta: $10.000

Expected:
  ✓ Botón habilitado
  ✓ Total Pagado: $30.000
  ✓ Se crean 3 registros en pagos_venta
  ✓ Venta exitosa
```

### **Test 5: Efectivo Excede Disponible (Warning)**

```
Input:
  Efectivo en caja: $4.000
  Total: $10.000
  Efectivo ingresado: $6.000
  Nequi: $4.000

Expected:
  ⚠️ Warning: "Efectivo ingresado excede disponible"
  ✓ Pero permite proceder si total es correcto
  ✓ Backend valida que no requiera cambio
```

---

## 📱 Experiencia de Usuario

### **Flujo Ideal (Happy Path)**

```
1. 🛒 Cliente agrega productos
2. 💰 Click "Completar Venta"
3. ⚠️ Sistema detecta: "Sin cambio disponible"
4. 💡 Cajero: "¿Le parece bien pagar mixto?"
5. 👍 Cliente acepta
6. 📝 Cajero ingresa montos en 3 campos
7. ✅ Sistema valida en tiempo real
8. 🎉 "Pago completo" (verde)
9. 📄 Click "Completar Venta"
10. ✅ Venta exitosa + Factura generada
```

**Tiempo estimado:** 30-45 segundos

### **Indicadores Visuales en Tiempo Real**

```typescript
// Mientras el usuario escribe:
useEffect(() => {
  const totalPagado = mixtoPayments.reduce((sum, p) => sum + p.monto, 0);
  const falta = total - totalPagado;

  // Actualiza UI instantáneamente:
  // - Total Pagado: $X
  // - Falta: $Y
  // - Color del card (verde/amarillo)
  // - Mensaje "Pago completo" o "Falta completar"
}, [mixtoPayments]);
```

---

## 🚀 Integración con Sistema Existente

### **Compatible con:**

- ✅ Sistema de validación de cambio
- ✅ Alertas de efectivo bajo
- ✅ Registro en historial de inventario
- ✅ Actualización de sesión de caja
- ✅ Facturación electrónica
- ✅ Reportes de ventas por método de pago

### **Se integra en:**

- ✅ `checkout-modal.tsx` - UI principal
- ✅ `sales.ts` - Validación de backend
- ✅ `route.ts` - Endpoint de ventas
- ✅ `invoice-modal.tsx` - Muestra métodos en factura

---

## 📋 Checklist de Implementación

- ✅ UI de selección de método mixto
- ✅ Formulario con 3 campos (Efectivo, Nequi, Tarjeta)
- ✅ Indicador de efectivo disponible
- ✅ Cálculo en tiempo real de total pagado
- ✅ Validación de monto completo
- ✅ Habilitación/deshabilitación de botón
- ✅ Preparación de array de pagos
- ✅ Envío correcto al backend
- ✅ Registro múltiple en `pagos_venta`
- ✅ Visualización en factura
- ✅ Sin errores de compilación

---

## 🎓 Capacitación para Cajeros

### **Mensaje para el Equipo:**

> **"El Pago Mixto es tu mejor amigo cuando no tienes cambio"**
>
> 1. Si aparece alerta de "Efectivo insuficiente"
> 2. Pregunta al cliente: "¿Le parece bien pagar parte en efectivo y parte digital?"
> 3. Click en "Pago Mixto"
> 4. Ingresa el efectivo disponible en el campo "Efectivo"
> 5. El cliente completa el resto con Nequi o tarjeta
> 6. Espera que diga "Pago completo" (verde)
> 7. Click "Completar Venta"
> 8. ¡Listo! Venta exitosa sin problemas de cambio

**Ventaja:** Ya no perderás ventas por falta de cambio 🎉

---

**Implementado por:** GitHub Copilot (Claude Sonnet 4.5)  
**Fecha:** 10 de Diciembre 2025  
**Estado:** ✅ Funcional y probado
