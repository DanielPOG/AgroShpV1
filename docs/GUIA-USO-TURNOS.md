# 📖 Guía de Usuario - Sistema de Turnos de Caja

**Versión:** 1.0  
**Fecha:** 14 de diciembre de 2025  
**Sistema:** AgroShop POS

---

## 🎯 ¿Qué es el Sistema de Turnos?

El sistema de turnos permite que **múltiples cajeros trabajen en la misma caja durante el día**, cada uno con su propio registro de ventas y responsabilidad individual sobre el efectivo.

### Conceptos Clave

- **Sesión de Caja**: Contenedor del día completo (ej: 8am - 8pm)
- **Turno**: Período individual de trabajo de un cajero (ej: 4 horas)
- **Relevo**: Cambio de un cajero a otro
- **Mini-Arqueo**: Conteo de efectivo al cerrar turno

---

## 👥 Roles y Permisos

| Acción                          | Cajero                | Supervisor | Admin |
| ------------------------------- | --------------------- | ---------- | ----- |
| Iniciar turno                   | ✅                    | ✅         | ✅    |
| Cerrar propio turno             | ✅                    | ✅         | ✅    |
| Realizar ventas                 | ✅ (solo en su turno) | ✅         | ✅    |
| Ver reportes propios            | ✅                    | ✅         | ✅    |
| Ver reportes de otros           | ❌                    | ✅         | ✅    |
| Suspender/reanudar turno        | ❌                    | ✅         | ✅    |
| Autorizar relevos de emergencia | ❌                    | ✅         | ✅    |

---

## 🚀 Flujo de Trabajo Diario

### 1️⃣ Inicio del Día (Primer Cajero)

**Paso 1:** Admin/Supervisor abre la sesión de caja

- Clic en "Abrir Caja"
- Ingresar fondo inicial (ej: $200,000)
- Confirmar

**Paso 2:** Primer cajero inicia su turno

- Clic en "Iniciar Mi Turno"
- Verificar efectivo inicial (debe coincidir con fondo de sesión)
- Seleccionar tipo: "Inicio de Jornada"
- Confirmar

**Paso 3:** ¡Listo para vender!

- El sistema ahora permite realizar ventas
- Todas las ventas se vinculan automáticamente al turno

---

### 2️⃣ Cambio de Turno (Relevo Normal)

**Cajero saliente:**

1. Clic en "Cerrar Mi Turno"
2. Elegir método de conteo:
   - **Simple**: Ingresar total contado
   - **Detallado**: Contar billetes y monedas uno por uno
3. Sistema muestra:
   - ✅ Efectivo esperado: $520,000
   - 💵 Efectivo contado: $520,500
   - 📊 Diferencia: +$500 (sobrante)
4. Agregar observaciones (opcional)
5. Confirmar cierre

**Cajero entrante:**

1. Clic en "Iniciar Mi Turno"
2. Sistema pre-carga efectivo del turno anterior
3. Verificar que el efectivo físico coincida
4. Seleccionar tipo: "Cambio de Turno"
5. Confirmar

---

### 3️⃣ Cierre del Día (Último Cajero)

**Paso 1:** Último cajero cierra su turno

- Seguir proceso normal de cierre de turno

**Paso 2:** Admin/Supervisor cierra la sesión

- Clic en "Cerrar Sesión de Caja"
- Sistema valida que no haya turnos activos
- Realizar arqueo final consolidado
- Confirmar cierre

---

## 💰 Tipos de Relevo

### 🟢 Inicio de Jornada

- **Cuándo:** Primer turno del día
- **Efectivo inicial:** Del fondo de la sesión
- **Requiere autorización:** No

### 🔵 Cambio de Turno (Normal)

- **Cuándo:** Relevo planeado entre cajeros
- **Efectivo inicial:** Del turno anterior
- **Requiere autorización:** No

### 🟡 Cambio por Descanso

- **Cuándo:** Cajero toma descanso, otro lo reemplaza temporalmente
- **Efectivo inicial:** Del turno anterior
- **Requiere autorización:** No

### 🔴 Relevo de Emergencia

- **Cuándo:** Situación imprevista (enfermedad, urgencia)
- **Efectivo inicial:** Del turno anterior
- **Requiere autorización:** ✅ SÍ (Supervisor/Admin)

---

## 📊 Métodos de Conteo al Cerrar Turno

### Opción 1: Conteo Simple ⚡

**Recomendado para:** Turnos con pocas transacciones o cajeros experimentados

1. Contar todo el efectivo
2. Ingresar total: `520500`
3. Sistema calcula diferencia automáticamente

**Ventajas:**

- Rápido (30 segundos)
- Ideal cuando hay prisa

**Desventajas:**

- No hay registro detallado del desglose

