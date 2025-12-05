-- =====================================================
-- AGROSHOP - SCRIPT DE CORRECCIÓN DE BASE DE DATOS
-- =====================================================
-- Este script corrige inconsistencias en triggers y vistas
-- Ejecutar SOLO si hay problemas con la sincronización de stock
-- =====================================================

-- 1. ELIMINAR TRIGGERS Y FUNCIONES PROBLEMÁTICAS
DROP TRIGGER IF EXISTS trigger_auditoria_lotes ON lotes_productos;
DROP FUNCTION IF EXISTS auditar_lotes_productos();
DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON lotes_productos;
DROP TRIGGER IF EXISTS trigger_sync_stock_update ON lotes_productos;
DROP TRIGGER IF EXISTS trigger_sync_stock_delete ON lotes_productos;
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_lotes ON lotes_productos;
DROP FUNCTION IF EXISTS sync_stock_on_lote_delete();

-- 2. ELIMINAR VISTAS ANTIGUAS (si existen)
DROP VIEW IF EXISTS vista_lotes_detalle CASCADE;
DROP VIEW IF EXISTS vista_productos_stock CASCADE;
DROP VIEW IF EXISTS vista_lotes_vencimiento CASCADE;

-- 3. ELIMINAR TRIGGERS DUPLICADOS
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_insert ON lotes_productos;
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_update ON lotes_productos;

-- 4. CREAR FUNCIÓN PARA SINCRONIZAR STOCK AL INSERTAR LOTE
CREATE OR REPLACE FUNCTION sync_stock_on_lote_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo sumar al stock si el lote está disponible
    IF NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad,
            updated_at = NOW()
        WHERE id = NEW.producto_id;
        
        RAISE NOTICE 'Stock incrementado en % para producto %', NEW.cantidad, NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CREAR FUNCIÓN PARA SINCRONIZAR STOCK AL ACTUALIZAR LOTE
CREATE OR REPLACE FUNCTION sync_stock_on_lote_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso 1: Cambio de disponible a otro estado (retirado, agotado, vencido)
    IF OLD.estado = 'disponible' AND NEW.estado != 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad,
            updated_at = NOW()
        WHERE id = OLD.producto_id;
        
        RAISE NOTICE 'Stock reducido en % para producto %', OLD.cantidad, OLD.producto_id;
    
    -- Caso 2: Cambio de otro estado a disponible (reactivación)
    ELSIF OLD.estado != 'disponible' AND NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad,
            updated_at = NOW()
        WHERE id = NEW.producto_id;
        
        RAISE NOTICE 'Stock incrementado en % para producto %', NEW.cantidad, NEW.producto_id;
    
    -- Caso 3: Cambio de cantidad mientras está disponible
    ELSIF OLD.estado = 'disponible' AND NEW.estado = 'disponible' AND OLD.cantidad != NEW.cantidad THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad + NEW.cantidad,
            updated_at = NOW()
        WHERE id = NEW.producto_id;
        
        RAISE NOTICE 'Stock ajustado de % a % para producto %', OLD.cantidad, NEW.cantidad, NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CREAR TRIGGERS
CREATE TRIGGER trg_sync_stock_on_lote_insert
    AFTER INSERT ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_insert();

CREATE TRIGGER trg_sync_stock_on_lote_update
    AFTER UPDATE ON lotes_productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_on_lote_update();

-- 7. AGREGAR COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON FUNCTION sync_stock_on_lote_insert() IS 
'Sincroniza automáticamente el stock del producto al insertar un nuevo lote disponible';

COMMENT ON FUNCTION sync_stock_on_lote_update() IS 
'Sincroniza automáticamente el stock del producto al cambiar el estado o cantidad de un lote';

COMMENT ON TRIGGER trg_sync_stock_on_lote_insert ON lotes_productos IS 
'Trigger que actualiza stock_actual del producto cuando se inserta un lote disponible';

COMMENT ON TRIGGER trg_sync_stock_on_lote_update ON lotes_productos IS 
'Trigger que actualiza stock_actual del producto cuando se modifica un lote';

-- 8. VERIFICAR ESTRUCTURA DE LA TABLA
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lotes_productos'
ORDER BY ordinal_position;

-- 9. VERIFICAR TRIGGERS INSTALADOS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'lotes_productos'
  AND trigger_schema = 'public'
ORDER BY trigger_name;
