# 🧪 PLAN DE TESTING - GESTIÓN DE LOTES
**Fecha:** 2 de Diciembre, 2025  
**Estado:** ✅ 95% Completado - Pendiente Testing

---

## ✅ CHECKLIST DE PRUEBAS

### 1. CREACIÓN DE LOTES

#### Test 1.1: Crear lote para producto perecedero
- [ x] Ir a Inventario
- [ x] Seleccionar un producto perecedero (ej: Yogurt)
- [ x] Click en "Crear Lote"
- [ x] Llenar formulario:
  - Código: YOG-2025-001
  - Cantidad: 50
  - Fecha producción: Hoy
  - Unidad productiva: Lácteos
- [ x] **Verificar:** fecha_vencimiento se calcula automáticamente según dias_vencimiento del producto
- [ x] Guardar
- [ x] **Resultado esperado:** Lote creado con fecha_vencimiento calculada

#### Test 1.2: Crear lote para producto NO perecedero
- [ x] Seleccionar producto no perecedero (ej: Herramienta)
- [ x] Click en "Crear Lote"
- [ x] Llenar formulario (sin fecha vencimiento)
- [ x] **Verificar:** fecha_vencimiento es NULL
- [ x] Guardar
- [ x] **Resultado esperado:** Lote creado sin fecha vencimiento

#### Test 1.3: Validación código único
- [ x] Intentar crear lote con código existente (YOG-2025-001)
- [ x] **Resultado esperado:** Error "El código de lote ya existe"

#### Test 1.4: Validación de fechas
- [x ] Intentar fecha_vencimiento < fecha_produccion
- [ x] **Resultado esperado:** Error de validación

---

### 2. LISTADO Y FILTROS

#### Test 2.1: Ver todos los lotes
- [ x] Ir a Dashboard → Lotes
- [ x] **Verificar:** Se muestran todos los lotes
- [ x] **Verificar:** Estadísticas en cards (Total, Disponibles, Próximos, Vencidos)

#### Test 2.2: Filtro por estado
- [ x] Tab "Disponibles": Solo lotes con estado=disponible
- [ x] Tab "Próximos a Vencer": Solo lotes que vencen en ≤7 días
- [ x] Tab "Vencidos": Solo lotes con fecha_vencimiento < hoy
- [ x] Tab "Retirados": Solo lotes con estado=retirado

#### Test 2.3: Búsqueda por código
- [ x] Buscar "YOG-2025"
- [ x] **Verificar:** Solo muestra lotes que contienen ese texto

#### Test 2.4: Indicador visual de días restantes
- [ x] **Verificar colores:**
  - Verde: >7 días
  - Naranja: 4-7 días (con ⚠️)
  - Rojo: ≤3 días (con ⚠️)
  - Rojo oscuro: Vencido (texto "Vencido hace X días")

---

### 3. VISTA DETALLE DE PRODUCTO

#### Test 3.1: Modal con lotes
- [ x] Desde Inventario, click en un producto con lotes
- [ x] **Verificar sección "Lotes del Producto":**
  - [ x] Grid de estadísticas (6 cards con colores)
  - [ x] Total de lotes
  - [ x] Disponibles (verde)
  - [ x] Próximos a vencer (naranja)
  - [ x] Vencidos (rojo) - solo si hay
  - [ x] Stock en lotes (cantidad total)
- [ x] **Verificar tabla de lotes:**
  - [ x] Se muestran todos los lotes del producto
  - [ x] Sin columna "Producto" (showProductInfo=false)
  - [ x] Dropdown con acciones por lote

#### Test 3.2: Crear lote desde modal
- [ x] Click en "Crear Lote" desde modal de producto
- [ x] **Verificar:** Producto viene preseleccionado
- [ x] Crear lote
- [ x] **Verificar:** Modal se actualiza mostrando nuevo lote

---

### 4. EDICIÓN DE LOTES

#### Test 4.1: Cambiar estado de lote
- [ ] Desde tabla de lotes, click menú ⋮ → "Editar"
- [ ] Cambiar estado de "disponible" a "retirado"
- [ ] Guardar
- [ ] **Verificar:**
  - [ ] Estado actualizado en tabla
  - [ ] Lote aparece en tab "Retirados"
  - [ ] Stock del producto se actualiza (disminuye)

#### Test 4.2: Editar cantidad de lote
- [ ] Editar un lote disponible
- [ ] Cambiar cantidad de 50 a 40
- [ ] Guardar
- [ ] **Verificar:**
  - [ ] Cantidad actualizada en tabla
  - [ ] Stock del producto se actualiza
  - [ ] Historial_inventario registra el ajuste

---

### 5. AJUSTE DE STOCK DE LOTE

