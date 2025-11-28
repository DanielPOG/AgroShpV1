# 🗄️ Estructura Visual de la Base de Datos AgroShop

## 📊 Diagrama de Relaciones Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SISTEMA AGROSHOP - BASE DE DATOS                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULO 1: USUARIOS Y AUTENTICACIÓN                                  │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   ROLES     │
    │  (4 roles)  │
    └──────┬──────┘
           │
           │ rol_id
           ▼
    ┌─────────────────┐
    │   USUARIOS      │
    │  - id           │
    │  - nombre       │
    │  - email        │
    │  - password_hash│
    │  - rol_id       │
    │  - activo       │
    └─────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULO 2: PRODUCTOS E INVENTARIO                                    │
└──────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   CATEGORIAS     │
    │  (8 categorías)  │
    └────────┬─────────┘
             │
             │ categoria_id
             ▼
    ┌──────────────────────────┐         ┌────────────────────┐
    │      PRODUCTOS           │◄────────│  PROVEEDORES 🆕    │
    │  - id                    │         │  (futuro)          │
    │  - codigo (barcode)      │         └────────────────────┘
    │  - nombre                │
    │  - precio_unitario       │         ┌────────────────────┐
    │  - stock_actual          │◄────────│  UNIDADES          │
    │  - stock_minimo          │         │  PRODUCTIVAS       │
    │  - es_perecedero         │         │  (6 unidades)      │
    │  - categoria_id          │         └────────────────────┘
    │  - unidad_productiva_id  │
    │  - proveedor_id 🆕       │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │   LOTES_PRODUCTOS        │
    │  (productos perecederos) │
    │  - codigo_lote           │
    │  - fecha_produccion      │
    │  - fecha_vencimiento     │
    │  - cantidad              │
    │  - estado                │
    └──────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULO 3: VENTAS Y PUNTO DE VENTA (POS)                            │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  CLIENTES 🆕    │
    │  - tipo_cliente │
    │  - nombre       │
    │  - email        │
    │  - telefono     │
    │  - tipo_doc     │
    └────────┬────────┘
             │
             │ cliente_id
             ▼
    ┌──────────────────────────┐
    │      VENTAS              │
    │  - codigo_venta          │
    │  - fecha_venta           │
    │  - subtotal              │
    │  - impuesto (IVA 19%)    │
    │  - descuento 🆕          │
    │  - total                 │
    │  - cliente_id 🆕         │
    │  - usuario_id (cajero)   │
    │  - requiere_factura      │
    └──────┬────────────┬──────┘
           │            │
           │            │
           ▼            ▼
    ┌─────────────┐  ┌───────────────────┐
    │  DETALLE_   │  │   PAGOS_VENTA     │
    │  VENTAS     │  │  (múltiples)      │
    │  - producto │  │  - metodo_pago_id │
    │  - cantidad │  │  - monto          │
    │  - precio   │  │  - referencia     │
    └─────────────┘  └─────────┬─────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │  METODOS_PAGO   │
                      │  - Efectivo     │
                      │  - Nequi        │
                      │  - Tarjeta      │
                      │  - Transferencia│
                      └─────────────────┘

    ┌─────────────────────────┐
    │  DESCUENTOS 🆕          │
    │  - codigo               │
    │  - tipo (%, monto, qty) │
    │  - valor                │
    │  - condiciones          │
    └────────┬────────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │  DESCUENTOS_APLICADOS 🆕│
    │  - venta_id             │
    │  - descuento_id         │
    │  - monto_descuento      │
    └─────────────────────────┘

    ┌─────────────────────────┐
    │  TURNOS 🆕              │
    │  (gestión de cola POS)  │
    │  - numero_turno         │
    │  - cliente_id           │
    │  - cajero_id            │
    │  - estado               │
    └─────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULO 4: MOVIMIENTOS Y TRANSFERENCIAS                             │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────┐
    │  UNIDADES_PRODUCTIVAS       │
    │  - id                       │
    │  - nombre                   │
    │  - codigo                   │
    └──┬───────────────────────┬──┘
       │                       │
       │ origen_id             │ destino_id
       ▼                       ▼
    ┌──────────────────────────────────┐
    │  MOVIMIENTOS_UNIDADES            │
    │  - codigo_movimiento             │
    │  - unidad_origen_id              │
    │  - unidad_destino_id             │
    │  - usuario_id                    │
    │  - fecha_movimiento              │
    │  - estado                        │
    └────────┬─────────────────────────┘
             │
             ▼
    ┌──────────────────────┐
    │  DETALLE_MOVIMIENTOS │
    │  - producto_id       │
    │  - lote_id           │
    │  - cantidad          │
    └──────────────────────┘

    ┌─────────────────────────────────────┐
    │  SOLICITUDES_TRANSFERENCIA 🆕       │
    │  (workflow de aprobación)           │
    │  - codigo_solicitud                 │
    │  - unidad_solicitante_id            │
    │  - unidad_proveedora_id             │
    │  - estado (pendiente/aprobada)      │
    │  - usuario_solicitante_id           │
    └────────┬────────────────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │  DETALLE_SOLICITUDES 🆕  │
    │  - producto_id           │
    │  - cantidad_solicitada   │
    │  - cantidad_aprobada     │
    └──────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULO 5: AUDITORÍA Y CONTROL                                      │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────┐
    │  HISTORIAL_INVENTARIO       │
    │  (automático con triggers)  │
    │  - producto_id              │
    │  - tipo_movimiento          │
    │  - cantidad_anterior        │
    │  - cantidad_movimiento      │
    │  - cantidad_nueva           │
    │  - usuario_id               │
    │  - referencia (venta/mov)   │
    └─────────────────────────────┘

    ┌─────────────────────────────┐
    │  AUDITORIA 🆕               │
    │  (registro completo)        │
    │  - tabla                    │
    │  - registro_id              │
    │  - accion (INSERT/UPDATE)   │
    │  - usuario_id               │
    │  - datos_anteriores (JSON)  │
    │  - datos_nuevos (JSON)      │
    │  - ip_address               │
    │  - fecha                    │
    └─────────────────────────────┘

    ┌─────────────────────────────┐
    │  NOTIFICACIONES             │
    │  - tipo                     │
    │  - titulo                   │
    │  - mensaje                  │
    │  - prioridad                │
    │  - leida                    │
    │  - usuario_id               │
    └─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULO 6: COSTOS Y RENTABILIDAD 🆕                                  │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────┐
    │  COSTOS_PRODUCCION 🆕               │
    │  - producto_id                      │
    │  - lote_id                          │
    │  - costo_materia_prima              │
    │  - costo_mano_obra                  │
    │  - costo_insumos                    │
    │  - costo_energia                    │
    │  - otros_costos                     │
    │  - costo_total (calculado)          │
    │  - cantidad_producida               │
    │  - costo_unitario (calculado)       │
    └─────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULO 7: CONFIGURACIÓN DEL SISTEMA                                │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────┐
    │  CONFIGURACION              │
    │  - clave                    │
    │  - valor                    │
    │  - tipo                     │
    │  - descripcion              │
    │                             │
    │  Configuraciones:           │
    │  • IVA (19%)                │
    │  • Stock bajo (10)          │
    │  • Alerta vencimiento (7d)  │
    │  • Nombre tienda            │
    │  • Email/Teléfono           │
    └─────────────────────────────┘
