-- =====================================================
-- SCRIPT DE LIMPIEZA COMPLETA DE INDICES
-- =====================================================
-- Este script elimina TODOS los indices que Prisma intenta crear
-- para que pueda aplicar la migracion sin conflictos
-- =====================================================

-- Indices de auditoria
DROP INDEX IF EXISTS idx_auditoria_tabla_registro;
DROP INDEX IF EXISTS idx_auditoria_usuario;

-- Indices de clientes
DROP INDEX IF EXISTS idx_clientes_documento;
DROP INDEX IF EXISTS idx_clientes_email;
DROP INDEX IF EXISTS idx_clientes_tipo;

-- Indices de costos
DROP INDEX IF EXISTS idx_costos_producto;
DROP INDEX IF EXISTS idx_costos_lote;
DROP INDEX IF EXISTS idx_costos_fecha;

-- Indices de descuentos
DROP INDEX IF EXISTS idx_descuentos_codigo;
DROP INDEX IF EXISTS idx_descuentos_activo;
DROP INDEX IF EXISTS idx_descuentos_aplicados_venta;

-- Indices de detalle_ventas
DROP INDEX IF EXISTS idx_detalle_ventas_venta;
DROP INDEX IF EXISTS idx_detalle_ventas_producto_lote;

-- Indices de historial_inventario
DROP INDEX IF EXISTS idx_historial_fecha;
DROP INDEX IF EXISTS idx_historial_producto;
DROP INDEX IF EXISTS idx_historial_tipo;
DROP INDEX IF EXISTS idx_historial_referencia;
DROP INDEX IF EXISTS idx_historial_usuario;

-- Indices de lotes
DROP INDEX IF EXISTS idx_lotes_estado;
DROP INDEX IF EXISTS idx_lotes_producto;
DROP INDEX IF EXISTS idx_lotes_vencimiento;
DROP INDEX IF EXISTS idx_lotes_usuario;

-- Indices de movimientos_unidades
DROP INDEX IF EXISTS idx_movimientos_destino;
DROP INDEX IF EXISTS idx_movimientos_fecha;
DROP INDEX IF EXISTS idx_movimientos_origen;

-- Indices de notificaciones
DROP INDEX IF EXISTS idx_notificaciones_fecha;
DROP INDEX IF EXISTS idx_notificaciones_leida;
DROP INDEX IF EXISTS idx_notificaciones_usuario;

-- Indices de pagos_ventas
DROP INDEX IF EXISTS idx_pagos_metodo;
DROP INDEX IF EXISTS idx_pagos_venta;

-- Indices de punto_caja
DROP INDEX IF EXISTS idx_cajas_activa;

-- Indices de sesiones_caja
DROP INDEX IF EXISTS idx_sesiones_caja;
DROP INDEX IF EXISTS idx_sesiones_cajero;
DROP INDEX IF EXISTS idx_sesiones_fecha;
DROP INDEX IF EXISTS idx_sesiones_estado;

-- Indices de movimientos_caja
DROP INDEX IF EXISTS idx_movimientos_caja_sesion;
DROP INDEX IF EXISTS idx_movimientos_caja_tipo;
DROP INDEX IF EXISTS idx_movimientos_caja_fecha;
DROP INDEX IF EXISTS idx_movimientos_caja_venta;
DROP INDEX IF EXISTS idx_movimientos_caja_turno;

-- Indices de retiros_caja
DROP INDEX IF EXISTS idx_retiros_sesion;
DROP INDEX IF EXISTS idx_retiros_estado;
DROP INDEX IF EXISTS idx_retiros_fecha;
DROP INDEX IF EXISTS idx_retiros_turno;

-- Indices de gastos_caja
DROP INDEX IF EXISTS idx_gastos_sesion;
DROP INDEX IF EXISTS idx_gastos_categoria;
DROP INDEX IF EXISTS idx_gastos_fecha;
DROP INDEX IF EXISTS idx_gastos_turno;

-- Indices de arqueos_caja
DROP INDEX IF EXISTS idx_arqueos_sesion;
DROP INDEX IF EXISTS idx_arqueos_tipo;
DROP INDEX IF EXISTS idx_arqueos_fecha;

-- Indices de turnos_caja
DROP INDEX IF EXISTS idx_turnos_caja_sesion;
DROP INDEX IF EXISTS idx_turnos_caja_cajero;
DROP INDEX IF EXISTS idx_turnos_caja_id;
DROP INDEX IF EXISTS idx_turnos_caja_estado;
DROP INDEX IF EXISTS idx_turnos_caja_fecha;
DROP INDEX IF EXISTS idx_turnos_activos;
DROP INDEX IF EXISTS idx_turnos_anterior;

-- Indices de productos
DROP INDEX IF EXISTS idx_productos_activo;
DROP INDEX IF EXISTS idx_productos_categoria;
DROP INDEX IF EXISTS idx_productos_codigo;
DROP INDEX IF EXISTS idx_productos_unidad;

-- Indices de proveedores
DROP INDEX IF EXISTS idx_proveedores_codigo;
DROP INDEX IF EXISTS idx_proveedores_activo;

-- Indices de solicitudes_traslado
DROP INDEX IF EXISTS idx_solicitudes_estado;
DROP INDEX IF EXISTS idx_solicitudes_solicitante;
DROP INDEX IF EXISTS idx_solicitudes_proveedora;
DROP INDEX IF EXISTS idx_solicitudes_fecha;

-- Indices de turnos (tabla antigua)
DROP INDEX IF EXISTS idx_turnos_fecha;
DROP INDEX IF EXISTS idx_turnos_estado;
DROP INDEX IF EXISTS idx_turnos_cajero;

-- Indices de ventas
DROP INDEX IF EXISTS idx_ventas_estado;
DROP INDEX IF EXISTS idx_ventas_fecha;
DROP INDEX IF EXISTS idx_ventas_usuario;
DROP INDEX IF EXISTS idx_ventas_fecha_usuario;
DROP INDEX IF EXISTS idx_ventas_cliente;
DROP INDEX IF EXISTS idx_ventas_turno;

-- Indices de metas_ventas (nuevos)
DROP INDEX IF EXISTS idx_metas_anio;
DROP INDEX IF EXISTS idx_metas_activa;

-- Verificar limpieza
SELECT COUNT(*) as indices_idx_eliminados
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';
