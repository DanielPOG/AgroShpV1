-- =====================================================
-- TRIGGER DE AUDITORÍA PARA LOTES
-- =====================================================
-- Este trigger registra todos los cambios en la tabla lotes_productos
-- en la tabla auditoria para trazabilidad completa

-- Función para auditar cambios en lotes_productos
CREATE OR REPLACE FUNCTION auditar_lotes_productos()
RETURNS TRIGGER AS $$
DECLARE
    v_accion VARCHAR(20);
    v_datos_anteriores JSONB;
    v_datos_nuevos JSONB;
BEGIN
    -- Determinar el tipo de acción
    IF (TG_OP = 'INSERT') THEN
        v_accion := 'INSERT';
        v_datos_anteriores := NULL;
        v_datos_nuevos := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_accion := 'UPDATE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_accion := 'DELETE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := NULL;
    END IF;

    -- Insertar registro de auditoría
    INSERT INTO auditoria (
        tabla,
        registro_id,
        accion,
        datos_anteriores,
        datos_nuevos,
        fecha
    ) VALUES (
        'lotes_productos',
        COALESCE(NEW.id, OLD.id),
        v_accion,
        v_datos_anteriores,
        v_datos_nuevos,
        NOW()
    );

    -- Retornar el registro apropiado según la operación
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para INSERT, UPDATE y DELETE
DROP TRIGGER IF EXISTS trigger_auditoria_lotes_productos ON lotes_productos;

CREATE TRIGGER trigger_auditoria_lotes_productos
    AFTER INSERT OR UPDATE OR DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION auditar_lotes_productos();

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION auditar_lotes_productos() IS 'Función para registrar cambios en lotes_productos en la tabla auditoria';
COMMENT ON TRIGGER trigger_auditoria_lotes_productos ON lotes_productos IS 'Registra automáticamente INSERT, UPDATE y DELETE en auditoria';

-- =====================================================
-- CONSULTAS DE EJEMPLO PARA VERIFICAR
-- =====================================================

-- Ver auditoría de un lote específico
-- SELECT * FROM auditoria WHERE tabla = 'lotes_productos' AND registro_id = 1 ORDER BY fecha DESC;

-- Ver todos los cambios de estado de lotes
-- SELECT 
--     registro_id,
--     accion,
--     datos_anteriores->>'estado' as estado_anterior,
--     datos_nuevos->>'estado' as estado_nuevo,
--     fecha
-- FROM auditoria 
-- WHERE tabla = 'lotes_productos' 
--   AND accion = 'UPDATE'
--   AND datos_anteriores->>'estado' != datos_nuevos->>'estado'
-- ORDER BY fecha DESC;

-- Ver últimos 10 cambios en lotes
-- SELECT 
--     registro_id,
--     accion,
--     datos_nuevos->>'codigo_lote' as codigo_lote,
--     datos_nuevos->>'estado' as estado,
--     fecha
-- FROM auditoria 
-- WHERE tabla = 'lotes_productos'
-- ORDER BY fecha DESC
-- LIMIT 10;