```

---

## 📊 Vistas SQL Optimizadas

### Vista 1: `vista_productos_completa`
Combina productos con categorías, unidades productivas y estado de stock.

```sql
SELECT 
  p.id, p.codigo, p.nombre, p.precio_unitario, p.stock_actual,
  c.nombre AS categoria, c.color AS categoria_color,
  up.nombre AS unidad_productiva,
  CASE 
    WHEN p.stock_actual = 0 THEN 'agotado'
    WHEN p.stock_actual <= p.stock_minimo THEN 'bajo_stock'
    ELSE 'disponible'
  END AS estado_stock
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN unidades_productivas up ON p.unidad_productiva_id = up.id;
```

### Vista 2: `vista_ventas_diarias`
Resumen de ventas por día.

```sql
SELECT 
  DATE(fecha_venta) AS fecha,
  COUNT(*) AS total_ventas,
  SUM(total) AS monto_total,
  AVG(total) AS ticket_promedio
FROM ventas
WHERE estado = 'completada'
GROUP BY DATE(fecha_venta);
```

### Vista 3: `vista_productos_vencimiento`
Productos próximos a vencer (ordenados por fecha).

```sql
SELECT 
  p.id, p.codigo, p.nombre,
  l.codigo_lote, l.cantidad,
  l.fecha_vencimiento,
  l.fecha_vencimiento - CURRENT_DATE AS dias_restantes
