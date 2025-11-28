# 💰 Módulo de Control de Caja y Flujo de Efectivo

## 🎯 ¿Por qué es CRÍTICO este módulo?

Sin control de caja, un negocio puede tener:
- ❌ Pérdidas de dinero sin detectar
- ❌ Robos internos sin evidencia
- ❌ Errores de cambio sin rastreo
- ❌ No saber cuánto dinero real hay en caja
- ❌ Imposible hacer arqueo al final del día
- ❌ No hay responsabilidad individual por cajero

---

## 📊 Flujo Completo de Control de Caja

### 1. **APERTURA DE CAJA** (Inicio del turno)

```
Cajero: Juan Pérez
Hora: 8:00 AM
Fondo Inicial: $200,000 (efectivo para dar cambio)
Estado: ABIERTA

✅ Se crea registro en sesiones_caja
✅ Se registra movimiento de apertura
```

**Qué se registra:**
- ID de caja física (CAJA-01)
- ID del cajero responsable
- Fecha y hora de apertura
- Fondo inicial (efectivo con el que inicia)

---

### 2. **VENTAS DURANTE EL DÍA**

Cada venta genera **movimientos de caja automáticos**:

#### Ejemplo de Venta:

```
Venta VTA-001: $50,000
Método de pago: Efectivo $50,000

Automáticamente se registra:
✅ Movimiento de caja: +$50,000 Efectivo
✅ Actualiza total_ventas_efectivo en sesión
```

#### Venta con Pago Mixto:

```
Venta VTA-002: $150,000
Métodos de pago:
  - Efectivo: $100,000
  - Nequi: $50,000

Automáticamente se registran:
✅ Movimiento 1: +$100,000 Efectivo
✅ Movimiento 2: +$50,000 Nequi
✅ Actualiza totales por método de pago
```

---

### 3. **RETIROS DE CAJA** (Durante el día)

Cuando hay mucho efectivo en caja, se hace un retiro:

```
Motivo: Llevar al banco
Monto: $500,000
Autorizado por: Gerente María López
Hora: 12:00 PM

✅ Se crea registro en retiros_caja
✅ Requiere autorización de supervisor
✅ Se genera comprobante
✅ Se registra movimiento: -$500,000
✅ Actualiza total_retiros en sesión
```

**Tipos de retiros:**
- `deposito_banco` - Llevar dinero al banco
- `pago_proveedor` - Pagar a un proveedor
- `gasto` - Gasto mayor
- `otro` - Otros retiros

---

### 4. **GASTOS MENORES** (Caja chica)

Gastos pequeños pagados con efectivo de caja:

```
Concepto: Transporte de mercancía
Monto: $20,000
Categoría: transporte
Comprobante: Sí

✅ Se crea registro en gastos_caja
✅ Se adjunta comprobante físico/digital
✅ Se registra movimiento: -$20,000
✅ Actualiza total_gastos en sesión
```

---

### 5. **INGRESOS ADICIONALES** (No ventas)

Dinero que entra a caja pero no es venta:

```
Concepto: Devolución de préstamo a empleado
Monto: $50,000

✅ Se registra movimiento: +$50,000
✅ Actualiza total_ingresos_adicionales
```

---

### 6. **CIERRE DE CAJA** (Fin del turno)

#### Paso 1: Cerrar Sesión

```
Hora: 6:00 PM
Cajero: Juan Pérez

Totales del Sistema:
✅ Fondo Inicial: $200,000
✅ Ventas Efectivo: $800,000
✅ Ventas Nequi: $200,000
✅ Ventas Tarjeta: $150,000
✅ Retiros: -$500,000
✅ Gastos: -$20,000
✅ Ingresos adicionales: $50,000

➡️ Efectivo ESPERADO: $530,000
   (200k + 800k - 500k - 20k + 50k)
```

#### Paso 2: Arqueo (Conteo Físico)

El cajero cuenta físicamente todo el efectivo:

```
Billetes de $100,000: 3 = $300,000
Billetes de $50,000: 3 = $150,000
Billetes de $20,000: 2 = $40,000
Billetes de $10,000: 3 = $30,000
Monedas de $1,000: 5 = $5,000
Monedas de $500: 10 = $5,000

➡️ Total CONTADO: $530,000

✅ Se crea registro en arqueos_caja
✅ Desglose completo de billetes y monedas
```

#### Paso 3: Calcular Diferencia

```
Efectivo Esperado: $530,000
Efectivo Contado: $530,000
Diferencia: $0

✅ CAJA CUADRADA ✅

Estado: CUADRADA
```

**Posibles resultados:**

| Situación | Diferencia | Estado | Acción |
|-----------|------------|--------|--------|
| Exacto | $0 | ✅ CUADRADA | OK |
| Sobra | +$5,000 | ⚠️ SOBRANTE | Investigar |
| Falta | -$5,000 | ❌ FALTANTE | Investigar |

---

## 📊 Ejemplo Real de un Día Completo

### Sesión SES-20251128-0001

**Cajero:** Juan Pérez  
**Caja:** CAJA-01  
**Fecha:** 28/11/2025

