-- =====================================================
-- FIX COMPLETO: Auditoría y historial para módulo de lotes
-- =====================================================
-- Este script corrige TODOS los problemas de auditoría e historial
-- en el módulo de lotes para que quede 100% sincronizado

-- ==========================================
-- 1. ACTUALIZAR TRIGGER DE AUDITORÍA DE LOTES
-- ==========================================
-- Incluir usuario_id en el registro de auditoría

CREATE OR REPLACE FUNCTION auditar_lotes_productos()
RETURNS TRIGGER AS $$
DECLARE
    v_accion VARCHAR(20);
    v_datos_anteriores JSONB;
    v_datos_nuevos JSONB;
    v_usuario_id INT;
BEGIN
    -- Determinar el tipo de acción
    IF (TG_OP = 'INSERT') THEN
        v_accion := 'INSERT';
        v_datos_anteriores := NULL;
        v_datos_nuevos := to_jsonb(NEW);
        v_usuario_id := NEW.usuario_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_accion := 'UPDATE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := to_jsonb(NEW);
        -- Priorizar NEW.usuario_id, si es NULL usar OLD.usuario_id
        v_usuario_id := COALESCE(NEW.usuario_id, OLD.usuario_id);
    ELSIF (TG_OP = 'DELETE') THEN
        v_accion := 'DELETE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := NULL;
        v_usuario_id := OLD.usuario_id;
    END IF;

    -- Insertar registro de auditoría CON usuario_id
    INSERT INTO auditoria (
        tabla,
        registro_id,
        accion,
        datos_anteriores,
        datos_nuevos,
        usuario_id,
        fecha
    ) VALUES (
        'lotes_productos',
        COALESCE(NEW.id, OLD.id),
        v_accion,
        v_datos_anteriores,
        v_datos_nuevos,
        v_usuario_id,
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

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_auditoria_lotes_productos ON lotes_productos;

CREATE TRIGGER trigger_auditoria_lotes_productos
    AFTER INSERT OR UPDATE OR DELETE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION auditar_lotes_productos();

COMMENT ON FUNCTION auditar_lotes_productos() IS 'Función para registrar cambios en lotes_productos en la tabla auditoria CON usuario_id';
COMMENT ON TRIGGER trigger_auditoria_lotes_productos ON lotes_productos IS 'Registra automáticamente INSERT, UPDATE y DELETE en auditoria con usuario_id';

-- ==========================================
-- 2. VERIFICAR Y CORREGIR TRIGGERS DE STOCK
-- ==========================================
-- Los triggers de sync_stock ya tienen usuario_id, solo verificamos que estén bien

-- Verificar trigger de INSERT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_sync_stock_insert'
    ) THEN
        RAISE EXCEPTION 'Trigger trigger_sync_stock_insert no existe. Ejecutar fix-historial-usuario-id.sql primero';
    END IF;
END $$;

-- Verificar trigger de UPDATE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_sync_stock_update'
    ) THEN
        RAISE EXCEPTION 'Trigger trigger_sync_stock_update no existe. Ejecutar fix-historial-usuario-id.sql primero';
    END IF;
END $$;

-- Verificar trigger de DELETE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_sync_stock_delete'
    ) THEN
        RAISE EXCEPTION 'Trigger trigger_sync_stock_delete no existe. Ejecutar fix-historial-usuario-id.sql primero';
    END IF;
END $$;

-- ==========================================
-- 3. AGREGAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- ==========================================

-- Índice para búsquedas de auditoría por tabla y registro
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro 
ON auditoria(tabla, registro_id);

-- Índice para búsquedas de auditoría por usuario
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario 
ON auditoria(usuario_id);

-- Índice para búsquedas de historial por referencia
CREATE INDEX IF NOT EXISTS idx_historial_referencia 
ON historial_inventario(referencia_tipo, referencia_id);

-- Índice para búsquedas de historial por usuario
CREATE INDEX IF NOT EXISTS idx_historial_usuario 
ON historial_inventario(usuario_id);

-- ==========================================
-- 4. COMENTARIOS Y DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE lotes_productos IS 'Tabla de lotes de productos con trazabilidad completa. Cada lote registra quién lo creó (usuario_id).';
COMMENT ON COLUMN lotes_productos.usuario_id IS 'ID del usuario que creó el lote. Se usa en triggers para auditoría e historial.';

COMMENT ON TABLE auditoria IS 'Registro de auditoría de todos los cambios en el sistema. SIEMPRE debe incluir usuario_id.';
COMMENT ON COLUMN auditoria.usuario_id IS 'ID del usuario que realizó la acción. Obligatorio para trazabilidad completa.';

COMMENT ON TABLE historial_inventario IS 'Historial de todos los movimientos de inventario. SIEMPRE debe incluir usuario_id.';
COMMENT ON COLUMN historial_inventario.usuario_id IS 'ID del usuario que realizó el movimiento. Obligatorio para trazabilidad completa.';

-- ==========================================
-- 5. VALIDACIÓN FINAL
-- ==========================================

-- Verificar que los triggers existen y están activos
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    t.tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('lotes_productos', 'productos')
  AND t.tgname LIKE '%audit%' OR t.tgname LIKE '%sync%'
ORDER BY c.relname, t.tgname;

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================