FROM lotes_productos l
JOIN productos p ON l.producto_id = p.id
WHERE l.estado = 'disponible'
  AND l.fecha_vencimiento IS NOT NULL
  AND l.fecha_vencimiento > CURRENT_DATE
ORDER BY l.fecha_vencimiento ASC;
```

### Vista 4: `vista_rentabilidad_productos` 🆕
Análisis de rentabilidad por producto.

```sql
SELECT 
  p.id, p.codigo, p.nombre,
  p.precio_unitario,
  AVG(cp.costo_unitario) AS costo_promedio,
  p.precio_unitario - AVG(cp.costo_unitario) AS margen_bruto,
  ((p.precio_unitario - AVG(cp.costo_unitario)) / AVG(cp.costo_unitario)) * 100 AS margen_porcentaje
FROM productos p
LEFT JOIN costos_produccion cp ON p.id = cp.producto_id
GROUP BY p.id, p.codigo, p.nombre, p.precio_unitario;
```

### Vista 5: `vista_clientes_frecuentes` 🆕
Clientes ordenados por total de compras.

```sql
SELECT 
  c.id, c.nombre, c.apellido, c.email,
  c.total_compras,
  COUNT(v.id) AS total_transacciones,
  c.ultima_compra,
  CASE 
    WHEN c.ultima_compra >= CURRENT_DATE - INTERVAL '30 days' THEN 'activo'
    WHEN c.ultima_compra >= CURRENT_DATE - INTERVAL '90 days' THEN 'regular'
    ELSE 'inactivo'
  END AS estado_cliente
FROM clientes c
LEFT JOIN ventas v ON c.id = v.cliente_id
GROUP BY c.id
ORDER BY c.total_compras DESC;
```

### Vista 6: `vista_solicitudes_pendientes` 🆕
Solicitudes de transferencia pendientes de aprobación.

```sql
SELECT 
  st.id, st.codigo_solicitud,
  up_sol.nombre AS unidad_solicitante,
  up_prov.nombre AS unidad_proveedora,
  u.nombre || ' ' || u.apellido AS solicitante,
  st.fecha_solicitud,
  COUNT(ds.id) AS total_productos,
  SUM(ds.cantidad_solicitada) AS cantidad_total
