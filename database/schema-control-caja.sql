-- =====================================================
-- AGROSHOP - MÓDULO DE CONTROL DE CAJA Y FLUJO DE EFECTIVO
-- Ejecutar DESPUÉS de schema.sql y schema-mejoras.sql
-- =====================================================
-- Este módulo es CRÍTICO para el control financiero del POS
-- =====================================================

-- =====================================================
-- TABLA: CAJAS (PUNTOS DE VENTA FÍSICOS)
-- =====================================================

CREATE TABLE cajas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(200),
    tipo VARCHAR(20) DEFAULT 'principal', -- 'principal', 'secundaria', 'movil'
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cajas IS 'Cajas registradoras físicas del sistema';

-- Insertar caja principal
INSERT INTO cajas (codigo, nombre, ubicacion, tipo) VALUES
('CAJA-01', 'Caja Principal', 'Tienda AgroShop - Mostrador 1', 'principal'),
('CAJA-02', 'Caja Secundaria', 'Tienda AgroShop - Mostrador 2', 'secundaria');

-- Índices
CREATE INDEX idx_cajas_activa ON cajas(activa);

-- =====================================================
-- TABLA: SESIONES DE CAJA (TURNOS DE TRABAJO)
-- =====================================================

CREATE TABLE sesiones_caja (
    id SERIAL PRIMARY KEY,
    codigo_sesion VARCHAR(50) UNIQUE NOT NULL,
    caja_id INTEGER REFERENCES cajas(id) NOT NULL,
    cajero_id INTEGER REFERENCES usuarios(id) NOT NULL,
    
    -- Apertura
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fondo_inicial DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Efectivo con el que inicia
    observaciones_apertura TEXT,
    
    -- Cierre
    fecha_cierre TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'abierta', -- 'abierta', 'cerrada', 'cuadrada'
    observaciones_cierre TEXT,
    
    -- Totales esperados (del sistema)
    total_ventas_efectivo DECIMAL(10, 2) DEFAULT 0,
    total_ventas_nequi DECIMAL(10, 2) DEFAULT 0,
    total_ventas_tarjeta DECIMAL(10, 2) DEFAULT 0,
    total_ventas_transferencia DECIMAL(10, 2) DEFAULT 0,
    total_ventas DECIMAL(10, 2) DEFAULT 0,
    
    -- Movimientos de efectivo
    total_retiros DECIMAL(10, 2) DEFAULT 0, -- Dinero retirado de caja
    total_ingresos_adicionales DECIMAL(10, 2) DEFAULT 0, -- Ingresos extra
    total_gastos DECIMAL(10, 2) DEFAULT 0, -- Gastos menores
    
    -- Efectivo esperado al cierre
    efectivo_esperado DECIMAL(10, 2) GENERATED ALWAYS AS (
        fondo_inicial + total_ventas_efectivo + total_ingresos_adicionales - total_retiros - total_gastos
    ) STORED,
    
    -- Arqueo (conteo físico)
    efectivo_contado DECIMAL(10, 2),
    diferencia DECIMAL(10, 2), -- Calculado: efectivo_contado - efectivo_esperado
    
    -- Desglose de billetes y monedas (JSONB)
    desglose_efectivo JSONB, -- {"100000": 5, "50000": 10, "20000": 15, ...}
    
    -- Control
    cerrada_por INTEGER REFERENCES usuarios(id),
    cuadrada_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_fondo_positivo CHECK (fondo_inicial >= 0),
    CONSTRAINT chk_estado_sesion CHECK (estado IN ('abierta', 'cerrada', 'cuadrada'))
);