---

### Opción 2: Desglose Detallado 🔍

**Recomendado para:** Turnos con muchas transacciones, arqueos importantes

1. Contar cada denominación:

   - Billetes de $100,000: `3` → $300,000
   - Billetes de $50,000: `2` → $100,000
   - Billetes de $20,000: `5` → $100,000
   - ... (continúa con todas las denominaciones)

2. Sistema calcula total automáticamente: `$520,500`

3. Ver resumen en tiempo real

**Ventajas:**

- Registro completo del desglose
- Facilita auditorías
- Identifica denominaciones faltantes

**Desventajas:**

- Más lento (2-3 minutos)

---

## 🚨 Alertas y Mensajes

### Alertas Verdes ✅

```
✅ Turno cerrado correctamente
✅ Efectivo cuadrado (diferencia: $0)
✅ Relevo exitoso
```

### Alertas Amarillas ⚠️

```
⚠️ Pequeña diferencia detectada: +$200 (sobrante)
⚠️ Turno activo por más de 6 horas
⚠️ Efectivo en caja supera $500,000 - Considere retiro de seguridad
```

### Alertas Rojas 🚫

```
🚫 No tienes un turno activo - Debes iniciar turno para vender
🚫 Diferencia significativa: -$5,000 (faltante)
🚫 No se puede cerrar sesión - Hay 2 turnos activos
🚫 Efectivo insuficiente para dar cambio
```

---

## 📈 Reportes Disponibles

### 1. Resumen de Turno Individual

**Acceso:** Menú → Reportes → Turnos → Resumen

**Incluye:**

- Cajero y duración
- Cantidad y total de ventas
- Desglose por método de pago
- Efectivo esperado vs. contado
- Diferencia (sobrante/faltante)
- Lista de movimientos

---

### 2. Comparativo de Turnos

**Acceso:** Menú → Reportes → Turnos → Comparativo

**Filtros disponibles:**

- Por sesión (ver todos los turnos del día)
- Por rango de fechas
- Por cajero
- Por estado (activo/cerrado)

**Muestra:**

- Tabla con todos los turnos
- Totales y promedios
- Cajero más productivo
- Turnos con diferencias

---

### 3. Estadísticas de Cajero

**Acceso:** Menú → Reportes → Turnos → Estadísticas

**Incluye:**

- Total turnos completados
- Total ventas realizadas
- Promedio de ventas por turno
- Promedio de monto por turno
- Diferencias acumuladas
- Duración promedio de turnos

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si olvido cerrar mi turno?

El sistema permite que un Supervisor cierre tu turno manualmente. Sin embargo, es importante cerrar tu turno al finalizar para mantener la trazabilidad.

### ¿Puedo realizar ventas sin turno activo?

No. El sistema bloqueará las ventas hasta que inicies tu turno. Verás un mensaje: "No tienes un turno activo".

### ¿Qué hago si hay una diferencia grande al cerrar?

1. Volver a contar el efectivo
2. Verificar que todas las ventas estén registradas
3. Revisar si hay retiros o gastos no registrados
4. Documentar en observaciones
5. Notificar a tu supervisor

### ¿Puedo ver las ventas de otros cajeros?

- **Cajeros:** Solo ven sus propias ventas y turnos
- **Supervisores/Admin:** Pueden ver todos los turnos y ventas

### ¿Cómo solicito un retiro de seguridad?

Durante tu turno, si el efectivo supera el límite:

1. Clic en "Retiro de Seguridad"
2. Ingresar monto a retirar
3. Especificar motivo y destino
4. Esperar autorización de Supervisor
5. Una vez aprobado, entregar efectivo al supervisor

---

## 🎓 Mejores Prácticas

### ✅ DO - Hacer

- ✅ Iniciar turno inmediatamente al llegar
- ✅ Contar el efectivo al recibir relevo
- ✅ Registrar observaciones relevantes
- ✅ Cerrar turno antes de irte
- ✅ Verificar que la diferencia sea aceptable (<$500)
- ✅ Solicitar retiros cuando el efectivo sea alto

### ❌ DON'T - No Hacer

- ❌ Compartir turnos entre cajeros
- ❌ Dejar turno abierto al terminar jornada
- ❌ Cerrar turno sin contar efectivo
- ❌ Ignorar diferencias grandes
- ❌ Realizar ventas en el turno de otro cajero

---

## 🆘 Soporte

**¿Necesitas ayuda?**

- 📧 Email: soporte@agroshop.com
- 📞 WhatsApp: +57 300 123 4567
- 🕐 Horario: Lunes a Sábado, 8am - 8pm

---

**Última actualización:** 14 de diciembre de 2025  
**Versión del documento:** 1.0  
**Sistema:** AgroShop POS v2.0