FROM solicitudes_transferencia st
JOIN unidades_productivas up_sol ON st.unidad_solicitante_id = up_sol.id
JOIN unidades_productivas up_prov ON st.unidad_proveedora_id = up_prov.id
JOIN usuarios u ON st.usuario_solicitante_id = u.id
LEFT JOIN detalle_solicitudes ds ON st.id = ds.solicitud_id
WHERE st.estado = 'pendiente'
GROUP BY st.id, up_sol.nombre, up_prov.nombre, u.nombre, u.apellido
ORDER BY st.fecha_solicitud ASC;
```

---

## ⚙️ Triggers Automáticos

### 1. `trigger_usuarios_updated_at`
Actualiza `updated_at` automáticamente en tabla `usuarios`.

### 2. `trigger_productos_updated_at`
Actualiza `updated_at` automáticamente en tabla `productos`.

### 3. `trigger_inventario_cambio`
Registra en `historial_inventario` cada vez que cambia el stock de un producto.

### 4. `trigger_generar_codigo_producto`
Genera código automático (PROD-000001) si no se proporciona al crear producto.

### 5. `trigger_actualizar_compras_cliente` 🆕
Actualiza `total_compras` y `ultima_compra` del cliente automáticamente.

### 6. `trigger_validar_stock_venta` 🆕
Valida que haya stock suficiente ANTES de insertar en `detalle_ventas`.

### 7. `trigger_actualizar_stock_venta` 🆕
Actualiza stock automáticamente DESPUÉS de insertar en `detalle_ventas`.

### 8. `trigger_generar_numero_turno` 🆕
Genera número de turno automático (1, 2, 3...) por día en POS.

---

## 📈 Estadísticas de la Base de Datos

| Componente | Cantidad | Descripción |
|------------|----------|-------------|
| **Tablas** | 24 | Tablas principales |
| **Vistas** | 6 | Consultas SQL optimizadas |
| **Funciones** | 8 | Funciones PL/pgSQL |
| **Triggers** | 10+ | Automatización |
| **Índices** | 40+ | Optimización de consultas |
| **Constraints** | 20+ | Validaciones de integridad |

### Desglose por Módulo

| Módulo | Tablas | Funcionalidades |
|--------|--------|-----------------|
| **Usuarios** | 2 | Autenticación, roles |
| **Productos** | 6 | CRUD, lotes, proveedores |
| **Ventas** | 9 | POS, múltiples pagos, clientes, descuentos, turnos |
| **Movimientos** | 4 | Transferencias, solicitudes |
| **Auditoría** | 3 | Historial, auditoría completa, notificaciones |
| **Sistema** | 1 | Configuración |

---

## 🎯 Datos Iniciales (Seeds)

### Roles (4)
- Admin
- Inventarista
- Cajero
- Consulta

### Categorías (8)
- Hortalizas
- Lácteos
- Panadería
- Cárnicos
- Huevos
- Frutas
- Insumos
- Otros

### Unidades Productivas (6)
- UP-HUERTA (Huerta Orgánica)
- UP-BOVINOS (Granja Bovina)
- UP-AVICOLA (Granja Avícola)
- UP-PORCINOS (Granja Porcina)
- UP-PANADERIA (Panadería SENA)
- UP-LACTEOS (Planta de Lácteos)

### Métodos de Pago (4)
- Efectivo
- Nequi
- Tarjeta
- Transferencia

### Descuentos (3) 🆕
- APRENDIZ10 (10% para aprendices)
- EMPLEADO15 (15% para empleados)
- MAYORISTA (5% sobre $100,000)

### Clientes (2) 🆕
- Cliente General (ocasional)
- SENA Regional (institucional)

---

## 🔍 Explorar la Base de Datos

### Opción 1: Prisma Studio (Recomendado)

```bash
npx prisma studio
```

Abre: `http://localhost:5555`

- ✅ Interfaz gráfica intuitiva
- ✅ Editar datos directamente
- ✅ Ver relaciones
- ✅ Filtrar y buscar

### Opción 2: pgAdmin

1. Abrir pgAdmin
2. Conectar a `localhost`
3. Seleccionar base de datos `AgroShop`
4. Ver tablas en: Schemas → public → Tables

### Opción 3: Línea de Comandos

```bash
# Conectar a la BD
psql -U postgres -d AgroShop

# Ver todas las tablas
\dt

# Ver estructura de una tabla
\d productos

# Query de ejemplo
SELECT * FROM productos LIMIT 10;
```

---

## 🚀 ¡Base de Datos Lista!

Tu base de datos está completamente configurada y lista para usarse. Ahora puedes:

1. ✅ **Ver los datos** con `npx prisma studio`
2. ✅ **Iniciar desarrollo** con `npm run dev`
3. ✅ **Continuar Fase 1** - Autenticación con NextAuth

---

**Documentación adicional:**
- Ver `RESUMEN-ANALISIS-COMPLETO.md` para el plan completo
- Ver `implementacionPLan.md` para las 17 fases detalladas
- Ver `CONFIGURACION_CREDENCIALES.md` para las credenciales

🎉 **¡Todo está listo para comenzar a construir!**