COMMENT ON TABLE sesiones_caja IS 'Sesiones de trabajo de caja (apertura y cierre)';
COMMENT ON COLUMN sesiones_caja.fondo_inicial IS 'Efectivo con el que se inicia el turno';
COMMENT ON COLUMN sesiones_caja.efectivo_esperado IS 'Calculado automáticamente: fondo + ventas + ingresos - retiros - gastos';
COMMENT ON COLUMN sesiones_caja.diferencia IS 'Sobrante (+) o faltante (-) de efectivo';
COMMENT ON COLUMN sesiones_caja.desglose_efectivo IS 'Conteo de billetes y monedas al cierre';

-- Índices
CREATE INDEX idx_sesiones_caja ON sesiones_caja(caja_id);
CREATE INDEX idx_sesiones_cajero ON sesiones_caja(cajero_id);
CREATE INDEX idx_sesiones_fecha ON sesiones_caja(fecha_apertura);
CREATE INDEX idx_sesiones_estado ON sesiones_caja(estado);

-- =====================================================
-- TABLA: MOVIMIENTOS DE CAJA
-- =====================================================

CREATE TABLE movimientos_caja (
    id SERIAL PRIMARY KEY,
    sesion_caja_id INTEGER REFERENCES sesiones_caja(id) ON DELETE CASCADE NOT NULL,
    tipo_movimiento VARCHAR(30) NOT NULL, -- 'venta', 'retiro', 'ingreso', 'gasto', 'apertura', 'cierre'
    
    -- Referencia (si es una venta)
    venta_id INTEGER REFERENCES ventas(id),
    pago_id INTEGER REFERENCES pagos_venta(id),
    
    -- Detalles del movimiento
    metodo_pago VARCHAR(30), -- 'efectivo', 'nequi', 'tarjeta', 'transferencia'
    monto DECIMAL(10, 2) NOT NULL,
    concepto TEXT NOT NULL,
    
    -- Autorización (para retiros/gastos)
    autorizado_por INTEGER REFERENCES usuarios(id),
    requiere_autorizacion BOOLEAN DEFAULT false,
    
    -- Control
    usuario_id INTEGER REFERENCES usuarios(id) NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_tipo_movimiento CHECK (tipo_movimiento IN ('venta', 'retiro', 'ingreso', 'gasto', 'apertura', 'cierre'))
);

COMMENT ON TABLE movimientos_caja IS 'Todos los movimientos de efectivo de la caja';
COMMENT ON COLUMN movimientos_caja.tipo_movimiento IS 'Tipo: venta, retiro, ingreso, gasto, apertura, cierre';
COMMENT ON COLUMN movimientos_caja.requiere_autorizacion IS 'Si el movimiento requirió autorización de supervisor';