| Hora | Movimiento | Concepto | Efectivo | Nequi | Tarjeta | Saldo Efectivo |
|------|------------|----------|----------|-------|---------|----------------|
| 08:00 | Apertura | Fondo inicial | +$200,000 | - | - | $200,000 |
| 08:30 | Venta | VTA-001 | +$50,000 | - | - | $250,000 |
| 09:15 | Venta | VTA-002 | +$30,000 | $20,000 | - | $280,000 |
| 10:00 | Venta | VTA-003 | - | - | $100,000 | $280,000 |
| 10:45 | Venta | VTA-004 | +$150,000 | - | - | $430,000 |
| 11:30 | Venta | VTA-005 | +$200,000 | - | - | $630,000 |
| 12:00 | **Retiro** | Llevar al banco | **-$500,000** | - | - | $130,000 |
| 12:30 | Venta | VTA-006 | +$80,000 | - | - | $210,000 |
| 13:00 | Gasto | Transporte | **-$20,000** | - | - | $190,000 |
| 14:00 | Venta | VTA-007 | +$120,000 | - | - | $310,000 |
| 15:00 | Venta | VTA-008 | - | $50,000 | - | $310,000 |
| 16:00 | Venta | VTA-009 | +$170,000 | - | - | $480,000 |
| 17:00 | Ingreso | Devolución préstamo | **+$50,000** | - | - | $530,000 |
| 18:00 | **Arqueo** | Conteo físico | **$530,000** ✅ | - | - | $530,000 |

### Resumen Final:

```
╔══════════════════════════════════════════════════╗
║         CUADRE DE CAJA - SES-20251128-0001       ║
╠══════════════════════════════════════════════════╣
║ Cajero: Juan Pérez                               ║
║ Caja: CAJA-01                                    ║
║ Fecha: 28/11/2025                                ║
╠══════════════════════════════════════════════════╣
║ INGRESOS:                                        ║
║   Fondo Inicial:            $200,000             ║
║   Ventas Efectivo:          $800,000             ║
║   Ventas Nequi:             $70,000              ║
║   Ventas Tarjeta:           $100,000             ║
║   Ingresos Adicionales:     $50,000              ║
║   ─────────────────────────────────              ║
║   TOTAL INGRESOS:           $1,220,000           ║
╠══════════════════════════════════════════════════╣
║ EGRESOS:                                         ║
║   Retiros:                  $500,000             ║
║   Gastos:                   $20,000              ║
║   ─────────────────────────────────              ║
║   TOTAL EGRESOS:            $520,000             ║
╠══════════════════════════════════════════════════╣
║ EFECTIVO ESPERADO:          $530,000             ║
║ EFECTIVO CONTADO:           $530,000             ║
║ DIFERENCIA:                 $0        ✅          ║
╠══════════════════════════════════════════════════╣
║ ESTADO: CUADRADA ✅                               ║
╚══════════════════════════════════════════════════╝
```

---

## 🔍 Reportes y Análisis

### 1. **Reporte de Flujo de Caja Diario**

```sql
SELECT * FROM vista_flujo_caja_dia 
WHERE fecha = CURRENT_DATE;
```

Muestra:
- Ventas por método de pago
- Retiros del día
- Gastos del día
- Ingresos adicionales
- **Total neto de efectivo**

### 2. **Reporte de Sesiones del Día**

```sql
SELECT * FROM vista_cuadre_diario 
WHERE fecha = CURRENT_DATE;
```

Muestra:
- Todas las sesiones abiertas/cerradas
- Diferencias de caja
- Estado de cuadre
- Identificar faltantes/sobrantes

### 3. **Sesiones Abiertas (Alertas)**

```sql
SELECT * FROM vista_sesiones_abiertas;
```

Muestra:
- Cajas actualmente abiertas
- Tiempo que llevan abiertas
- Efectivo esperado actual
- **Alertar si hay sesiones muy antiguas**

---

## ⚠️ Alertas y Seguridad

### Alertas Automáticas:

1. **Sesión abierta > 12 horas**
   - "⚠️ Sesión SES-001 abierta hace 15 horas"
   
2. **Diferencia de caja > $10,000**
   - "❌ Faltante de $15,000 en sesión SES-001"
   
3. **Retiro sin autorización**
   - "🚫 Retiro de $200,000 sin autorizar"
   
4. **Múltiples gastos sin comprobante**
   - "⚠️ 5 gastos sin comprobante esta semana"

---

## 🎯 Beneficios del Control de Caja

### Para el Negocio:
✅ **Control total** de efectivo en tiempo real
✅ **Detectar pérdidas** inmediatamente
✅ **Prevenir robos** con auditoría completa
✅ **Responsabilidad individual** por cajero
✅ **Cuadre diario** exacto
✅ **Reportes financieros** precisos

### Para los Cajeros:
✅ **Protección** con registro de todo
✅ **Transparencia** en su turno
✅ **Evidencia** si hay problemas
✅ **Proceso claro** de apertura/cierre

### Para Gerencia:
✅ **Visibilidad** de operación diaria
✅ **Detectar patrones** de faltantes
✅ **Auditoría completa** de cada peso
✅ **Análisis de flujo de caja** real
✅ **Toma de decisiones** con datos reales

---

## 📋 Checklist de Implementación

### Configuración Inicial:
- [ ] Ejecutar `schema-control-caja.sql`
- [ ] Registrar cajas físicas
- [ ] Capacitar cajeros en procedimiento

### Procedimiento Diario:
- [ ] Abrir caja con fondo inicial
- [ ] Registrar todas las ventas (automático)
- [ ] Autorizar retiros cuando sea necesario
- [ ] Registrar gastos menores
- [ ] Hacer arqueo al cierre
- [ ] Comparar contado vs esperado
- [ ] Investigar diferencias > $5,000

### Supervisión:
- [ ] Revisar cuadres diarios
- [ ] Autorizar retiros grandes
- [ ] Analizar tendencias de faltantes
- [ ] Auditar gastos menores

---

## 🚀 Integración con el Sistema

El módulo se integra automáticamente con:

1. **Ventas**: Cada venta registra movimiento de caja
2. **Usuarios**: Cada cajero tiene su sesión
3. **Reportes**: Flujo de caja en dashboard
4. **Notificaciones**: Alertas de diferencias

**¡Con este módulo, cada peso está controlado!** 💰

---

**Desarrollado para AgroShop SENA - Control Total de Caja** ✅