#### Test 5.1: Ajustar stock desde lote
- [ ] Desde tabla, click menú ⋮ → "Ajustar Stock"
- [ ] Seleccionar "Salida"
- [ ] Cantidad: -10
- [ ] Motivo: "Venta local"
- [ ] **Verificar:**
  - [ ] Stock del lote disminuye
  - [ ] Stock del producto disminuye
  - [ ] Historial registrado con referencia al lote

---

### 6. ALERTAS Y NOTIFICACIONES

#### Test 6.1: Alerta de lotes próximos a vencer
- [ ] En página de lotes, verificar banner naranja si hay lotes próximos
- [ ] **Texto esperado:** "Atención: X lote(s) próximo(s) a vencer"
- [ ] Click en tab "Próximos a Vencer"
- [ ] **Verificar:** Lista correcta de lotes

#### Test 6.2: Alerta de lotes vencidos
- [ ] Verificar banner rojo si hay lotes vencidos
- [ ] **Texto esperado:** "X lote(s) vencido(s)"
- [ ] **Sugerencia:** "Cambia el estado de estos lotes a 'Retirado'"

---

### 7. INTEGRACIÓN CON HISTORIAL

#### Test 7.1: Historial de producto muestra lotes
- [ ] Ver historial de un producto con lotes
- [ ] **Verificar registro de tipo "entrada":**
  - [ ] observaciones: "Entrada de lote: [codigo_lote]"
  - [ ] referencia_tipo: "lote"
  - [ ] referencia_id: ID del lote
  - [ ] usuario_id: Usuario que creó

---

### 8. PERFORMANCE Y UX

#### Test 8.1: Carga rápida
- [ ] Navegar entre tabs de lotes
- [ ] **Verificar:** Cambio instantáneo (datos ya cargados)

#### Test 8.2: Responsive design
- [ ] Probar en móvil (DevTools)
- [ ] **Verificar:**
  - [ ] Tabla se adapta (scroll horizontal si necesario)
  - [ ] Cards de estadísticas en grid responsive
  - [ ] Botones y textos legibles

#### Test 8.3: Estados de carga
- [ ] Refresh página de lotes
- [ ] **Verificar:** Skeletons mientras carga
- [ ] **Verificar:** Sin flashes de contenido

---

## 📋 CASOS DE USO COMPLETOS

### Caso 1: Producción de Yogurt
1. Crear producto "Yogurt Natural" (perecedero, 30 días vencimiento)
2. Crear lote YOG-001 con 100 unidades, producido hoy
3. **Verificar:** fecha_vencimiento = hoy + 30 días
4. Ver producto en detalle
5. **Verificar:** Estadísticas muestran 1 lote, 100 unidades
6. Ajustar stock: -20 (venta)
7. **Verificar:** Lote ahora tiene 80 unidades
8. Esperar 23 días (simular fecha)
9. **Verificar:** Lote aparece en "Próximos a vencer" (7 días restantes)

### Caso 2: Lote Defectuoso
1. Detectar defecto en lote YOG-001
2. Editar lote, cambiar estado a "retirado"
3. **Verificar:** Stock del producto se reduce automáticamente
4. **Verificar:** Lote ya no aparece en "Disponibles"
5. **Verificar:** Historial registra el cambio

### Caso 3: Control de Múltiples Lotes
1. Producto con 3 lotes:
   - Lote A: 50 unidades, vence en 5 días
   - Lote B: 30 unidades, vence en 15 días
   - Lote C: 20 unidades, vence en 25 días
2. **Verificar en modal producto:**
   - Total: 3 lotes
   - Disponibles: 3
   - Próximos: 1 (Lote A)
   - Stock total: 100 unidades
3. Retirar Lote A
4. **Verificar nueva estadística:**
   - Disponibles: 2
   - Stock total: 50 unidades

---

## 🎯 CRITERIOS DE ÉXITO

- ✅ Todos los tests pasan sin errores
- ✅ Fechas se muestran en horario Colombia (sin desfase)
- ✅ Cálculo automático de vencimiento funciona
- ✅ Estadísticas son precisas
- ✅ Stock se sincroniza correctamente
- ✅ Historial completo y correcto
- ✅ UI responsive y fluida
- ✅ Sin errores en consola

---

## 📝 REPORTE DE BUGS (Si se encuentran)

### Bug #1:
- **Descripción:** 
- **Pasos para reproducir:**
- **Resultado esperado:**
- **Resultado actual:**
- **Severidad:** Alta / Media / Baja

### Bug #2:
- **Descripción:** 
- **Pasos para reproducir:**
- **Resultado esperado:**
- **Resultado actual:**
- **Severidad:** Alta / Media / Baja