-- Índices
CREATE INDEX idx_movimientos_sesion ON movimientos_caja(sesion_caja_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_caja(tipo_movimiento);
CREATE INDEX idx_movimientos_fecha ON movimientos_caja(fecha_movimiento);
CREATE INDEX idx_movimientos_venta ON movimientos_caja(venta_id);

-- =====================================================
-- TABLA: RETIROS DE CAJA
-- =====================================================

CREATE TABLE retiros_caja (
    id SERIAL PRIMARY KEY,
    sesion_caja_id INTEGER REFERENCES sesiones_caja(id) NOT NULL,
    movimiento_caja_id INTEGER REFERENCES movimientos_caja(id),
    
    codigo_retiro VARCHAR(50) UNIQUE NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    motivo TEXT NOT NULL,
    tipo_retiro VARCHAR(30) NOT NULL, -- 'deposito_banco', 'pago_proveedor', 'gasto', 'otro'
    
    -- Autorización
    solicitado_por INTEGER REFERENCES usuarios(id) NOT NULL,
    autorizado_por INTEGER REFERENCES usuarios(id),
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_autorizacion TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'autorizado', 'rechazado', 'completado'
    
    -- Comprobante
    numero_comprobante VARCHAR(100),
    comprobante_url VARCHAR(500),
    
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_monto_retiro_positivo CHECK (monto > 0),
    CONSTRAINT chk_tipo_retiro CHECK (tipo_retiro IN ('deposito_banco', 'pago_proveedor', 'gasto', 'otro')),
    CONSTRAINT chk_estado_retiro CHECK (estado IN ('pendiente', 'autorizado', 'rechazado', 'completado'))
);

COMMENT ON TABLE retiros_caja IS 'Retiros de efectivo de la caja (requieren autorización)';

-- Índices
CREATE INDEX idx_retiros_sesion ON retiros_caja(sesion_caja_id);
CREATE INDEX idx_retiros_estado ON retiros_caja(estado);
CREATE INDEX idx_retiros_fecha ON retiros_caja(fecha_solicitud);

-- =====================================================
-- TABLA: GASTOS MENORES (CAJA CHICA)
-- =====================================================

CREATE TABLE gastos_caja (
    id SERIAL PRIMARY KEY,
    sesion_caja_id INTEGER REFERENCES sesiones_caja(id) NOT NULL,
    movimiento_caja_id INTEGER REFERENCES movimientos_caja(id),
    
    codigo_gasto VARCHAR(50) UNIQUE NOT NULL,
    categoria_gasto VARCHAR(50), -- 'transporte', 'alimentacion', 'servicios', 'limpieza', 'otro'
    monto DECIMAL(10, 2) NOT NULL,
    concepto TEXT NOT NULL,
    
    -- Responsable
    solicitado_por INTEGER REFERENCES usuarios(id) NOT NULL,
    fecha_gasto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Comprobante
    tiene_comprobante BOOLEAN DEFAULT false,
    numero_comprobante VARCHAR(100),
    comprobante_url VARCHAR(500),
    
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_monto_gasto_positivo CHECK (monto > 0)
);

COMMENT ON TABLE gastos_caja IS 'Gastos menores pagados con efectivo de caja chica';

-- Índices
CREATE INDEX idx_gastos_sesion ON gastos_caja(sesion_caja_id);
CREATE INDEX idx_gastos_categoria ON gastos_caja(categoria_gasto);
CREATE INDEX idx_gastos_fecha ON gastos_caja(fecha_gasto);

-- =====================================================
-- TABLA: ARQUEOS DE CAJA (CONTEO FÍSICO)
-- =====================================================

CREATE TABLE arqueos_caja (
    id SERIAL PRIMARY KEY,
    sesion_caja_id INTEGER REFERENCES sesiones_caja(id) NOT NULL,
    
    tipo_arqueo VARCHAR(20) NOT NULL, -- 'cierre', 'intermedio', 'sorpresa'
    fecha_arqueo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Conteo de billetes
    billetes_100000 INTEGER DEFAULT 0,
    billetes_50000 INTEGER DEFAULT 0,
    billetes_20000 INTEGER DEFAULT 0,
    billetes_10000 INTEGER DEFAULT 0,
    billetes_5000 INTEGER DEFAULT 0,
    billetes_2000 INTEGER DEFAULT 0,
    billetes_1000 INTEGER DEFAULT 0,
    
    -- Conteo de monedas
    monedas_1000 INTEGER DEFAULT 0,
    monedas_500 INTEGER DEFAULT 0,
    monedas_200 INTEGER DEFAULT 0,
    monedas_100 INTEGER DEFAULT 0,
    monedas_50 INTEGER DEFAULT 0,
    
    -- Total contado
    total_billetes DECIMAL(10, 2) GENERATED ALWAYS AS (
        (billetes_100000 * 100000) + (billetes_50000 * 50000) + (billetes_20000 * 20000) +
        (billetes_10000 * 10000) + (billetes_5000 * 5000) + (billetes_2000 * 2000) + (billetes_1000 * 1000)
    ) STORED,
    
    total_monedas DECIMAL(10, 2) GENERATED ALWAYS AS (
        (monedas_1000 * 1000) + (monedas_500 * 500) + (monedas_200 * 200) +
        (monedas_100 * 100) + (monedas_50 * 50)
    ) STORED,
    
    total_efectivo DECIMAL(10, 2) GENERATED ALWAYS AS (
        (billetes_100000 * 100000) + (billetes_50000 * 50000) + (billetes_20000 * 20000) +
        (billetes_10000 * 10000) + (billetes_5000 * 5000) + (billetes_2000 * 2000) + (billetes_1000 * 1000) +
        (monedas_1000 * 1000) + (monedas_500 * 500) + (monedas_200 * 200) +
        (monedas_100 * 100) + (monedas_50 * 50)
    ) STORED,
    
    -- Control
    realizado_por INTEGER REFERENCES usuarios(id) NOT NULL,
    supervisado_por INTEGER REFERENCES usuarios(id),
    observaciones TEXT,
    
    CONSTRAINT chk_tipo_arqueo CHECK (tipo_arqueo IN ('cierre', 'intermedio', 'sorpresa'))
);

COMMENT ON TABLE arqueos_caja IS 'Conteo físico de efectivo en caja';
COMMENT ON COLUMN arqueos_caja.tipo_arqueo IS 'cierre: al cerrar turno, intermedio: durante turno, sorpresa: auditoría';

-- Índices
CREATE INDEX idx_arqueos_sesion ON arqueos_caja(sesion_caja_id);
CREATE INDEX idx_arqueos_tipo ON arqueos_caja(tipo_arqueo);
CREATE INDEX idx_arqueos_fecha ON arqueos_caja(fecha_arqueo);

-- =====================================================
-- VISTAS PARA CONTROL DE CAJA
-- =====================================================

-- Vista de sesiones abiertas
CREATE VIEW vista_sesiones_abiertas AS
SELECT 
    sc.id,
    sc.codigo_sesion,
    c.nombre AS caja,
    u.nombre || ' ' || u.apellido AS cajero,
    sc.fecha_apertura,
    sc.fondo_inicial,
    sc.total_ventas,
    sc.efectivo_esperado,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sc.fecha_apertura))/3600 AS horas_abiertas
