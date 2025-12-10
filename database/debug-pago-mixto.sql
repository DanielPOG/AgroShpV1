-- Script para depurar el problema del pago mixto
-- Venta problemática: VTA-1765391208151-394

-- 1. Buscar la venta
SELECT 
    v.id,
    v.codigo_venta,
    v.total,
    v.fecha_venta,
    u.nombre as cajero
FROM ventas v
LEFT JOIN usuarios u ON v.usuario_id = u.id
WHERE v.codigo_venta LIKE '%394%'
ORDER BY v.fecha_venta DESC
LIMIT 5;

-- 2. Ver los pagos de esa venta
SELECT 
    pv.id,
    pv.venta_id,
    pv.monto,
    mp.id as metodo_id,
    mp.nombre as metodo_nombre,
    pv.referencia
FROM pagos_venta pv
LEFT JOIN metodos_pago mp ON pv.metodo_pago_id = mp.id
WHERE pv.venta_id IN (
    SELECT id FROM ventas 
    WHERE codigo_venta LIKE '%394%'
    ORDER BY fecha_venta DESC 
    LIMIT 1
);

-- 3. Ver la sesión de caja activa del usuario
SELECT 
    sc.id,
    sc.usuario_id,
    sc.fondo_inicial,
    sc.total_ventas,
    sc.total_ventas_efectivo,
    sc.total_ventas_nequi,
    sc.total_ventas_tarjeta,
    sc.fecha_apertura,
    sc.estado,
    u.nombre as cajero
FROM sesiones_caja sc
LEFT JOIN usuarios u ON sc.usuario_id = u.id
WHERE sc.estado = 'abierta'
ORDER BY sc.fecha_apertura DESC
LIMIT 1;

-- 4. Ver los movimientos de caja de la sesión activa (últimos 10)
SELECT 
    mc.id,
    mc.tipo_movimiento,
    mc.descripcion,
    mc.monto,
    mc.metodo_pago,
    mc.venta_id,
    mc.fecha_hora
FROM movimientos_caja mc
WHERE mc.sesion_caja_id = (
    SELECT id FROM sesiones_caja 
    WHERE estado = 'abierta' 
    ORDER BY fecha_apertura DESC 
    LIMIT 1
)
ORDER BY mc.fecha_hora DESC
LIMIT 10;

-- 5. Verificar si existe el movimiento de la venta problemática
SELECT 
    mc.id,
    mc.tipo_movimiento,
    mc.descripcion,
    mc.monto,
    mc.metodo_pago,
    mc.fecha_hora,
    v.codigo_venta
FROM movimientos_caja mc
LEFT JOIN ventas v ON mc.venta_id = v.id
WHERE v.codigo_venta LIKE '%394%'
ORDER BY mc.fecha_hora DESC;