FROM sesiones_caja sc
JOIN cajas c ON sc.caja_id = c.id
JOIN usuarios u ON sc.cajero_id = u.id
WHERE sc.estado = 'abierta'
ORDER BY sc.fecha_apertura DESC;

-- Vista de cuadre de caja diario
CREATE VIEW vista_cuadre_diario AS
SELECT 
    DATE(sc.fecha_apertura) AS fecha,
    c.nombre AS caja,
    u.nombre || ' ' || u.apellido AS cajero,
    sc.fondo_inicial,
    sc.total_ventas_efectivo,
    sc.total_ventas_nequi,
    sc.total_ventas_tarjeta,
    sc.total_ventas_transferencia,
    sc.total_ventas,
    sc.total_retiros,
    sc.total_ingresos_adicionales,
    sc.total_gastos,
    sc.efectivo_esperado,
    sc.efectivo_contado,
    sc.diferencia,
    CASE 
        WHEN sc.diferencia > 0 THEN 'SOBRANTE'
        WHEN sc.diferencia < 0 THEN 'FALTANTE'
        ELSE 'CUADRADO'
    END AS estado_cuadre,
    sc.estado
FROM sesiones_caja sc
JOIN cajas c ON sc.caja_id = c.id
JOIN usuarios u ON sc.cajero_id = u.id
WHERE sc.estado IN ('cerrada', 'cuadrada')
ORDER BY sc.fecha_apertura DESC;

-- Vista de flujo de caja del día
CREATE VIEW vista_flujo_caja_dia AS
SELECT 
    DATE(mc.fecha_movimiento) AS fecha,
    mc.tipo_movimiento,
    mc.metodo_pago,
    COUNT(*) AS cantidad_movimientos,
    SUM(mc.monto) AS total_monto
FROM movimientos_caja mc
JOIN sesiones_caja sc ON mc.sesion_caja_id = sc.id
GROUP BY DATE(mc.fecha_movimiento), mc.tipo_movimiento, mc.metodo_pago
ORDER BY fecha DESC, tipo_movimiento;

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para registrar venta en movimientos de caja
CREATE OR REPLACE FUNCTION registrar_venta_en_caja()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar cada pago como movimiento de caja
    INSERT INTO movimientos_caja (
        sesion_caja_id,
        tipo_movimiento,
        venta_id,
        pago_id,
        metodo_pago,
        monto,
        concepto,
        usuario_id
    )
    SELECT 
        sc.id,
        'venta',
        NEW.id,
        pv.id,
        mp.nombre,
        pv.monto,
        'Venta ' || NEW.codigo_venta,
        NEW.usuario_id
    FROM pagos_venta pv
    JOIN metodos_pago mp ON pv.metodo_pago_id = mp.id
    JOIN sesiones_caja sc ON sc.cajero_id = NEW.usuario_id 
        AND sc.estado = 'abierta'
        AND sc.caja_id = (SELECT id FROM cajas WHERE activa = true LIMIT 1)
    WHERE pv.venta_id = NEW.id
    ORDER BY sc.fecha_apertura DESC
    LIMIT 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registrar_venta_en_caja
    AFTER INSERT ON ventas
    FOR EACH ROW
    WHEN (NEW.estado = 'completada')
    EXECUTE FUNCTION registrar_venta_en_caja();

-- Función para actualizar totales de sesión
CREATE OR REPLACE FUNCTION actualizar_totales_sesion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sesiones_caja
    SET 
        total_ventas_efectivo = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'venta'
            AND metodo_pago = 'Efectivo'
        ),
        total_ventas_nequi = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'venta'
            AND metodo_pago = 'Nequi'
        ),
        total_ventas_tarjeta = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'venta'
            AND metodo_pago = 'Tarjeta'
        ),
        total_ventas_transferencia = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'venta'
            AND metodo_pago = 'Transferencia'
        ),
        total_ventas = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'venta'
        ),
        total_retiros = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'retiro'
        ),
        total_ingresos_adicionales = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'ingreso'
        ),
        total_gastos = (
            SELECT COALESCE(SUM(monto), 0)
            FROM movimientos_caja
            WHERE sesion_caja_id = NEW.sesion_caja_id
            AND tipo_movimiento = 'gasto'
        )
    WHERE id = NEW.sesion_caja_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_totales_sesion
    AFTER INSERT OR UPDATE ON movimientos_caja
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_totales_sesion();

-- Función para calcular diferencia al cerrar caja
CREATE OR REPLACE FUNCTION calcular_diferencia_cierre()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.efectivo_contado IS NOT NULL AND OLD.efectivo_contado IS DISTINCT FROM NEW.efectivo_contado THEN
        NEW.diferencia := NEW.efectivo_contado - NEW.efectivo_esperado;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_diferencia_cierre
    BEFORE UPDATE ON sesiones_caja
    FOR EACH ROW
    EXECUTE FUNCTION calcular_diferencia_cierre();

-- Función para generar código de sesión automático
CREATE OR REPLACE FUNCTION generar_codigo_sesion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_sesion IS NULL OR NEW.codigo_sesion = '' THEN
        NEW.codigo_sesion := 'SES-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('sesiones_caja_id_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_sesion
    BEFORE INSERT ON sesiones_caja
    FOR EACH ROW
    EXECUTE FUNCTION generar_codigo_sesion();

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON VIEW vista_sesiones_abiertas IS 'Sesiones de caja actualmente abiertas';
COMMENT ON VIEW vista_cuadre_diario IS 'Cuadre de caja diario con diferencias';
COMMENT ON VIEW vista_flujo_caja_dia IS 'Flujo de caja consolidado por día';

-- =====================================================
-- FIN DEL MÓDULO DE CONTROL DE CAJA
-- =====================================================

