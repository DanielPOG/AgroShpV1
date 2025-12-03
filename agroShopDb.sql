--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-12-03 16:00:46

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 9 (class 2615 OID 82995)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 3 (class 3079 OID 83306)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 2 (class 3079 OID 83295)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 346 (class 1255 OID 83460)
-- Name: actualizar_stock_venta(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_stock_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.producto_id;
    
    -- Registrar en historial
    INSERT INTO historial_inventario (
        producto_id,
        tipo_movimiento,
        cantidad_anterior,
        cantidad_movimiento,
        cantidad_nueva,
        referencia_id,
        referencia_tipo,
        observaciones
    )
    SELECT 
        NEW.producto_id,
        'venta',
        stock_actual + NEW.cantidad,
        -NEW.cantidad,
        stock_actual,
        NEW.venta_id,
        'venta',
        'Venta automÃ¡tica'
    FROM productos
    WHERE id = NEW.producto_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_stock_venta() OWNER TO postgres;

--
-- TOC entry 344 (class 1255 OID 83456)
-- Name: actualizar_total_compras_cliente(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_total_compras_cliente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.cliente_id IS NOT NULL THEN
        UPDATE clientes
        SET 
            total_compras = total_compras + NEW.total,
            ultima_compra = NEW.fecha_venta
        WHERE id = NEW.cliente_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_total_compras_cliente() OWNER TO postgres;

--
-- TOC entry 342 (class 1255 OID 83392)
-- Name: actualizar_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_updated_at() OWNER TO postgres;

--
-- TOC entry 352 (class 1255 OID 84033)
-- Name: auditar_lotes_productos(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auditar_lotes_productos() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_accion VARCHAR(20);
    v_datos_anteriores JSONB;
    v_datos_nuevos JSONB;
BEGIN
    -- Determinar el tipo de acciÃ³n
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

    -- Insertar registro de auditorÃ­a
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

    -- Retornar el registro apropiado segÃºn la operaciÃ³n
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION public.auditar_lotes_productos() OWNER TO postgres;

--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 352
-- Name: FUNCTION auditar_lotes_productos(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.auditar_lotes_productos() IS 'FunciÃ³n para registrar cambios en lotes_productos en la tabla auditoria';


--
-- TOC entry 343 (class 1255 OID 83398)
-- Name: generar_codigo_producto(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generar_codigo_producto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        NEW.codigo := 'PROD-' || LPAD(NEXTVAL('productos_id_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generar_codigo_producto() OWNER TO postgres;

--
-- TOC entry 347 (class 1255 OID 83462)
-- Name: generar_numero_turno(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generar_numero_turno() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    SELECT COALESCE(MAX(numero_turno), 0) + 1
    INTO NEW.numero_turno
    FROM turnos
    WHERE fecha = CURRENT_DATE;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generar_numero_turno() OWNER TO postgres;

--
-- TOC entry 351 (class 1255 OID 83835)
-- Name: sync_stock_on_lote_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_stock_on_lote_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad
        WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 'salida', p.stock_actual + OLD.cantidad,
               OLD.cantidad, p.stock_actual, OLD.id, 'lote',
               'EliminaciÃ³n de lote: ' || OLD.codigo_lote,
               NOW()
        FROM productos p WHERE p.id = OLD.producto_id;
    END IF;
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION public.sync_stock_on_lote_delete() OWNER TO postgres;

--
-- TOC entry 349 (class 1255 OID 83831)
-- Name: sync_stock_on_lote_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_stock_on_lote_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        -- Usar NOW() directamente - el servidor ya estÃ¡ en America/Bogota
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones,
            fecha_movimiento
        )
        SELECT 
            p.id,
            'entrada',
            p.stock_actual - NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.id,
            'lote',
            'Entrada de lote: ' || NEW.codigo_lote,
            NOW()  -- Simplemente NOW() - ya estÃ¡ en Colombia
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_stock_on_lote_insert() OWNER TO postgres;

--
-- TOC entry 350 (class 1255 OID 83833)
-- Name: sync_stock_on_lote_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_stock_on_lote_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.estado = 'disponible' AND NEW.estado != 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad
        WHERE id = OLD.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 'salida', p.stock_actual + OLD.cantidad,
               OLD.cantidad, p.stock_actual, OLD.id, 'lote',
               'Cambio de estado de lote: ' || OLD.codigo_lote || ' de disponible a ' || NEW.estado,
               NOW()
        FROM productos p WHERE p.id = OLD.producto_id;
        
    ELSIF OLD.estado != 'disponible' AND NEW.estado = 'disponible' THEN
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 'entrada', p.stock_actual - NEW.cantidad,
               NEW.cantidad, p.stock_actual, NEW.id, 'lote',
               'Cambio de estado de lote: ' || NEW.codigo_lote || ' de ' || OLD.estado || ' a disponible',
               NOW()
        FROM productos p WHERE p.id = NEW.producto_id;
        
    ELSIF OLD.estado = 'disponible' AND NEW.estado = 'disponible' AND OLD.cantidad != NEW.cantidad THEN
        UPDATE productos 
        SET stock_actual = stock_actual - OLD.cantidad + NEW.cantidad
        WHERE id = NEW.producto_id;
        
        INSERT INTO historial_inventario (
            producto_id, tipo_movimiento, cantidad_anterior,
            cantidad_movimiento, cantidad_nueva, referencia_id,
            referencia_tipo, observaciones, fecha_movimiento
        )
        SELECT p.id, 
               CASE WHEN NEW.cantidad > OLD.cantidad THEN 'entrada' ELSE 'salida' END,
               p.stock_actual + OLD.cantidad - NEW.cantidad,
               ABS(NEW.cantidad - OLD.cantidad),
               p.stock_actual,
               NEW.id, 'lote',
               'Ajuste de cantidad en lote: ' || NEW.codigo_lote,
               NOW()
        FROM productos p WHERE p.id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_stock_on_lote_update() OWNER TO postgres;

--
-- TOC entry 348 (class 1255 OID 83813)
-- Name: sync_stock_on_venta(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_stock_on_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.lote_id IS NOT NULL THEN
        UPDATE lotes_productos
        SET cantidad = cantidad - NEW.cantidad
        WHERE id = NEW.lote_id;
    ELSE
        UPDATE productos
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id = NEW.producto_id;
        INSERT INTO historial_inventario (
            producto_id,
            tipo_movimiento,
            cantidad_anterior,
            cantidad_movimiento,
            cantidad_nueva,
            referencia_id,
            referencia_tipo,
            observaciones
        )
        SELECT 
            p.id,
            'salida',
            p.stock_actual + NEW.cantidad,
            NEW.cantidad,
            p.stock_actual,
            NEW.venta_id,
            'venta',
            'Venta sin lote específico'
        FROM productos p
        WHERE p.id = NEW.producto_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_stock_on_venta() OWNER TO postgres;

--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 348
-- Name: FUNCTION sync_stock_on_venta(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.sync_stock_on_venta() IS 'Descuenta del lote al vender. Si no hay lote_id, descuenta directo del producto.';


--
-- TOC entry 345 (class 1255 OID 83458)
-- Name: validar_stock_venta(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_stock_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    stock_disponible DECIMAL(10, 2);
BEGIN
    SELECT stock_actual INTO stock_disponible
    FROM productos
    WHERE id = NEW.producto_id;
    
    IF stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID %. Disponible: %, Solicitado: %', 
            NEW.producto_id, stock_disponible, NEW.cantidad;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_stock_venta() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 284 (class 1259 OID 83530)
-- Name: arqueos_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.arqueos_caja (
    id integer NOT NULL,
    sesion_caja_id integer NOT NULL,
    tipo_arqueo character varying(20) NOT NULL,
    realizado_por integer NOT NULL,
    fecha_arqueo timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    billetes_100000 integer DEFAULT 0,
    billetes_50000 integer DEFAULT 0,
    billetes_20000 integer DEFAULT 0,
    billetes_10000 integer DEFAULT 0,
    billetes_5000 integer DEFAULT 0,
    billetes_2000 integer DEFAULT 0,
    billetes_1000 integer DEFAULT 0,
    monedas_1000 integer DEFAULT 0,
    monedas_500 integer DEFAULT 0,
    monedas_200 integer DEFAULT 0,
    monedas_100 integer DEFAULT 0,
    monedas_50 integer DEFAULT 0,
    total_contado numeric(10,2),
    total_esperado numeric(10,2),
    diferencia numeric(10,2),
    observaciones text
);


ALTER TABLE public.arqueos_caja OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 83529)
-- Name: arqueos_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.arqueos_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.arqueos_caja_id_seq OWNER TO postgres;

--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 283
-- Name: arqueos_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.arqueos_caja_id_seq OWNED BY public.arqueos_caja.id;


--
-- TOC entry 222 (class 1259 OID 82997)
-- Name: auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria (
    id integer NOT NULL,
    tabla character varying(50) NOT NULL,
    registro_id integer NOT NULL,
    accion character varying(20) NOT NULL,
    usuario_id integer,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    ip_address character varying(50),
    user_agent text,
    fecha timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.auditoria OWNER TO postgres;

--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE auditoria; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.auditoria IS 'AuditorÃ­a completa de todas las operaciones del sistema';


--
-- TOC entry 221 (class 1259 OID 82996)
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditoria_id_seq OWNER TO postgres;

--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 221
-- Name: auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditoria_id_seq OWNED BY public.auditoria.id;


--
-- TOC entry 274 (class 1259 OID 83466)
-- Name: cajas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cajas (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    ubicacion character varying(200),
    tipo character varying(20) DEFAULT 'principal'::character varying,
    activa boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cajas OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 83465)
-- Name: cajas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cajas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cajas_id_seq OWNER TO postgres;

--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 273
-- Name: cajas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cajas_id_seq OWNED BY public.cajas.id;


--
-- TOC entry 224 (class 1259 OID 83007)
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    icono character varying(50),
    color character varying(20),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 83006)
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_seq OWNER TO postgres;

--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 223
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- TOC entry 226 (class 1259 OID 83017)
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    tipo_cliente character varying(20) DEFAULT 'ocasional'::character varying,
    tipo_documento character varying(20),
    numero_documento character varying(50),
    nombre character varying(150) NOT NULL,
    apellido character varying(150),
    email character varying(150),
    telefono character varying(20),
    direccion text,
    ciudad character varying(100),
    es_institucional boolean DEFAULT false,
    dependencia character varying(200),
    total_compras numeric(10,2) DEFAULT 0,
    ultima_compra timestamp(6) without time zone,
    activo boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE clientes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.clientes IS 'Registro de clientes del sistema AgroShop';


--
-- TOC entry 225 (class 1259 OID 83016)
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO postgres;

--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 225
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- TOC entry 228 (class 1259 OID 83032)
-- Name: configuracion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracion (
    id integer NOT NULL,
    clave character varying(100) NOT NULL,
    valor text,
    tipo character varying(20),
    descripcion text,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.configuracion OWNER TO postgres;

--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE configuracion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.configuracion IS 'Configuraciones del sistema (EDITABLES desde panel de admin)';


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN configuracion.clave; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.configuracion.clave IS 'Identificador Ãºnico de la configuraciÃ³n';


--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN configuracion.valor; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.configuracion.valor IS 'Valor de la configuraciÃ³n (como texto)';


--
-- TOC entry 5474 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN configuracion.tipo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.configuracion.tipo IS 'Tipo de dato: string, number, boolean, json';


--
-- TOC entry 5475 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN configuracion.descripcion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.configuracion.descripcion IS 'DescripciÃ³n de para quÃ© sirve esta configuraciÃ³n';


--
-- TOC entry 227 (class 1259 OID 83031)
-- Name: configuracion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.configuracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.configuracion_id_seq OWNER TO postgres;

--
-- TOC entry 5476 (class 0 OID 0)
-- Dependencies: 227
-- Name: configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.configuracion_id_seq OWNED BY public.configuracion.id;


--
-- TOC entry 230 (class 1259 OID 83052)
-- Name: costos_produccion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.costos_produccion (
    id integer NOT NULL,
    producto_id integer,
    lote_id integer,
    costo_materia_prima numeric(10,2) DEFAULT 0,
    costo_mano_obra numeric(10,2) DEFAULT 0,
    costo_insumos numeric(10,2) DEFAULT 0,
    costo_energia numeric(10,2) DEFAULT 0,
    otros_costos numeric(10,2) DEFAULT 0,
    costo_total numeric(10,2),
    cantidad_producida numeric(10,2) NOT NULL,
    costo_unitario numeric(10,2),
    fecha_registro date DEFAULT CURRENT_TIMESTAMP,
    observaciones text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.costos_produccion OWNER TO postgres;

--
-- TOC entry 5477 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE costos_produccion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.costos_produccion IS 'Costos de producciÃ³n para anÃ¡lisis de rentabilidad';


--
-- TOC entry 229 (class 1259 OID 83051)
-- Name: costos_produccion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.costos_produccion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.costos_produccion_id_seq OWNER TO postgres;

--
-- TOC entry 5478 (class 0 OID 0)
-- Dependencies: 229
-- Name: costos_produccion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.costos_produccion_id_seq OWNED BY public.costos_produccion.id;


--
-- TOC entry 232 (class 1259 OID 83068)
-- Name: descuentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.descuentos (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    tipo character varying(20) NOT NULL,
    valor numeric(10,2) NOT NULL,
    minimo_compra numeric(10,2),
    maximo_descuento numeric(10,2),
    aplica_a character varying(20),
    categoria_id integer,
    producto_id integer,
    usos_maximos integer,
    usos_actuales integer DEFAULT 0,
    fecha_inicio date,
    fecha_fin date,
    solo_aprendices boolean DEFAULT false,
    solo_empleados boolean DEFAULT false,
    solo_institucional boolean DEFAULT false,
    activo boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.descuentos OWNER TO postgres;

--
-- TOC entry 5479 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE descuentos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.descuentos IS 'Descuentos y promociones aplicables a ventas';


--
-- TOC entry 234 (class 1259 OID 83083)
-- Name: descuentos_aplicados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.descuentos_aplicados (
    id integer NOT NULL,
    venta_id integer,
    descuento_id integer,
    monto_descuento numeric(10,2) NOT NULL,
    aplicado_por integer,
    fecha_aplicacion timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.descuentos_aplicados OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 83082)
-- Name: descuentos_aplicados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.descuentos_aplicados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.descuentos_aplicados_id_seq OWNER TO postgres;

--
-- TOC entry 5480 (class 0 OID 0)
-- Dependencies: 233
-- Name: descuentos_aplicados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.descuentos_aplicados_id_seq OWNED BY public.descuentos_aplicados.id;


--
-- TOC entry 231 (class 1259 OID 83067)
-- Name: descuentos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.descuentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.descuentos_id_seq OWNER TO postgres;

--
-- TOC entry 5481 (class 0 OID 0)
-- Dependencies: 231
-- Name: descuentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.descuentos_id_seq OWNED BY public.descuentos.id;


--
-- TOC entry 236 (class 1259 OID 83091)
-- Name: detalle_movimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_movimientos (
    id integer NOT NULL,
    movimiento_id integer,
    producto_id integer,
    lote_id integer,
    cantidad numeric(10,2) NOT NULL,
    unidad character varying(20)
);


ALTER TABLE public.detalle_movimientos OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 83090)
-- Name: detalle_movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_movimientos_id_seq OWNER TO postgres;

--
-- TOC entry 5482 (class 0 OID 0)
-- Dependencies: 235
-- Name: detalle_movimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_movimientos_id_seq OWNED BY public.detalle_movimientos.id;


--
-- TOC entry 238 (class 1259 OID 83098)
-- Name: detalle_solicitudes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_solicitudes (
    id integer NOT NULL,
    solicitud_id integer,
    producto_id integer,
    cantidad_solicitada numeric(10,2) NOT NULL,
    cantidad_aprobada numeric(10,2),
    observaciones text
);


ALTER TABLE public.detalle_solicitudes OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 83097)
-- Name: detalle_solicitudes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_solicitudes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_solicitudes_id_seq OWNER TO postgres;

--
-- TOC entry 5483 (class 0 OID 0)
-- Dependencies: 237
-- Name: detalle_solicitudes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_solicitudes_id_seq OWNED BY public.detalle_solicitudes.id;


--
-- TOC entry 240 (class 1259 OID 83107)
-- Name: detalle_ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_ventas (
    id integer NOT NULL,
    venta_id integer,
    producto_id integer,
    lote_id integer,
    cantidad numeric(10,2) NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


ALTER TABLE public.detalle_ventas OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 83106)
-- Name: detalle_ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_ventas_id_seq OWNER TO postgres;

--
-- TOC entry 5484 (class 0 OID 0)
-- Dependencies: 239
-- Name: detalle_ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_ventas_id_seq OWNED BY public.detalle_ventas.id;


--
-- TOC entry 282 (class 1259 OID 83520)
-- Name: gastos_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gastos_caja (
    id integer NOT NULL,
    sesion_caja_id integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    categoria_gasto character varying(100) NOT NULL,
    descripcion text NOT NULL,
    beneficiario character varying(200),
    comprobante_url character varying(500),
    numero_factura character varying(100),
    autorizado_por integer,
    fecha_gasto timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    observaciones text
);


ALTER TABLE public.gastos_caja OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 83519)
-- Name: gastos_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gastos_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gastos_caja_id_seq OWNER TO postgres;

--
-- TOC entry 5485 (class 0 OID 0)
-- Dependencies: 281
-- Name: gastos_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gastos_caja_id_seq OWNED BY public.gastos_caja.id;


--
-- TOC entry 242 (class 1259 OID 83114)
-- Name: historial_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_inventario (
    id integer NOT NULL,
    producto_id integer,
    tipo_movimiento character varying(30) NOT NULL,
    cantidad_anterior numeric(10,2),
    cantidad_movimiento numeric(10,2) NOT NULL,
    cantidad_nueva numeric(10,2),
    usuario_id integer,
    referencia_id integer,
    referencia_tipo character varying(30),
    observaciones text,
    fecha_movimiento timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.historial_inventario OWNER TO postgres;

--
-- TOC entry 5486 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE historial_inventario; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.historial_inventario IS 'AuditorÃ­a de todos los movimientos de inventario';


--
-- TOC entry 241 (class 1259 OID 83113)
-- Name: historial_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_inventario_id_seq OWNER TO postgres;

--
-- TOC entry 5487 (class 0 OID 0)
-- Dependencies: 241
-- Name: historial_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_inventario_id_seq OWNED BY public.historial_inventario.id;


--
-- TOC entry 244 (class 1259 OID 83124)
-- Name: lotes_productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lotes_productos (
    id integer NOT NULL,
    producto_id integer,
    codigo_lote character varying(50) NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    fecha_produccion timestamp with time zone NOT NULL,
    fecha_vencimiento timestamp with time zone,
    unidad_productiva_id integer,
    estado character varying(20) DEFAULT 'disponible'::character varying,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.lotes_productos OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 83123)
-- Name: lotes_productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lotes_productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lotes_productos_id_seq OWNER TO postgres;

--
-- TOC entry 5488 (class 0 OID 0)
-- Dependencies: 243
-- Name: lotes_productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lotes_productos_id_seq OWNED BY public.lotes_productos.id;


--
-- TOC entry 246 (class 1259 OID 83133)
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metodos_pago (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    icono character varying(50),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.metodos_pago OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 83132)
-- Name: metodos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metodos_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metodos_pago_id_seq OWNER TO postgres;

--
-- TOC entry 5489 (class 0 OID 0)
-- Dependencies: 245
-- Name: metodos_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metodos_pago_id_seq OWNED BY public.metodos_pago.id;


--
-- TOC entry 278 (class 1259 OID 83498)
-- Name: movimientos_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimientos_caja (
    id integer NOT NULL,
    sesion_caja_id integer NOT NULL,
    venta_id integer,
    tipo_movimiento character varying(20) NOT NULL,
    metodo_pago character varying(20),
    monto numeric(10,2) NOT NULL,
    descripcion text,
    usuario_id integer,
    requiere_autorizacion boolean DEFAULT false,
    autorizado_por integer,
    fecha_movimiento timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.movimientos_caja OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 83497)
-- Name: movimientos_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimientos_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimientos_caja_id_seq OWNER TO postgres;

--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 277
-- Name: movimientos_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimientos_caja_id_seq OWNED BY public.movimientos_caja.id;


--
-- TOC entry 248 (class 1259 OID 83144)
-- Name: movimientos_unidades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimientos_unidades (
    id integer NOT NULL,
    codigo_movimiento character varying(50) NOT NULL,
    unidad_origen_id integer,
    unidad_destino_id integer,
    usuario_id integer,
    fecha_movimiento timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    motivo text,
    estado character varying(20) DEFAULT 'completado'::character varying,
    observaciones text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.movimientos_unidades OWNER TO postgres;

--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE movimientos_unidades; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.movimientos_unidades IS 'Transferencias de productos entre unidades productivas';


--
-- TOC entry 247 (class 1259 OID 83143)
-- Name: movimientos_unidades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimientos_unidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimientos_unidades_id_seq OWNER TO postgres;

--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 247
-- Name: movimientos_unidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimientos_unidades_id_seq OWNED BY public.movimientos_unidades.id;


--
-- TOC entry 250 (class 1259 OID 83156)
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    titulo character varying(200) NOT NULL,
    mensaje text NOT NULL,
    prioridad character varying(20) DEFAULT 'normal'::character varying,
    leida boolean DEFAULT false,
    usuario_id integer,
    referencia_id integer,
    referencia_tipo character varying(30),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notificaciones OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 83155)
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificaciones_id_seq OWNER TO postgres;

--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 249
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- TOC entry 252 (class 1259 OID 83168)
-- Name: pagos_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagos_venta (
    id integer NOT NULL,
    venta_id integer,
    metodo_pago_id integer,
    monto numeric(10,2) NOT NULL,
    referencia character varying(100),
    fecha_pago timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pagos_venta OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 83167)
-- Name: pagos_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pagos_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pagos_venta_id_seq OWNER TO postgres;

--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 251
-- Name: pagos_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pagos_venta_id_seq OWNED BY public.pagos_venta.id;


--
-- TOC entry 254 (class 1259 OID 83176)
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    categoria_id integer,
    unidad_productiva_id integer,
    tipo_medida character varying(20) NOT NULL,
    unidad character varying(20),
    precio_unitario numeric(10,2) NOT NULL,
    precio_mayorista numeric(10,2),
    stock_actual numeric(10,2) DEFAULT 0,
    stock_minimo numeric(10,2) DEFAULT 0,
    stock_maximo numeric(10,2),
    es_perecedero boolean DEFAULT false,
    dias_vencimiento integer,
    imagen_url character varying(500),
    activo boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    proveedor_id integer,
    es_produccion_propia boolean DEFAULT true
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- TOC entry 5495 (class 0 OID 0)
-- Dependencies: 254
-- Name: TABLE productos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.productos IS 'CatÃ¡logo de productos del sistema AgroShop';


--
-- TOC entry 253 (class 1259 OID 83175)
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_seq OWNER TO postgres;

--
-- TOC entry 5496 (class 0 OID 0)
-- Dependencies: 253
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- TOC entry 256 (class 1259 OID 83192)
-- Name: proveedores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(200) NOT NULL,
    nit character varying(50),
    contacto_nombre character varying(150),
    contacto_email character varying(150),
    contacto_telefono character varying(20),
    direccion text,
    ciudad character varying(100),
    tipo_productos text[],
    activo boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.proveedores OWNER TO postgres;

--
-- TOC entry 5497 (class 0 OID 0)
-- Dependencies: 256
-- Name: TABLE proveedores; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.proveedores IS 'Proveedores de insumos externos (futuro)';


--
-- TOC entry 255 (class 1259 OID 83191)
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proveedores_id_seq OWNER TO postgres;

--
-- TOC entry 5498 (class 0 OID 0)
-- Dependencies: 255
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- TOC entry 280 (class 1259 OID 83509)
-- Name: retiros_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retiros_caja (
    id integer NOT NULL,
    sesion_caja_id integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    motivo character varying(200) NOT NULL,
    solicitado_por integer NOT NULL,
    autorizado_por integer,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    fecha_solicitud timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta timestamp(6) without time zone,
    observaciones text,
    recibo_url character varying(500),
    destino_fondos character varying(200)
);


ALTER TABLE public.retiros_caja OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 83508)
-- Name: retiros_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.retiros_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.retiros_caja_id_seq OWNER TO postgres;

--
-- TOC entry 5499 (class 0 OID 0)
-- Dependencies: 279
-- Name: retiros_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.retiros_caja_id_seq OWNED BY public.retiros_caja.id;


--
-- TOC entry 258 (class 1259 OID 83204)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    permisos jsonb DEFAULT '{}'::jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 83203)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5500 (class 0 OID 0)
-- Dependencies: 257
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 276 (class 1259 OID 83477)
-- Name: sesiones_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sesiones_caja (
    id integer NOT NULL,
    codigo_sesion character varying(50) NOT NULL,
    caja_id integer NOT NULL,
    cajero_id integer NOT NULL,
    fecha_apertura timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fondo_inicial numeric(10,2) DEFAULT 0 NOT NULL,
    observaciones_apertura text,
    fecha_cierre timestamp(6) without time zone,
    estado character varying(20) DEFAULT 'abierta'::character varying,
    observaciones_cierre text,
    total_ventas_efectivo numeric(10,2) DEFAULT 0,
    total_ventas_nequi numeric(10,2) DEFAULT 0,
    total_ventas_tarjeta numeric(10,2) DEFAULT 0,
    total_ventas_transferencia numeric(10,2) DEFAULT 0,
    total_ingresos_adicionales numeric(10,2) DEFAULT 0,
    total_retiros numeric(10,2) DEFAULT 0,
    total_gastos numeric(10,2) DEFAULT 0,
    efectivo_esperado numeric(10,2),
    efectivo_contado numeric(10,2),
    diferencia numeric(10,2),
    desglose_efectivo jsonb,
    cuadrada boolean DEFAULT false,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sesiones_caja OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 83476)
-- Name: sesiones_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sesiones_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sesiones_caja_id_seq OWNER TO postgres;

--
-- TOC entry 5501 (class 0 OID 0)
-- Dependencies: 275
-- Name: sesiones_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sesiones_caja_id_seq OWNED BY public.sesiones_caja.id;


--
-- TOC entry 260 (class 1259 OID 83216)
-- Name: solicitudes_transferencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudes_transferencia (
    id integer NOT NULL,
    codigo_solicitud character varying(50) NOT NULL,
    unidad_solicitante_id integer,
    unidad_proveedora_id integer,
    usuario_solicitante_id integer,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    fecha_solicitud timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta timestamp(6) without time zone,
    usuario_respuesta_id integer,
    observaciones text,
    motivo_rechazo text
);


ALTER TABLE public.solicitudes_transferencia OWNER TO postgres;

--
-- TOC entry 5502 (class 0 OID 0)
-- Dependencies: 260
-- Name: TABLE solicitudes_transferencia; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.solicitudes_transferencia IS 'Solicitudes de transferencia entre unidades productivas';


--
-- TOC entry 259 (class 1259 OID 83215)
-- Name: solicitudes_transferencia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitudes_transferencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitudes_transferencia_id_seq OWNER TO postgres;

--
-- TOC entry 5503 (class 0 OID 0)
-- Dependencies: 259
-- Name: solicitudes_transferencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitudes_transferencia_id_seq OWNED BY public.solicitudes_transferencia.id;


--
-- TOC entry 262 (class 1259 OID 83227)
-- Name: turnos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.turnos (
    id integer NOT NULL,
    numero_turno integer NOT NULL,
    cliente_nombre character varying(150),
    cliente_id integer,
    estado character varying(20) DEFAULT 'esperando'::character varying,
    cajero_id integer,
    fecha date DEFAULT CURRENT_DATE,
    hora_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    hora_atencion timestamp with time zone,
    hora_finalizacion timestamp with time zone
);


ALTER TABLE public.turnos OWNER TO postgres;

--
-- TOC entry 5504 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE turnos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.turnos IS 'Sistema de turnos para gestiÃ³n de cola en POS';


--
-- TOC entry 261 (class 1259 OID 83226)
-- Name: turnos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.turnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.turnos_id_seq OWNER TO postgres;

--
-- TOC entry 5505 (class 0 OID 0)
-- Dependencies: 261
-- Name: turnos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.turnos_id_seq OWNED BY public.turnos.id;


--
-- TOC entry 264 (class 1259 OID 83237)
-- Name: unidades_productivas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unidades_productivas (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    tipo character varying(50),
    responsable_id integer,
    ubicacion character varying(200),
    activa boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.unidades_productivas OWNER TO postgres;

--
-- TOC entry 5506 (class 0 OID 0)
-- Dependencies: 264
-- Name: TABLE unidades_productivas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.unidades_productivas IS 'Unidades productivas del SENA (Huerta, Granja, etc.)';


--
-- TOC entry 263 (class 1259 OID 83236)
-- Name: unidades_productivas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unidades_productivas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unidades_productivas_id_seq OWNER TO postgres;

--
-- TOC entry 5507 (class 0 OID 0)
-- Dependencies: 263
-- Name: unidades_productivas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unidades_productivas_id_seq OWNED BY public.unidades_productivas.id;


--
-- TOC entry 266 (class 1259 OID 83249)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol_id integer,
    activo boolean DEFAULT true,
    ultimo_acceso timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 5508 (class 0 OID 0)
-- Dependencies: 266
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema con roles y permisos';


--
-- TOC entry 265 (class 1259 OID 83248)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 5509 (class 0 OID 0)
-- Dependencies: 265
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 268 (class 1259 OID 83261)
-- Name: ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    codigo_venta character varying(50) NOT NULL,
    usuario_id integer,
    fecha_venta timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    subtotal numeric(10,2) NOT NULL,
    impuesto numeric(10,2) DEFAULT 0,
    descuento numeric(10,2) DEFAULT 0,
    total numeric(10,2) NOT NULL,
    cliente_nombre character varying(150),
    cliente_email character varying(150),
    cliente_telefono character varying(20),
    estado character varying(20) DEFAULT 'completada'::character varying,
    requiere_factura boolean DEFAULT false,
    factura_generada boolean DEFAULT false,
    factura_url character varying(500),
    observaciones text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cliente_id integer
);


ALTER TABLE public.ventas OWNER TO postgres;

--
-- TOC entry 5510 (class 0 OID 0)
-- Dependencies: 268
-- Name: TABLE ventas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ventas IS 'Registro de todas las ventas realizadas';


--
-- TOC entry 267 (class 1259 OID 83260)
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ventas_id_seq OWNER TO postgres;

--
-- TOC entry 5511 (class 0 OID 0)
-- Dependencies: 267
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- TOC entry 271 (class 1259 OID 83446)
-- Name: vista_clientes_frecuentes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_clientes_frecuentes AS
 SELECT c.id,
    c.nombre,
    c.apellido,
    c.email,
    c.telefono,
    c.tipo_cliente,
    c.total_compras,
    count(v.id) AS total_transacciones,
    c.ultima_compra,
        CASE
            WHEN (c.ultima_compra >= (CURRENT_DATE - '30 days'::interval)) THEN 'activo'::text
            WHEN (c.ultima_compra >= (CURRENT_DATE - '90 days'::interval)) THEN 'regular'::text
            ELSE 'inactivo'::text
        END AS estado_cliente
   FROM (public.clientes c
     LEFT JOIN public.ventas v ON ((c.id = v.cliente_id)))
  GROUP BY c.id, c.nombre, c.apellido, c.email, c.telefono, c.tipo_cliente, c.total_compras, c.ultima_compra
  ORDER BY c.total_compras DESC;


ALTER VIEW public.vista_clientes_frecuentes OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 83378)
-- Name: vista_productos_completa; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_productos_completa AS
 SELECT p.id,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.tipo_medida,
    p.unidad,
    p.precio_unitario,
    p.stock_actual,
    p.stock_minimo,
    p.es_perecedero,
    c.nombre AS categoria,
    c.color AS categoria_color,
    up.nombre AS unidad_productiva,
    up.codigo AS unidad_productiva_codigo,
        CASE
            WHEN (p.stock_actual = (0)::numeric) THEN 'agotado'::text
            WHEN (p.stock_actual <= p.stock_minimo) THEN 'bajo_stock'::text
            ELSE 'disponible'::text
        END AS estado_stock,
    p.activo,
    p.created_at,
    p.updated_at
   FROM ((public.productos p
     LEFT JOIN public.categorias c ON ((p.categoria_id = c.id)))
     LEFT JOIN public.unidades_productivas up ON ((p.unidad_productiva_id = up.id)));


ALTER VIEW public.vista_productos_completa OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 83441)
-- Name: vista_rentabilidad_productos; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_rentabilidad_productos AS
 SELECT p.id,
    p.codigo,
    p.nombre,
    p.precio_unitario,
    COALESCE(avg(cp.costo_unitario), (0)::numeric) AS costo_promedio,
    (p.precio_unitario - COALESCE(avg(cp.costo_unitario), (0)::numeric)) AS margen_bruto,
        CASE
            WHEN (COALESCE(avg(cp.costo_unitario), (0)::numeric) > (0)::numeric) THEN (((p.precio_unitario - COALESCE(avg(cp.costo_unitario), (0)::numeric)) / COALESCE(avg(cp.costo_unitario), (0)::numeric)) * (100)::numeric)
            ELSE (0)::numeric
        END AS margen_porcentaje
   FROM (public.productos p
     LEFT JOIN public.costos_produccion cp ON ((p.id = cp.producto_id)))
  GROUP BY p.id, p.codigo, p.nombre, p.precio_unitario;


ALTER VIEW public.vista_rentabilidad_productos OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 83451)
-- Name: vista_solicitudes_pendientes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_solicitudes_pendientes AS
 SELECT st.id,
    st.codigo_solicitud,
    up_sol.nombre AS unidad_solicitante,
    up_prov.nombre AS unidad_proveedora,
    (((u.nombre)::text || ' '::text) || (u.apellido)::text) AS solicitante,
    st.fecha_solicitud,
    count(ds.id) AS total_productos,
    sum(ds.cantidad_solicitada) AS cantidad_total,
    st.observaciones
   FROM ((((public.solicitudes_transferencia st
     JOIN public.unidades_productivas up_sol ON ((st.unidad_solicitante_id = up_sol.id)))
     JOIN public.unidades_productivas up_prov ON ((st.unidad_proveedora_id = up_prov.id)))
     JOIN public.usuarios u ON ((st.usuario_solicitante_id = u.id)))
     LEFT JOIN public.detalle_solicitudes ds ON ((st.id = ds.solicitud_id)))
  WHERE ((st.estado)::text = 'pendiente'::text)
  GROUP BY st.id, st.codigo_solicitud, up_sol.nombre, up_prov.nombre, u.nombre, u.apellido, st.fecha_solicitud, st.observaciones
  ORDER BY st.fecha_solicitud;


ALTER VIEW public.vista_solicitudes_pendientes OWNER TO postgres;

--
-- TOC entry 5034 (class 2604 OID 83533)
-- Name: arqueos_caja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arqueos_caja ALTER COLUMN id SET DEFAULT nextval('public.arqueos_caja_id_seq'::regclass);


--
-- TOC entry 4918 (class 2604 OID 83000)
-- Name: auditoria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria ALTER COLUMN id SET DEFAULT nextval('public.auditoria_id_seq'::regclass);


--
-- TOC entry 5008 (class 2604 OID 83469)
-- Name: cajas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cajas ALTER COLUMN id SET DEFAULT nextval('public.cajas_id_seq'::regclass);


--
-- TOC entry 4920 (class 2604 OID 83010)
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 83020)
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- TOC entry 4929 (class 2604 OID 83035)
-- Name: configuracion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion ALTER COLUMN id SET DEFAULT nextval('public.configuracion_id_seq'::regclass);


--
-- TOC entry 4931 (class 2604 OID 83055)
-- Name: costos_produccion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costos_produccion ALTER COLUMN id SET DEFAULT nextval('public.costos_produccion_id_seq'::regclass);


--
-- TOC entry 4939 (class 2604 OID 83071)
-- Name: descuentos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.descuentos ALTER COLUMN id SET DEFAULT nextval('public.descuentos_id_seq'::regclass);


--
-- TOC entry 4946 (class 2604 OID 83086)
-- Name: descuentos_aplicados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.descuentos_aplicados ALTER COLUMN id SET DEFAULT nextval('public.descuentos_aplicados_id_seq'::regclass);


--
-- TOC entry 4948 (class 2604 OID 83094)
-- Name: detalle_movimientos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_movimientos ALTER COLUMN id SET DEFAULT nextval('public.detalle_movimientos_id_seq'::regclass);


--
-- TOC entry 4949 (class 2604 OID 83101)
-- Name: detalle_solicitudes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_solicitudes ALTER COLUMN id SET DEFAULT nextval('public.detalle_solicitudes_id_seq'::regclass);


--
-- TOC entry 4950 (class 2604 OID 83110)
-- Name: detalle_ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas ALTER COLUMN id SET DEFAULT nextval('public.detalle_ventas_id_seq'::regclass);


--
-- TOC entry 5032 (class 2604 OID 83523)
-- Name: gastos_caja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_caja ALTER COLUMN id SET DEFAULT nextval('public.gastos_caja_id_seq'::regclass);


--
-- TOC entry 4951 (class 2604 OID 83117)
-- Name: historial_inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_inventario ALTER COLUMN id SET DEFAULT nextval('public.historial_inventario_id_seq'::regclass);


--
-- TOC entry 4953 (class 2604 OID 83127)
-- Name: lotes_productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lotes_productos ALTER COLUMN id SET DEFAULT nextval('public.lotes_productos_id_seq'::regclass);


--
-- TOC entry 4956 (class 2604 OID 83136)
-- Name: metodos_pago id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_id_seq'::regclass);


--
-- TOC entry 5026 (class 2604 OID 83501)
-- Name: movimientos_caja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja ALTER COLUMN id SET DEFAULT nextval('public.movimientos_caja_id_seq'::regclass);


--
-- TOC entry 4959 (class 2604 OID 83147)
-- Name: movimientos_unidades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_unidades ALTER COLUMN id SET DEFAULT nextval('public.movimientos_unidades_id_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 83159)
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- TOC entry 4967 (class 2604 OID 83171)
-- Name: pagos_venta id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_venta ALTER COLUMN id SET DEFAULT nextval('public.pagos_venta_id_seq'::regclass);


--
-- TOC entry 4969 (class 2604 OID 83179)
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- TOC entry 4977 (class 2604 OID 83195)
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- TOC entry 5029 (class 2604 OID 83512)
-- Name: retiros_caja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retiros_caja ALTER COLUMN id SET DEFAULT nextval('public.retiros_caja_id_seq'::regclass);


--
-- TOC entry 4981 (class 2604 OID 83207)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5013 (class 2604 OID 83480)
-- Name: sesiones_caja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_caja ALTER COLUMN id SET DEFAULT nextval('public.sesiones_caja_id_seq'::regclass);


--
-- TOC entry 4985 (class 2604 OID 83219)
-- Name: solicitudes_transferencia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_transferencia ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_transferencia_id_seq'::regclass);


--
-- TOC entry 4988 (class 2604 OID 83230)
-- Name: turnos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.turnos ALTER COLUMN id SET DEFAULT nextval('public.turnos_id_seq'::regclass);


--
-- TOC entry 4992 (class 2604 OID 83240)
-- Name: unidades_productivas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unidades_productivas ALTER COLUMN id SET DEFAULT nextval('public.unidades_productivas_id_seq'::regclass);


--
-- TOC entry 4996 (class 2604 OID 83252)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 5000 (class 2604 OID 83264)
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- TOC entry 5452 (class 0 OID 83530)
-- Dependencies: 284
-- Data for Name: arqueos_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.arqueos_caja (id, sesion_caja_id, tipo_arqueo, realizado_por, fecha_arqueo, billetes_100000, billetes_50000, billetes_20000, billetes_10000, billetes_5000, billetes_2000, billetes_1000, monedas_1000, monedas_500, monedas_200, monedas_100, monedas_50, total_contado, total_esperado, diferencia, observaciones) FROM stdin;
\.


--
-- TOC entry 5394 (class 0 OID 82997)
-- Dependencies: 222
-- Data for Name: auditoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditoria (id, tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos, ip_address, user_agent, fecha) FROM stdin;
1	productos	5	CREATE	1	\N	{"codigo": "KOLA", "nombre": "Fresa", "categoria_id": 6, "lote_inicial": {"cantidad": 20, "codigo_lote": "K-202512-563"}, "stock_maximo": null, "stock_minimo": 20, "precio_unitario": 500, "unidad_productiva_id": 3}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 08:35:32.279-05
2	productos	1	UPDATE	1	{"activo": true}	{"activo": false}	\N	\N	2025-12-02 08:42:53.938-05
3	productos	6	CREATE	1	\N	{"codigo": "LALO", "nombre": "lulo", "categoria_id": 8, "lote_inicial": {"cantidad": 15, "codigo_lote": "L-202512-326"}, "stock_maximo": null, "stock_minimo": 5, "precio_unitario": 1000, "unidad_productiva_id": 3}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 09:01:45.196-05
4	productos	7	CREATE	1	\N	{"codigo": "ASDA", "nombre": "prueba 2", "categoria_id": 7, "lote_inicial": {"cantidad": 12, "codigo_lote": "A-202512-367"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 5000, "unidad_productiva_id": 4}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 09:32:12.792-05
5	productos	8	CREATE	1	\N	{"codigo": "LOLITO", "nombre": "fedes", "categoria_id": 7, "lote_inicial": {"cantidad": 303, "codigo_lote": "L-202512-165"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 5000, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 09:41:25.068-05
6	productos	9	CREATE	1	\N	{"codigo": "FRESA", "nombre": "Pepep", "categoria_id": 6, "lote_inicial": {"cantidad": 30, "codigo_lote": "F-202512-620"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 500, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 09:43:50.019-05
7	productos	6	UPDATE	1	{"activo": true}	{"activo": false}	\N	\N	2025-12-02 09:44:41.114-05
8	productos	9	UPDATE	1	{"activo": true}	{"activo": false}	\N	\N	2025-12-02 09:44:47.268-05
9	productos	5	UPDATE	1	{"activo": true}	{"activo": false}	\N	\N	2025-12-02 09:44:50.591-05
10	productos	2	UPDATE	1	{"activo": true}	{"activo": false}	\N	\N	2025-12-02 09:44:54.427-05
11	productos	4	UPDATE	1	{"activo": true}	{"activo": false}	\N	\N	2025-12-02 09:44:57.791-05
12	productos	8	UPDATE	1	{"id": 8, "activo": true, "codigo": "LOLITO", "nombre": "fedes", "unidad": "kg", "created_at": "2025-12-02T09:41:24.846Z", "imagen_url": "/productos/producto-1764668478097-e6geo1.jpg", "updated_at": "2025-12-02T04:41:24.770Z", "descripcion": "este es lolito ", "tipo_medida": "peso", "categoria_id": 7, "proveedor_id": null, "stock_actual": 303, "stock_maximo": null, "stock_minimo": 10, "es_perecedero": true, "precio_unitario": 5000, "dias_vencimiento": 10, "precio_mayorista": 2500, "es_produccion_propia": true, "unidad_productiva_id": 2}	{"id": 8, "activo": true, "codigo": "LOLITO", "nombre": "fedes", "unidad": "kg", "categoria": {"id": 7, "color": "#6B7280", "icono": "package", "nombre": "Insumos"}, "created_at": "2025-12-02T09:41:24.846Z", "imagen_url": "/productos/producto-1764668478097-e6geo1.jpg", "updated_at": "2025-12-02T04:45:22.376Z", "descripcion": "este es lolito de edicion", "tipo_medida": "peso", "categoria_id": 7, "proveedor_id": null, "stock_actual": 303, "stock_maximo": null, "stock_minimo": 10, "es_perecedero": true, "precio_unitario": 5000, "dias_vencimiento": 10, "precio_mayorista": 2500, "unidad_productiva": {"id": 2, "codigo": "UP-BOVINOS", "nombre": "Granja Bovina"}, "es_produccion_propia": true, "unidad_productiva_id": 2}	\N	\N	2025-12-02 09:45:22.4-05
13	productos	10	CREATE	1	\N	{"codigo": "RATON", "nombre": "Perez", "categoria_id": 6, "lote_inicial": {"cantidad": 60, "codigo_lote": "R-202512-035"}, "stock_maximo": null, "stock_minimo": 5, "precio_unitario": 3000, "unidad_productiva_id": 3}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 10:38:01.019-05
14	productos	11	CREATE	1	\N	{"codigo": "YUPI", "nombre": "hola", "categoria_id": 6, "lote_inicial": {"cantidad": 25, "codigo_lote": "Y-202512-424"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 5000, "unidad_productiva_id": 3}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 12:17:17.256-05
15	productos	11	UPDATE	1	{"id": 11, "activo": true, "codigo": "YUPI", "nombre": "hola", "unidad": "unidades", "created_at": "2025-12-02T12:17:17.009Z", "imagen_url": null, "updated_at": "2025-12-02T07:17:16.571Z", "descripcion": "esta es una descripcion", "tipo_medida": "unidad", "categoria_id": 6, "proveedor_id": null, "stock_actual": 25, "stock_maximo": null, "stock_minimo": 10, "es_perecedero": false, "precio_unitario": 5000, "dias_vencimiento": null, "precio_mayorista": 2000, "es_produccion_propia": true, "unidad_productiva_id": 3}	{"id": 11, "activo": true, "codigo": "YUPI", "nombre": "holaBuenas", "unidad": "unidades", "categoria": {"id": 6, "color": "#EC4899", "icono": "apple", "nombre": "Frutas"}, "created_at": "2025-12-02T12:17:17.009Z", "imagen_url": null, "updated_at": "2025-12-02T07:18:34.441Z", "descripcion": "esta es una descripcion", "tipo_medida": "unidad", "categoria_id": 6, "proveedor_id": null, "stock_actual": 25, "stock_maximo": null, "stock_minimo": 10, "es_perecedero": false, "precio_unitario": 5000, "dias_vencimiento": null, "precio_mayorista": 2000, "unidad_productiva": {"id": 3, "codigo": "UP-AVICOLA", "nombre": "Granja AvÃ­cola"}, "es_produccion_propia": true, "unidad_productiva_id": 3}	\N	\N	2025-12-02 12:18:34.549-05
16	productos	12	CREATE	1	\N	{"codigo": "LOGO", "nombre": "PEPE", "categoria_id": 5, "lote_inicial": {"cantidad": 60, "codigo_lote": "L-202512-164"}, "stock_maximo": null, "stock_minimo": 20, "precio_unitario": 500, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 12:30:45.331-05
17	productos	13	CREATE	1	\N	{"codigo": "FRESA-PRUEBA", "nombre": "fresaPrueba", "categoria_id": 8, "lote_inicial": {"cantidad": 30, "codigo_lote": "F-202512-199"}, "stock_maximo": null, "stock_minimo": 11, "precio_unitario": 6000, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 12:42:00.301-05
18	productos	14	CREATE	1	\N	{"codigo": "KOALA", "nombre": "koah", "categoria_id": 6, "lote_inicial": {"cantidad": 30, "codigo_lote": "K-202512-685"}, "stock_maximo": null, "stock_minimo": 5, "precio_unitario": 1000, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 12:54:13.915-05
19	productos	15	CREATE	1	\N	{"codigo": "IKA", "nombre": "calimito", "categoria_id": 4, "lote_inicial": {"cantidad": 123, "codigo_lote": "I-202512-290"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 5000, "unidad_productiva_id": 4}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 12:59:39.815-05
20	productos	16	CREATE	1	\N	{"codigo": "FINAL", "nombre": "Final", "categoria_id": 6, "lote_inicial": {"cantidad": 20, "codigo_lote": "F-202512-679"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 5000, "unidad_productiva_id": 1}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 13:10:00.951-05
21	productos	17	CREATE	1	\N	{"codigo": "PROPIA", "nombre": "laPropia", "categoria_id": 1, "lote_inicial": {"cantidad": 32, "codigo_lote": "P-202512-054"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 12000, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 13:21:54.707-05
22	productos	18	CREATE	1	\N	{"codigo": "PATO", "nombre": "donald", "categoria_id": 4, "lote_inicial": {"cantidad": 30, "codigo_lote": "P-202512-502"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 5000, "unidad_productiva_id": 4}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 13:24:49.011-05
23	productos	19	CREATE	1	\N	{"codigo": "DOOFY", "nombre": "doofy", "categoria_id": 6, "lote_inicial": {"cantidad": 50, "codigo_lote": "D-202512-605"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 5000, "unidad_productiva_id": 4}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 13:34:50.11-05
24	productos	20	CREATE	1	\N	{"codigo": "JIRAFA", "nombre": "jirafa", "categoria_id": 6, "lote_inicial": {"cantidad": 40, "codigo_lote": "J-202512-755"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 2000, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 08:54:31.616-05
25	productos	19	UPDATE	1	{"activo": true}	{"activo": false}	\N	\N	2025-12-02 08:59:40.282-05
26	productos	21	CREATE	1	\N	{"codigo": "ROTO", "nombre": "YogurtV2", "categoria_id": 2, "lote_inicial": {"cantidad": 30, "codigo_lote": "R-202512-553"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 4000, "unidad_productiva_id": 6}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 10:04:41.854-05
27	productos	22	CREATE	1	\N	{"codigo": "WERE", "nombre": "Panv2", "categoria_id": 3, "lote_inicial": {"cantidad": 60, "codigo_lote": "W-202512-103"}, "stock_maximo": null, "stock_minimo": 20, "precio_unitario": 400, "unidad_productiva_id": 5}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 10:07:10.622-05
28	productos	23	CREATE	1	\N	{"codigo": "WERE2", "nombre": "asdadsd", "categoria_id": 6, "lote_inicial": {"cantidad": 60, "codigo_lote": "W-202512-654"}, "stock_maximo": null, "stock_minimo": 10, "precio_unitario": 500, "unidad_productiva_id": 2}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0	2025-12-02 10:09:54.696-05
29	productos	23	UPDATE	1	{"id": 23, "activo": true, "codigo": "WERE2", "nombre": "asdadsd", "unidad": "L", "created_at": "2025-12-02T15:09:54.525Z", "imagen_url": null, "updated_at": "2025-12-02T11:05:38.245Z", "descripcion": "asdasd", "tipo_medida": "volumen", "categoria_id": 6, "proveedor_id": null, "stock_actual": 100, "stock_maximo": null, "stock_minimo": 10, "es_perecedero": true, "precio_unitario": 500, "dias_vencimiento": 2, "precio_mayorista": 200, "es_produccion_propia": true, "unidad_productiva_id": 2}	{"id": 23, "activo": true, "codigo": "WERE2", "nombre": "asdadsd", "unidad": "L", "categoria": {"id": 6, "color": "#EC4899", "icono": "apple", "nombre": "Frutas"}, "created_at": "2025-12-02T15:09:54.525Z", "imagen_url": null, "updated_at": "2025-12-02T11:12:59.751Z", "descripcion": "asdasd", "tipo_medida": "volumen", "categoria_id": 6, "proveedor_id": null, "stock_actual": 100, "stock_maximo": null, "stock_minimo": 10, "es_perecedero": true, "precio_unitario": 500, "dias_vencimiento": 4, "precio_mayorista": 200, "unidad_productiva": {"id": 2, "codigo": "UP-BOVINOS", "nombre": "Granja Bovina"}, "es_produccion_propia": true, "unidad_productiva_id": 2}	\N	\N	2025-12-02 11:12:59.824-05
30	lotes_productos	26	UPDATE	\N	{"id": 26, "estado": "disponible", "cantidad": 20.00, "created_at": "2025-12-02T15:48:03.192", "codigo_lote": "BEEPS", "producto_id": 23, "fecha_produccion": "2025-12-02T10:47:36.214-05:00", "fecha_vencimiento": "2025-12-04T10:47:36.214-05:00", "unidad_productiva_id": 1}	{"id": 26, "estado": "retirado", "cantidad": 20.00, "created_at": "2025-12-02T15:48:03.192", "codigo_lote": "BEEPS", "producto_id": 23, "fecha_produccion": "2025-12-02T10:47:36.214-05:00", "fecha_vencimiento": "2025-12-04T10:47:36.214-05:00", "unidad_productiva_id": 1}	\N	\N	2025-12-02 11:45:28.91415-05
31	lotes_productos	26	UPDATE	1	{"id": 26, "estado": "retirado", "cantidad": 20.00, "created_at": "2025-12-02T15:48:03.192", "codigo_lote": "BEEPS", "producto_id": 23, "fecha_produccion": "2025-12-02T10:47:36.214-05:00", "fecha_vencimiento": "2025-12-04T10:47:36.214-05:00", "unidad_productiva_id": 1}	{"id": 26, "estado": "retirado", "cantidad": 20.00, "created_at": "2025-12-02T15:48:03.192", "codigo_lote": "BEEPS", "producto_id": 23, "fecha_produccion": "2025-12-02T10:47:36.214-05:00", "fecha_vencimiento": "2025-12-04T10:47:36.214-05:00", "unidad_productiva_id": 1}	\N	\N	2025-12-02 11:47:40.425334-05
32	lotes_productos	26	UPDATE	1	{"id": 26, "estado": "retirado", "cantidad": 20.00, "created_at": "2025-12-02T15:48:03.192", "codigo_lote": "BEEPS", "producto_id": 23, "fecha_produccion": "2025-12-02T10:47:36.214-05:00", "fecha_vencimiento": "2025-12-04T10:47:36.214-05:00", "unidad_productiva_id": 1}	{"id": 26, "estado": "disponible", "cantidad": 20.00, "created_at": "2025-12-02T15:48:03.192", "codigo_lote": "BEEPS", "producto_id": 23, "fecha_produccion": "2025-12-02T10:47:36.214-05:00", "fecha_vencimiento": "2025-12-04T10:47:36.214-05:00", "unidad_productiva_id": 1}	\N	\N	2025-12-02 11:48:51.053788-05
\.


--
-- TOC entry 5442 (class 0 OID 83466)
-- Dependencies: 274
-- Data for Name: cajas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cajas (id, codigo, nombre, ubicacion, tipo, activa, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5396 (class 0 OID 83007)
-- Dependencies: 224
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id, nombre, descripcion, icono, color, created_at) FROM stdin;
1	Hortalizas	Vegetales y verduras frescas	leaf	#059669	2025-12-01 22:39:21.223855
2	LÃ¡cteos	Leche y productos derivados	milk	#3B82F6	2025-12-01 22:39:21.223855
3	PanaderÃ­a	Pan y productos horneados	croissant	#F59E0B	2025-12-01 22:39:21.223855
4	CÃ¡rnicos	Carnes y embutidos	beef	#EF4444	2025-12-01 22:39:21.223855
5	Huevos	Huevos frescos	egg	#FBBF24	2025-12-01 22:39:21.223855
6	Frutas	Frutas frescas	apple	#EC4899	2025-12-01 22:39:21.223855
7	Insumos	Insumos agrÃ­colas y herramientas	package	#6B7280	2025-12-01 22:39:21.223855
8	Otros	Otros productos	shopping-bag	#8B5CF6	2025-12-01 22:39:21.223855
\.


--
-- TOC entry 5398 (class 0 OID 83017)
-- Dependencies: 226
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id, tipo_cliente, tipo_documento, numero_documento, nombre, apellido, email, telefono, direccion, ciudad, es_institucional, dependencia, total_compras, ultima_compra, activo, created_at, updated_at) FROM stdin;
1	ocasional	CC	1234567890	Cliente	General	cliente@example.com	3001234567	\N	\N	f	\N	0.00	\N	t	2025-12-01 22:41:47.53929	2025-12-01 22:41:47.53929
2	institucional	NIT	900123456	SENA Regional		regional@sena.edu.co	6015461500	\N	\N	t	\N	0.00	\N	t	2025-12-01 22:41:47.53929	2025-12-01 22:41:47.53929
\.


--
-- TOC entry 5400 (class 0 OID 83032)
-- Dependencies: 228
-- Data for Name: configuracion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracion (id, clave, valor, tipo, descripcion, updated_at) FROM stdin;
1	iva_porcentaje	19	number	Porcentaje de IVA aplicado a las ventas	2025-12-01 22:39:21.754135
3	dias_alerta_vencimiento	7	number	DÃ­as antes del vencimiento para alertar	2025-12-01 22:39:21.754135
4	nombre_tienda	AgroShop SENA	string	Nombre de la tienda	2025-12-01 22:39:21.754135
5	email_tienda	agroshop@sena.edu.co	string	Email de contacto	2025-12-01 22:39:21.754135
6	telefono_tienda	(601) 5461500	string	TelÃ©fono de contacto	2025-12-01 22:39:21.754135
\.


--
-- TOC entry 5402 (class 0 OID 83052)
-- Dependencies: 230
-- Data for Name: costos_produccion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.costos_produccion (id, producto_id, lote_id, costo_materia_prima, costo_mano_obra, costo_insumos, costo_energia, otros_costos, costo_total, cantidad_producida, costo_unitario, fecha_registro, observaciones, created_at) FROM stdin;
\.


--
-- TOC entry 5404 (class 0 OID 83068)
-- Dependencies: 232
-- Data for Name: descuentos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.descuentos (id, codigo, nombre, descripcion, tipo, valor, minimo_compra, maximo_descuento, aplica_a, categoria_id, producto_id, usos_maximos, usos_actuales, fecha_inicio, fecha_fin, solo_aprendices, solo_empleados, solo_institucional, activo, created_at) FROM stdin;
1	APRENDIZ10	Descuento Aprendices	Descuento del 10% para aprendices SENA	porcentaje	10.00	0.00	\N	\N	\N	\N	\N	0	\N	\N	t	f	f	t	2025-12-01 22:41:47.520843
2	EMPLEADO15	Descuento Empleados	Descuento del 15% para empleados SENA	porcentaje	15.00	0.00	\N	\N	\N	\N	\N	0	\N	\N	t	f	f	t	2025-12-01 22:41:47.520843
3	MAYORISTA	Descuento Mayorista	Descuento por compra mayor a $100,000	porcentaje	5.00	100000.00	\N	\N	\N	\N	\N	0	\N	\N	f	f	f	t	2025-12-01 22:41:47.520843
\.


--
-- TOC entry 5406 (class 0 OID 83083)
-- Dependencies: 234
-- Data for Name: descuentos_aplicados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.descuentos_aplicados (id, venta_id, descuento_id, monto_descuento, aplicado_por, fecha_aplicacion) FROM stdin;
\.


--
-- TOC entry 5408 (class 0 OID 83091)
-- Dependencies: 236
-- Data for Name: detalle_movimientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_movimientos (id, movimiento_id, producto_id, lote_id, cantidad, unidad) FROM stdin;
\.


--
-- TOC entry 5410 (class 0 OID 83098)
-- Dependencies: 238
-- Data for Name: detalle_solicitudes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_solicitudes (id, solicitud_id, producto_id, cantidad_solicitada, cantidad_aprobada, observaciones) FROM stdin;
\.


--
-- TOC entry 5412 (class 0 OID 83107)
-- Dependencies: 240
-- Data for Name: detalle_ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_ventas (id, venta_id, producto_id, lote_id, cantidad, precio_unitario, subtotal) FROM stdin;
\.


--
-- TOC entry 5450 (class 0 OID 83520)
-- Dependencies: 282
-- Data for Name: gastos_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gastos_caja (id, sesion_caja_id, monto, categoria_gasto, descripcion, beneficiario, comprobante_url, numero_factura, autorizado_por, fecha_gasto, observaciones) FROM stdin;
\.


--
-- TOC entry 5414 (class 0 OID 83114)
-- Dependencies: 242
-- Data for Name: historial_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_inventario (id, producto_id, tipo_movimiento, cantidad_anterior, cantidad_movimiento, cantidad_nueva, usuario_id, referencia_id, referencia_tipo, observaciones, fecha_movimiento) FROM stdin;
3	4	ajuste	0.00	20.00	20.00	\N	\N	\N	ActualizaciÃ³n automÃ¡tica de stock	2025-12-02 02:21:22.038259-05
4	4	entrada	0.00	20.00	20.00	\N	4	lote	Entrada de lote: O-202512-357	2025-12-02 02:21:22.038259-05
5	4	entrada	0.00	20.00	20.00	1	4	lote	Lote inicial creado: O-202512-357	2025-12-02 07:21:22.187-05
6	5	ajuste	0.00	20.00	20.00	\N	\N	\N	ActualizaciÃ³n automÃ¡tica de stock	2025-12-02 03:35:31.876847-05
7	5	entrada	0.00	20.00	20.00	\N	5	lote	Entrada de lote: K-202512-563	2025-12-02 03:35:31.876847-05
8	5	ajuste	20.00	20.00	40.00	\N	\N	\N	ActualizaciÃ³n automÃ¡tica de stock	2025-12-02 03:38:06.656378-05
9	5	entrada	20.00	20.00	40.00	\N	6	lote	Entrada de lote: ASDASDASAS	2025-12-02 03:38:06.656378-05
10	6	ajuste	0.00	15.00	15.00	\N	\N	\N	ActualizaciÃ³n automÃ¡tica de stock	2025-12-02 04:01:40.33338-05
11	6	entrada	0.00	15.00	15.00	\N	7	lote	Entrada de lote: L-202512-326	2025-12-02 04:01:40.33338-05
12	7	ajuste	0.00	12.00	12.00	\N	\N	\N	ActualizaciÃ³n automÃ¡tica de stock	2025-12-02 04:32:12.571284-05
13	7	entrada	0.00	12.00	12.00	\N	8	lote	Entrada de lote: A-202512-367	2025-12-02 04:32:12.571284-05
15	9	entrada	0.00	30.00	30.00	\N	10	lote	Entrada de lote: F-202512-620	2025-12-02 04:43:49.964644-05
14	8	entrada	0.00	303.00	303.00	1	9	lote	Entrada de lote: L-202512-165	2025-12-02 04:41:24.770619-05
16	8	salida	303.00	3.00	300.00	1	9	lote	Ajuste de cantidad en lote: L-202512-165	2025-12-02 05:18:18.111114-05
17	8	entrada	300.00	10.00	310.00	1	9	lote	Ajuste de cantidad en lote: L-202512-165	2025-12-02 05:25:10.819517-05
18	10	entrada	0.00	60.00	60.00	1	11	lote	Entrada de lote: R-202512-035	2025-12-02 05:38:00.719728-05
19	11	entrada	0.00	25.00	25.00	1	12	lote	Entrada de lote: Y-202512-424	2025-12-02 07:17:16.571349-05
20	12	entrada	0.00	60.00	60.00	1	13	lote	Entrada de lote: L-202512-164	2025-12-02 07:30:44.921714-05
21	13	entrada	0.00	30.00	30.00	1	14	lote	Entrada de lote: F-202512-199	2025-12-02 07:41:59.680069-05
22	14	entrada	0.00	30.00	30.00	1	15	lote	Entrada de lote: K-202512-685	2025-12-02 07:54:13.418143-05
23	15	entrada	0.00	123.00	123.00	1	16	lote	Entrada de lote: I-202512-290	2025-12-02 07:59:39.655195-05
24	16	entrada	0.00	20.00	20.00	1	17	lote	Entrada de lote: F-202512-679	2025-12-02 08:10:00.476075-05
25	17	entrada	0.00	32.00	32.00	1	18	lote	Entrada de lote: P-202512-054	2025-12-02 08:21:52.176043-05
26	18	entrada	0.00	30.00	30.00	1	19	lote	Entrada de lote: P-202512-502	2025-12-02 08:24:48.598419-05
27	19	entrada	0.00	50.00	50.00	1	20	lote	Entrada de lote: D-202512-605	2025-12-02 08:34:49.747137-05
28	20	entrada	0.00	40.00	40.00	1	21	lote	Entrada de lote: J-202512-755	2025-12-02 08:54:31.2677-05
29	20	entrada	40.00	2.00	42.00	1	21	lote	Ajuste de cantidad en lote: J-202512-755	2025-12-02 08:56:34.147304-05
30	21	entrada	0.00	30.00	30.00	1	22	lote	Entrada de lote: R-202512-553	2025-12-02 10:04:41.469044-05
31	22	entrada	0.00	60.00	60.00	1	23	lote	Entrada de lote: W-202512-103	2025-12-02 10:07:10.561209-05
32	23	entrada	0.00	60.00	60.00	1	24	lote	Entrada de lote: W-202512-654	2025-12-02 10:09:54.468568-05
33	15	entrada	123.00	30.00	153.00	\N	25	lote	Entrada de lote: KQWEQWEQ	2025-12-02 10:38:37.245361-05
34	15	salida	153.00	23.00	130.00	1	16	lote	Ajuste de cantidad en lote: I-202512-290	2025-12-02 10:45:03.300061-05
36	23	entrada	80.00	10.00	90.00	\N	27	lote	Entrada de lote: LOLSITO	2025-12-02 10:53:37.624291-05
37	23	entrada	90.00	5.00	95.00	\N	28	lote	Entrada de lote: LOLSITO2	2025-12-02 10:55:21.276042-05
38	23	entrada	95.00	5.00	100.00	\N	29	lote	Entrada de lote: PRUEBADEDOS	2025-12-02 11:05:38.245796-05
35	23	entrada	60.00	20.00	80.00	1	26	lote	Entrada de lote: BEEPS	2025-12-02 10:48:03.193076-05
39	23	salida	100.00	20.00	80.00	1	26	lote	Cambio de estado de lote: BEEPS de disponible a retirado	2025-12-02 11:30:09.927815-05
40	23	entrada	80.00	20.00	100.00	1	26	lote	Cambio de estado de lote: BEEPS de retirado a disponible	2025-12-02 11:30:33.706337-05
41	23	salida	100.00	20.00	80.00	1	26	lote	Cambio de estado de lote: BEEPS de disponible a vencido	2025-12-02 11:30:52.845779-05
42	23	entrada	80.00	20.00	100.00	1	26	lote	Cambio de estado de lote: BEEPS de vencido a disponible	2025-12-02 11:31:06.757974-05
43	23	salida	100.00	20.00	80.00	\N	26	lote	Cambio de estado de lote: BEEPS de disponible a retirado	2025-12-02 11:45:28.91415-05
44	23	entrada	80.00	20.00	100.00	\N	26	lote	Cambio de estado de lote: BEEPS de retirado a disponible	2025-12-02 11:48:51.053788-05
\.


--
-- TOC entry 5416 (class 0 OID 83124)
-- Dependencies: 244
-- Data for Name: lotes_productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lotes_productos (id, producto_id, codigo_lote, cantidad, fecha_produccion, fecha_vencimiento, unidad_productiva_id, estado, created_at) FROM stdin;
1	1	Y-202512-474-PEPE	30.00	2025-12-02 00:00:00-05	2025-12-17 00:00:00-05	6	disponible	2025-12-02 05:55:06.886
2	2	P-202512-358	30.00	2025-12-02 00:00:00-05	\N	2	disponible	2025-12-02 06:41:34.527
4	4	O-202512-357	20.00	2025-12-02 00:00:00-05	\N	3	disponible	2025-12-02 07:21:22.168
5	5	K-202512-563	20.00	2025-12-02 00:00:00-05	2025-12-03 00:00:00-05	3	disponible	2025-12-02 08:35:32.215
6	5	ASDASDASAS	20.00	2025-12-02 00:00:00-05	2025-12-03 00:00:00-05	6	disponible	2025-12-02 08:38:06.64
7	6	L-202512-326	15.00	2025-12-02 00:00:00-05	2025-12-15 00:00:00-05	3	disponible	2025-12-02 09:01:45.073
8	7	A-202512-367	12.00	2025-12-02 00:00:00-05	\N	4	disponible	2025-12-02 09:32:12.762
10	9	F-202512-620	30.00	2025-12-02 00:00:00-05	\N	2	disponible	2025-12-02 09:43:50.008
9	8	L-202512-165	310.00	2025-12-02 00:00:00-05	2025-12-12 00:00:00-05	2	disponible	2025-12-02 09:41:25.032
11	10	R-202512-035	60.00	2025-12-02 00:00:00-05	\N	3	disponible	2025-12-02 10:38:00.963
12	11	Y-202512-424	25.00	2025-12-02 00:00:00-05	\N	3	disponible	2025-12-02 12:17:17.203
13	12	L-202512-164	60.00	2025-12-02 00:00:00-05	2026-01-01 00:00:00-05	2	disponible	2025-12-02 12:30:45.246
14	13	F-202512-199	30.00	2025-12-02 00:00:00-05	2025-12-12 00:00:00-05	2	disponible	2025-12-02 12:42:00.248
15	14	K-202512-685	30.00	2025-12-02 00:00:00-05	\N	2	disponible	2025-12-02 12:54:13.799
17	16	F-202512-679	20.00	2025-12-02 00:00:00-05	2026-01-01 00:00:00-05	1	disponible	2025-12-02 13:10:00.85
18	17	P-202512-054	32.00	2025-12-02 00:00:00-05	2025-12-12 00:00:00-05	2	disponible	2025-12-02 13:21:54.253
19	18	P-202512-502	30.00	2025-12-02 00:00:00-05	2025-12-14 00:00:00-05	4	disponible	2025-12-02 13:24:48.926
20	19	D-202512-605	50.00	2025-12-02 08:34:01.655-05	2025-12-14 08:34:01.655-05	4	disponible	2025-12-02 13:34:50.037
21	20	J-202512-755	42.00	2025-12-02 08:53:32.371-05	2025-12-12 08:53:32.371-05	2	disponible	2025-12-02 13:54:31.518
22	21	R-202512-553	30.00	2025-12-02 10:03:22.572-05	2025-12-12 10:03:22.572-05	6	disponible	2025-12-02 15:04:41.792
23	22	W-202512-103	60.00	2025-12-02 10:06:08.425-05	\N	5	disponible	2025-12-02 15:07:10.606
24	23	W-202512-654	60.00	2025-12-05 00:00:00-05	2025-12-07 00:00:00-05	2	disponible	2025-12-02 15:09:54.552
25	15	KQWEQWEQ	30.00	2025-12-02 10:37:36.714-05	\N	4	disponible	2025-12-02 15:38:37.225
16	15	I-202512-290	100.00	2025-12-02 00:00:00-05	\N	4	disponible	2025-12-02 12:59:39.771
27	23	LOLSITO	10.00	2025-12-02 10:53:10.924-05	2025-12-04 10:53:10.924-05	1	disponible	2025-12-02 15:53:37.623
28	23	LOLSITO2	5.00	2025-12-02 10:55:02.411-05	2025-12-04 10:55:02.411-05	1	disponible	2025-12-02 15:55:21.275
29	23	PRUEBADEDOS	5.00	2025-12-12 00:00:00-05	2025-12-14 00:00:00-05	4	disponible	2025-12-02 16:05:38.245
26	23	BEEPS	20.00	2025-12-02 10:47:36.214-05	2025-12-04 10:47:36.214-05	1	disponible	2025-12-02 15:48:03.192
\.


--
-- TOC entry 5418 (class 0 OID 83133)
-- Dependencies: 246
-- Data for Name: metodos_pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metodos_pago (id, nombre, descripcion, activo, icono, created_at) FROM stdin;
1	Efectivo	Pago en efectivo	t	banknote	2025-12-01 22:39:21.535878
2	Nequi	Pago por Nequi	t	smartphone	2025-12-01 22:39:21.535878
3	Tarjeta	Pago con tarjeta dÃ©bito/crÃ©dito	t	credit-card	2025-12-01 22:39:21.535878
4	Transferencia	Transferencia bancaria	t	arrow-right-left	2025-12-01 22:39:21.535878
\.


--
-- TOC entry 5446 (class 0 OID 83498)
-- Dependencies: 278
-- Data for Name: movimientos_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimientos_caja (id, sesion_caja_id, venta_id, tipo_movimiento, metodo_pago, monto, descripcion, usuario_id, requiere_autorizacion, autorizado_por, fecha_movimiento) FROM stdin;
\.


--
-- TOC entry 5420 (class 0 OID 83144)
-- Dependencies: 248
-- Data for Name: movimientos_unidades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimientos_unidades (id, codigo_movimiento, unidad_origen_id, unidad_destino_id, usuario_id, fecha_movimiento, motivo, estado, observaciones, created_at) FROM stdin;
\.


--
-- TOC entry 5422 (class 0 OID 83156)
-- Dependencies: 250
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notificaciones (id, tipo, titulo, mensaje, prioridad, leida, usuario_id, referencia_id, referencia_tipo, created_at) FROM stdin;
\.


--
-- TOC entry 5424 (class 0 OID 83168)
-- Dependencies: 252
-- Data for Name: pagos_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagos_venta (id, venta_id, metodo_pago_id, monto, referencia, fecha_pago) FROM stdin;
\.


--
-- TOC entry 5426 (class 0 OID 83176)
-- Dependencies: 254
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id, codigo, nombre, descripcion, categoria_id, unidad_productiva_id, tipo_medida, unidad, precio_unitario, precio_mayorista, stock_actual, stock_minimo, stock_maximo, es_perecedero, dias_vencimiento, imagen_url, activo, created_at, updated_at, proveedor_id, es_produccion_propia) FROM stdin;
16	FINAL	Final	esta es una prueba	6	1	unidad	unidades	5000.00	2500.00	20.00	10.00	\N	t	30	\N	t	2025-12-02 13:10:00.558	2025-12-02 08:10:00.476075	\N	t
17	PROPIA	laPropia	esta es una descripcion de la nada	1	2	lote	batch	12000.00	6000.00	32.00	10.00	\N	t	10	\N	t	2025-12-02 13:21:52.432	2025-12-02 08:21:52.176043	\N	t
18	PATO	donald	este es un pato	4	4	peso	kg	5000.00	2500.00	30.00	10.00	\N	t	12	\N	t	2025-12-02 13:24:48.693	2025-12-02 08:24:48.598419	\N	t
1	PEPE	Yogurt	este producto es un yogurt	2	6	volumen	L	2000.00	1000.00	0.00	10.00	\N	t	15	\N	f	2025-12-02 05:55:06.561	2025-12-02 03:42:53.378927	\N	t
7	ASDA	prueba 2	esta es un a prueba 2	7	4	unidad	unidades	5000.00	1000.00	12.00	10.00	\N	f	\N	\N	t	2025-12-02 09:32:12.629	2025-12-02 04:32:12.571284	\N	t
20	JIRAFA	jirafa	esto es una jirafa	6	2	peso	kg	2000.00	1000.00	42.00	10.00	\N	t	10	\N	t	2025-12-02 13:54:31.349	2025-12-02 08:56:34.147304	\N	t
6	LALO	lulo	esto es un lulo	8	3	peso	kg	1000.00	500.00	15.00	5.00	\N	t	13	/productos/producto-1764666084414-gtl8qu.jpg	f	2025-12-02 09:01:42.799	2025-12-02 04:44:41.111384	\N	t
9	FRESA	Pepep	este es un peep	6	2	unidad	unidades	500.00	250.00	30.00	10.00	\N	f	\N	\N	f	2025-12-02 09:43:49.977	2025-12-02 04:44:47.26615	\N	t
5	KOLA	Fresa	esto es un contenido de fresas	6	3	unidad	unidades	500.00	100.00	40.00	20.00	\N	t	1	/productos/producto-1764664516789-eips98.jpg	f	2025-12-02 08:35:32.034	2025-12-02 04:44:50.575419	\N	t
2	PREUBA	prueba	este producto es de prueba	5	2	unidad	unidades	500.00	200.00	0.00	10.00	\N	f	\N	/productos/producto-1764657683459-o9urry.jpg	f	2025-12-02 06:41:34.41	2025-12-02 04:44:54.415334	\N	t
4	OTRO	piña	asdasdasds	6	3	peso	kg	1000.00	200.00	20.00	1.00	\N	f	\N	/productos/producto-1764659958848-cuphfn.jpg	f	2025-12-02 07:21:22.153	2025-12-02 04:44:57.785483	\N	t
19	DOOFY	doofy	este es doofy 	6	4	peso	kg	5000.00	2500.00	50.00	10.00	\N	t	12	\N	f	2025-12-02 13:34:49.828	2025-12-02 08:59:40.268667	\N	t
8	LOLITO	fedes	este es lolito de edicion	7	2	peso	kg	5000.00	2500.00	310.00	10.00	\N	t	10	/productos/producto-1764668478097-e6geo1.jpg	t	2025-12-02 09:41:24.846	2025-12-02 05:25:10.819517	\N	t
10	RATON	Perez	este es un raton 	6	3	unidad	unidades	3000.00	15000.00	60.00	5.00	\N	f	\N	\N	t	2025-12-02 10:38:00.764	2025-12-02 05:38:00.719728	\N	t
11	YUPI	holaBuenas	esta es una descripcion	6	3	unidad	unidades	5000.00	2000.00	25.00	10.00	\N	f	\N	\N	t	2025-12-02 12:17:17.009	2025-12-02 07:18:34.441544	\N	t
12	LOGO	PEPE	este es un pepe 	5	2	unidad	unidades	500.00	250.00	60.00	20.00	\N	t	30	\N	t	2025-12-02 12:30:44.998	2025-12-02 07:30:44.921714	\N	t
13	FRESA-PRUEBA	fresaPrueba	este producto de prueba	8	2	volumen	L	6000.00	3000.00	30.00	11.00	\N	t	10	\N	t	2025-12-02 12:42:00.036	2025-12-02 07:41:59.680069	\N	t
14	KOALA	koah	este es un koah	6	2	peso	g	1000.00	500.00	30.00	5.00	\N	f	\N	/productos/producto-1764680037391-0c254p.jpg	t	2025-12-02 12:54:13.569	2025-12-02 07:54:13.418143	\N	t
21	ROTO	YogurtV2	este yogurt de testing	2	6	volumen	L	4000.00	2000.00	30.00	10.00	\N	t	10	\N	t	2025-12-02 15:04:41.563	2025-12-02 10:04:41.469044	\N	t
22	WERE	Panv2	este pan es para testing	3	5	unidad	unidades	400.00	350.00	60.00	20.00	\N	f	\N	\N	t	2025-12-02 15:07:10.581	2025-12-02 10:07:10.561209	\N	t
15	IKA	calimito	es es un camilito 	4	4	peso	kg	5000.00	500.00	130.00	10.00	\N	f	\N	\N	t	2025-12-02 12:59:39.7	2025-12-02 10:45:03.300061	\N	t
23	WERE2	asdadsd	asdasd	6	2	volumen	L	500.00	200.00	100.00	10.00	\N	t	4	\N	t	2025-12-02 15:09:54.525	2025-12-02 11:48:51.053788	\N	t
\.


--
-- TOC entry 5428 (class 0 OID 83192)
-- Dependencies: 256
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proveedores (id, codigo, nombre, nit, contacto_nombre, contacto_email, contacto_telefono, direccion, ciudad, tipo_productos, activo, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5448 (class 0 OID 83509)
-- Dependencies: 280
-- Data for Name: retiros_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.retiros_caja (id, sesion_caja_id, monto, motivo, solicitado_por, autorizado_por, estado, fecha_solicitud, fecha_respuesta, observaciones, recibo_url, destino_fondos) FROM stdin;
\.


--
-- TOC entry 5430 (class 0 OID 83204)
-- Dependencies: 258
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre, descripcion, permisos, created_at, updated_at) FROM stdin;
1	Admin	Acceso total al sistema	{"all": true}	2025-12-01 22:39:21.162286	2025-12-01 22:39:21.162286
2	Inventarista	GestiÃ³n de inventario y movimientos	{"inventario": true, "movimientos": true}	2025-12-01 22:39:21.162286	2025-12-01 22:39:21.162286
3	Cajero	Solo punto de venta	{"pos": true, "ventas": true}	2025-12-01 22:39:21.162286	2025-12-01 22:39:21.162286
4	Consulta	Solo lectura	{"consulta": true, "reportes": true}	2025-12-01 22:39:21.162286	2025-12-01 22:39:21.162286
\.


--
-- TOC entry 5444 (class 0 OID 83477)
-- Dependencies: 276
-- Data for Name: sesiones_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sesiones_caja (id, codigo_sesion, caja_id, cajero_id, fecha_apertura, fondo_inicial, observaciones_apertura, fecha_cierre, estado, observaciones_cierre, total_ventas_efectivo, total_ventas_nequi, total_ventas_tarjeta, total_ventas_transferencia, total_ingresos_adicionales, total_retiros, total_gastos, efectivo_esperado, efectivo_contado, diferencia, desglose_efectivo, cuadrada, created_at) FROM stdin;
\.


--
-- TOC entry 5432 (class 0 OID 83216)
-- Dependencies: 260
-- Data for Name: solicitudes_transferencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solicitudes_transferencia (id, codigo_solicitud, unidad_solicitante_id, unidad_proveedora_id, usuario_solicitante_id, estado, fecha_solicitud, fecha_respuesta, usuario_respuesta_id, observaciones, motivo_rechazo) FROM stdin;
\.


--
-- TOC entry 5434 (class 0 OID 83227)
-- Dependencies: 262
-- Data for Name: turnos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.turnos (id, numero_turno, cliente_nombre, cliente_id, estado, cajero_id, fecha, hora_creacion, hora_atencion, hora_finalizacion) FROM stdin;
\.


--
-- TOC entry 5436 (class 0 OID 83237)
-- Dependencies: 264
-- Data for Name: unidades_productivas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unidades_productivas (id, codigo, nombre, descripcion, tipo, responsable_id, ubicacion, activa, created_at, updated_at) FROM stdin;
1	UP-HUERTA	Huerta OrgÃ¡nica	ProducciÃ³n de hortalizas y vegetales	Huerta	\N	\N	t	2025-12-01 22:39:21.202098	2025-12-01 22:39:21.202098
2	UP-BOVINOS	Granja Bovina	ProducciÃ³n de lÃ¡cteos y cÃ¡rnicos bovinos	Granja	\N	\N	t	2025-12-01 22:39:21.202098	2025-12-01 22:39:21.202098
3	UP-AVICOLA	Granja AvÃ­cola	ProducciÃ³n de huevos y carne de pollo	Granja	\N	\N	t	2025-12-01 22:39:21.202098	2025-12-01 22:39:21.202098
4	UP-PORCINOS	Granja Porcina	ProducciÃ³n de carne de cerdo	Granja	\N	\N	t	2025-12-01 22:39:21.202098	2025-12-01 22:39:21.202098
5	UP-PANADERIA	PanaderÃ­a SENA	ProducciÃ³n de pan y productos de panaderÃ­a	PanaderÃ­a	\N	\N	t	2025-12-01 22:39:21.202098	2025-12-01 22:39:21.202098
6	UP-LACTEOS	Planta de LÃ¡cteos	Procesamiento de leche y derivados	Procesamiento	\N	\N	t	2025-12-01 22:39:21.202098	2025-12-01 22:39:21.202098
\.


--
-- TOC entry 5438 (class 0 OID 83249)
-- Dependencies: 266
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre, apellido, email, password_hash, rol_id, activo, ultimo_acceso, created_at, updated_at) FROM stdin;
1	Administrador	SENA	admin@sena.edu.co	$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu	1	t	\N	2025-12-01 22:39:47.206336	2025-12-01 22:39:47.206336
2	Juan	Inventarista	inventario@sena.edu.co	$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu	2	t	\N	2025-12-01 22:39:47.217647	2025-12-01 22:39:47.217647
3	MarÃ­a	Cajera	cajero@sena.edu.co	$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu	3	t	\N	2025-12-01 22:39:47.219413	2025-12-01 22:39:47.219413
4	Pedro	Consultor	consulta@sena.edu.co	$2b$10$PGrp8s6406FlozE8HVocOebp7bXFkyeqc0AcG1LDQonpoDPlR4/Yu	4	t	\N	2025-12-01 22:39:47.220902	2025-12-01 22:39:47.220902
\.


--
-- TOC entry 5440 (class 0 OID 83261)
-- Dependencies: 268
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ventas (id, codigo_venta, usuario_id, fecha_venta, subtotal, impuesto, descuento, total, cliente_nombre, cliente_email, cliente_telefono, estado, requiere_factura, factura_generada, factura_url, observaciones, created_at, cliente_id) FROM stdin;
\.


--
-- TOC entry 5512 (class 0 OID 0)
-- Dependencies: 283
-- Name: arqueos_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.arqueos_caja_id_seq', 1, false);


--
-- TOC entry 5513 (class 0 OID 0)
-- Dependencies: 221
-- Name: auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditoria_id_seq', 32, true);


--
-- TOC entry 5514 (class 0 OID 0)
-- Dependencies: 273
-- Name: cajas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cajas_id_seq', 1, false);


--
-- TOC entry 5515 (class 0 OID 0)
-- Dependencies: 223
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_seq', 8, true);


--
-- TOC entry 5516 (class 0 OID 0)
-- Dependencies: 225
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clientes_id_seq', 2, true);


--
-- TOC entry 5517 (class 0 OID 0)
-- Dependencies: 227
-- Name: configuracion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.configuracion_id_seq', 6, true);


--
-- TOC entry 5518 (class 0 OID 0)
-- Dependencies: 229
-- Name: costos_produccion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.costos_produccion_id_seq', 1, false);


--
-- TOC entry 5519 (class 0 OID 0)
-- Dependencies: 233
-- Name: descuentos_aplicados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.descuentos_aplicados_id_seq', 1, false);


--
-- TOC entry 5520 (class 0 OID 0)
-- Dependencies: 231
-- Name: descuentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.descuentos_id_seq', 3, true);


--
-- TOC entry 5521 (class 0 OID 0)
-- Dependencies: 235
-- Name: detalle_movimientos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_movimientos_id_seq', 1, false);


--
-- TOC entry 5522 (class 0 OID 0)
-- Dependencies: 237
-- Name: detalle_solicitudes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_solicitudes_id_seq', 1, false);


--
-- TOC entry 5523 (class 0 OID 0)
-- Dependencies: 239
-- Name: detalle_ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_ventas_id_seq', 1, false);


--
-- TOC entry 5524 (class 0 OID 0)
-- Dependencies: 281
-- Name: gastos_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gastos_caja_id_seq', 1, false);


--
-- TOC entry 5525 (class 0 OID 0)
-- Dependencies: 241
-- Name: historial_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historial_inventario_id_seq', 44, true);


--
-- TOC entry 5526 (class 0 OID 0)
-- Dependencies: 243
-- Name: lotes_productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lotes_productos_id_seq', 29, true);


--
-- TOC entry 5527 (class 0 OID 0)
-- Dependencies: 245
-- Name: metodos_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metodos_pago_id_seq', 4, true);


--
-- TOC entry 5528 (class 0 OID 0)
-- Dependencies: 277
-- Name: movimientos_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_caja_id_seq', 1, false);


--
-- TOC entry 5529 (class 0 OID 0)
-- Dependencies: 247
-- Name: movimientos_unidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_unidades_id_seq', 1, false);


--
-- TOC entry 5530 (class 0 OID 0)
-- Dependencies: 249
-- Name: notificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notificaciones_id_seq', 1, false);


--
-- TOC entry 5531 (class 0 OID 0)
-- Dependencies: 251
-- Name: pagos_venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pagos_venta_id_seq', 1, false);


--
-- TOC entry 5532 (class 0 OID 0)
-- Dependencies: 253
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_seq', 23, true);


--
-- TOC entry 5533 (class 0 OID 0)
-- Dependencies: 255
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 1, false);


--
-- TOC entry 5534 (class 0 OID 0)
-- Dependencies: 279
-- Name: retiros_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.retiros_caja_id_seq', 1, false);


--
-- TOC entry 5535 (class 0 OID 0)
-- Dependencies: 257
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- TOC entry 5536 (class 0 OID 0)
-- Dependencies: 275
-- Name: sesiones_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sesiones_caja_id_seq', 1, false);


--
-- TOC entry 5537 (class 0 OID 0)
-- Dependencies: 259
-- Name: solicitudes_transferencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solicitudes_transferencia_id_seq', 1, false);


--
-- TOC entry 5538 (class 0 OID 0)
-- Dependencies: 261
-- Name: turnos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.turnos_id_seq', 1, false);


--
-- TOC entry 5539 (class 0 OID 0)
-- Dependencies: 263
-- Name: unidades_productivas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.unidades_productivas_id_seq', 6, true);


--
-- TOC entry 5540 (class 0 OID 0)
-- Dependencies: 265
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 4, true);


--
-- TOC entry 5541 (class 0 OID 0)
-- Dependencies: 267
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ventas_id_seq', 1, false);


--
-- TOC entry 5178 (class 2606 OID 83550)
-- Name: arqueos_caja arqueos_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arqueos_caja
    ADD CONSTRAINT arqueos_caja_pkey PRIMARY KEY (id);


--
-- TOC entry 5049 (class 2606 OID 83005)
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- TOC entry 5152 (class 2606 OID 83475)
-- Name: cajas cajas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_pkey PRIMARY KEY (id);


--
-- TOC entry 5052 (class 2606 OID 83015)
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- TOC entry 5054 (class 2606 OID 83030)
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- TOC entry 5060 (class 2606 OID 83040)
-- Name: configuracion configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 83066)
-- Name: costos_produccion costos_produccion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costos_produccion
    ADD CONSTRAINT costos_produccion_pkey PRIMARY KEY (id);


--
-- TOC entry 5072 (class 2606 OID 83089)
-- Name: descuentos_aplicados descuentos_aplicados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.descuentos_aplicados
    ADD CONSTRAINT descuentos_aplicados_pkey PRIMARY KEY (id);


--
-- TOC entry 5068 (class 2606 OID 83081)
-- Name: descuentos descuentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.descuentos
    ADD CONSTRAINT descuentos_pkey PRIMARY KEY (id);


--
-- TOC entry 5075 (class 2606 OID 83096)
-- Name: detalle_movimientos detalle_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_movimientos
    ADD CONSTRAINT detalle_movimientos_pkey PRIMARY KEY (id);


--
-- TOC entry 5077 (class 2606 OID 83105)
-- Name: detalle_solicitudes detalle_solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_solicitudes
    ADD CONSTRAINT detalle_solicitudes_pkey PRIMARY KEY (id);


--
-- TOC entry 5079 (class 2606 OID 83112)
-- Name: detalle_ventas detalle_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_pkey PRIMARY KEY (id);


--
-- TOC entry 5173 (class 2606 OID 83528)
-- Name: gastos_caja gastos_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_caja
    ADD CONSTRAINT gastos_caja_pkey PRIMARY KEY (id);


--
-- TOC entry 5081 (class 2606 OID 83122)
-- Name: historial_inventario historial_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 5090 (class 2606 OID 83131)
-- Name: lotes_productos lotes_productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lotes_productos
    ADD CONSTRAINT lotes_productos_pkey PRIMARY KEY (id);


--
-- TOC entry 5092 (class 2606 OID 83142)
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- TOC entry 5166 (class 2606 OID 83507)
-- Name: movimientos_caja movimientos_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_pkey PRIMARY KEY (id);


--
-- TOC entry 5098 (class 2606 OID 83154)
-- Name: movimientos_unidades movimientos_unidades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_unidades
    ADD CONSTRAINT movimientos_unidades_pkey PRIMARY KEY (id);


--
-- TOC entry 5103 (class 2606 OID 83166)
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 5107 (class 2606 OID 83174)
-- Name: pagos_venta pagos_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_venta
    ADD CONSTRAINT pagos_venta_pkey PRIMARY KEY (id);


--
-- TOC entry 5116 (class 2606 OID 83190)
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- TOC entry 5121 (class 2606 OID 83202)
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- TOC entry 5171 (class 2606 OID 83518)
-- Name: retiros_caja retiros_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retiros_caja
    ADD CONSTRAINT retiros_caja_pkey PRIMARY KEY (id);


--
-- TOC entry 5124 (class 2606 OID 83214)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5160 (class 2606 OID 83496)
-- Name: sesiones_caja sesiones_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_caja
    ADD CONSTRAINT sesiones_caja_pkey PRIMARY KEY (id);


--
-- TOC entry 5131 (class 2606 OID 83225)
-- Name: solicitudes_transferencia solicitudes_transferencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_transferencia
    ADD CONSTRAINT solicitudes_transferencia_pkey PRIMARY KEY (id);


--
-- TOC entry 5137 (class 2606 OID 83235)
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (id);


--
-- TOC entry 5140 (class 2606 OID 83247)
-- Name: unidades_productivas unidades_productivas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unidades_productivas
    ADD CONSTRAINT unidades_productivas_pkey PRIMARY KEY (id);


--
-- TOC entry 5143 (class 2606 OID 83259)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5149 (class 2606 OID 83275)
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- TOC entry 5150 (class 1259 OID 83551)
-- Name: cajas_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cajas_codigo_key ON public.cajas USING btree (codigo);


--
-- TOC entry 5050 (class 1259 OID 83571)
-- Name: categorias_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categorias_nombre_key ON public.categorias USING btree (nombre);


--
-- TOC entry 5058 (class 1259 OID 83572)
-- Name: configuracion_clave_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX configuracion_clave_key ON public.configuracion USING btree (clave);


--
-- TOC entry 5066 (class 1259 OID 83573)
-- Name: descuentos_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX descuentos_codigo_key ON public.descuentos USING btree (codigo);


--
-- TOC entry 5179 (class 1259 OID 83570)
-- Name: idx_arqueos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_arqueos_fecha ON public.arqueos_caja USING btree (fecha_arqueo);


--
-- TOC entry 5180 (class 1259 OID 83568)
-- Name: idx_arqueos_sesion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_arqueos_sesion ON public.arqueos_caja USING btree (sesion_caja_id);


--
-- TOC entry 5181 (class 1259 OID 83569)
-- Name: idx_arqueos_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_arqueos_tipo ON public.arqueos_caja USING btree (tipo_arqueo);


--
-- TOC entry 5153 (class 1259 OID 83552)
-- Name: idx_cajas_activa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cajas_activa ON public.cajas USING btree (activa);


--
-- TOC entry 5055 (class 1259 OID 83408)
-- Name: idx_clientes_documento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_documento ON public.clientes USING btree (numero_documento);


--
-- TOC entry 5056 (class 1259 OID 83409)
-- Name: idx_clientes_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_email ON public.clientes USING btree (email);


--
-- TOC entry 5057 (class 1259 OID 83410)
-- Name: idx_clientes_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_tipo ON public.clientes USING btree (tipo_cliente);


--
-- TOC entry 5063 (class 1259 OID 83430)
-- Name: idx_costos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_costos_fecha ON public.costos_produccion USING btree (fecha_registro);


--
-- TOC entry 5064 (class 1259 OID 83429)
-- Name: idx_costos_lote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_costos_lote ON public.costos_produccion USING btree (lote_id);


--
-- TOC entry 5065 (class 1259 OID 83428)
-- Name: idx_costos_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_costos_producto ON public.costos_produccion USING btree (producto_id);


--
-- TOC entry 5069 (class 1259 OID 83415)
-- Name: idx_descuentos_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_descuentos_activo ON public.descuentos USING btree (activo);


--
-- TOC entry 5073 (class 1259 OID 83416)
-- Name: idx_descuentos_aplicados_venta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_descuentos_aplicados_venta ON public.descuentos_aplicados USING btree (venta_id);


--
-- TOC entry 5070 (class 1259 OID 83414)
-- Name: idx_descuentos_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_descuentos_codigo ON public.descuentos USING btree (codigo);


--
-- TOC entry 5174 (class 1259 OID 83566)
-- Name: idx_gastos_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gastos_categoria ON public.gastos_caja USING btree (categoria_gasto);


--
-- TOC entry 5175 (class 1259 OID 83567)
-- Name: idx_gastos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gastos_fecha ON public.gastos_caja USING btree (fecha_gasto);


--
-- TOC entry 5176 (class 1259 OID 83565)
-- Name: idx_gastos_sesion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gastos_sesion ON public.gastos_caja USING btree (sesion_caja_id);


--
-- TOC entry 5082 (class 1259 OID 83864)
-- Name: idx_historial_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_fecha ON public.historial_inventario USING btree (fecha_movimiento);


--
-- TOC entry 5083 (class 1259 OID 83370)
-- Name: idx_historial_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_producto ON public.historial_inventario USING btree (producto_id);


--
-- TOC entry 5084 (class 1259 OID 83372)
-- Name: idx_historial_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_tipo ON public.historial_inventario USING btree (tipo_movimiento);


--
-- TOC entry 5085 (class 1259 OID 83354)
-- Name: idx_lotes_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lotes_estado ON public.lotes_productos USING btree (estado);


--
-- TOC entry 5086 (class 1259 OID 83352)
-- Name: idx_lotes_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lotes_producto ON public.lotes_productos USING btree (producto_id);


--
-- TOC entry 5087 (class 1259 OID 83853)
-- Name: idx_lotes_vencimiento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lotes_vencimiento ON public.lotes_productos USING btree (fecha_vencimiento);


--
-- TOC entry 5161 (class 1259 OID 83560)
-- Name: idx_movimientos_caja_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_caja_fecha ON public.movimientos_caja USING btree (fecha_movimiento);


--
-- TOC entry 5162 (class 1259 OID 83558)
-- Name: idx_movimientos_caja_sesion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_caja_sesion ON public.movimientos_caja USING btree (sesion_caja_id);


--
-- TOC entry 5163 (class 1259 OID 83559)
-- Name: idx_movimientos_caja_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_caja_tipo ON public.movimientos_caja USING btree (tipo_movimiento);


--
-- TOC entry 5164 (class 1259 OID 83561)
-- Name: idx_movimientos_caja_venta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_caja_venta ON public.movimientos_caja USING btree (venta_id);


--
-- TOC entry 5093 (class 1259 OID 83358)
-- Name: idx_movimientos_destino; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_destino ON public.movimientos_unidades USING btree (unidad_destino_id);


--
-- TOC entry 5094 (class 1259 OID 83966)
-- Name: idx_movimientos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_fecha ON public.movimientos_unidades USING btree (fecha_movimiento);


--
-- TOC entry 5095 (class 1259 OID 83357)
-- Name: idx_movimientos_origen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_origen ON public.movimientos_unidades USING btree (unidad_origen_id);


--
-- TOC entry 5099 (class 1259 OID 83377)
-- Name: idx_notificaciones_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notificaciones_fecha ON public.notificaciones USING btree (created_at);


--
-- TOC entry 5100 (class 1259 OID 83376)
-- Name: idx_notificaciones_leida; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notificaciones_leida ON public.notificaciones USING btree (leida);


--
-- TOC entry 5101 (class 1259 OID 83375)
-- Name: idx_notificaciones_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notificaciones_usuario ON public.notificaciones USING btree (usuario_id);


--
-- TOC entry 5104 (class 1259 OID 83368)
-- Name: idx_pagos_metodo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagos_metodo ON public.pagos_venta USING btree (metodo_pago_id);


--
-- TOC entry 5105 (class 1259 OID 83367)
-- Name: idx_pagos_venta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagos_venta ON public.pagos_venta USING btree (venta_id);


--
-- TOC entry 5108 (class 1259 OID 83350)
-- Name: idx_productos_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_activo ON public.productos USING btree (activo);


--
-- TOC entry 5109 (class 1259 OID 83348)
-- Name: idx_productos_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_categoria ON public.productos USING btree (categoria_id);


--
-- TOC entry 5110 (class 1259 OID 83347)
-- Name: idx_productos_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_codigo ON public.productos USING btree (codigo);


--
-- TOC entry 5111 (class 1259 OID 83401)
-- Name: idx_productos_descripcion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_descripcion ON public.productos USING gin (to_tsvector('spanish'::regconfig, descripcion));


--
-- TOC entry 5112 (class 1259 OID 83400)
-- Name: idx_productos_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_nombre ON public.productos USING gin (to_tsvector('spanish'::regconfig, (nombre)::text));


--
-- TOC entry 5113 (class 1259 OID 83349)
-- Name: idx_productos_unidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_unidad ON public.productos USING btree (unidad_productiva_id);


--
-- TOC entry 5117 (class 1259 OID 83419)
-- Name: idx_proveedores_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_activo ON public.proveedores USING btree (activo);


--
-- TOC entry 5118 (class 1259 OID 83418)
-- Name: idx_proveedores_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_codigo ON public.proveedores USING btree (codigo);


--
-- TOC entry 5167 (class 1259 OID 83563)
-- Name: idx_retiros_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retiros_estado ON public.retiros_caja USING btree (estado);


--
-- TOC entry 5168 (class 1259 OID 83564)
-- Name: idx_retiros_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retiros_fecha ON public.retiros_caja USING btree (fecha_solicitud);


--
-- TOC entry 5169 (class 1259 OID 83562)
-- Name: idx_retiros_sesion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retiros_sesion ON public.retiros_caja USING btree (sesion_caja_id);


--
-- TOC entry 5154 (class 1259 OID 83554)
-- Name: idx_sesiones_caja; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sesiones_caja ON public.sesiones_caja USING btree (caja_id);


--
-- TOC entry 5155 (class 1259 OID 83555)
-- Name: idx_sesiones_cajero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sesiones_cajero ON public.sesiones_caja USING btree (cajero_id);


--
-- TOC entry 5156 (class 1259 OID 83557)
-- Name: idx_sesiones_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sesiones_estado ON public.sesiones_caja USING btree (estado);


--
-- TOC entry 5157 (class 1259 OID 83556)
-- Name: idx_sesiones_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sesiones_fecha ON public.sesiones_caja USING btree (fecha_apertura);


--
-- TOC entry 5125 (class 1259 OID 83433)
-- Name: idx_solicitudes_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_estado ON public.solicitudes_transferencia USING btree (estado);


--
-- TOC entry 5126 (class 1259 OID 83436)
-- Name: idx_solicitudes_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_fecha ON public.solicitudes_transferencia USING btree (fecha_solicitud);


--
-- TOC entry 5127 (class 1259 OID 83435)
-- Name: idx_solicitudes_proveedora; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_proveedora ON public.solicitudes_transferencia USING btree (unidad_proveedora_id);


--
-- TOC entry 5128 (class 1259 OID 83434)
-- Name: idx_solicitudes_solicitante; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_solicitante ON public.solicitudes_transferencia USING btree (unidad_solicitante_id);


--
-- TOC entry 5132 (class 1259 OID 83440)
-- Name: idx_turnos_cajero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_turnos_cajero ON public.turnos USING btree (cajero_id);


--
-- TOC entry 5133 (class 1259 OID 83439)
-- Name: idx_turnos_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_turnos_estado ON public.turnos USING btree (estado);


--
-- TOC entry 5134 (class 1259 OID 83438)
-- Name: idx_turnos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_turnos_fecha ON public.turnos USING btree (fecha);


--
-- TOC entry 5144 (class 1259 OID 83364)
-- Name: idx_ventas_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ventas_estado ON public.ventas USING btree (estado);


--
-- TOC entry 5145 (class 1259 OID 84021)
-- Name: idx_ventas_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (fecha_venta);


--
-- TOC entry 5146 (class 1259 OID 83363)
-- Name: idx_ventas_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ventas_usuario ON public.ventas USING btree (usuario_id);


--
-- TOC entry 5088 (class 1259 OID 83574)
-- Name: lotes_productos_codigo_lote_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lotes_productos_codigo_lote_key ON public.lotes_productos USING btree (codigo_lote);


--
-- TOC entry 5096 (class 1259 OID 83575)
-- Name: movimientos_unidades_codigo_movimiento_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX movimientos_unidades_codigo_movimiento_key ON public.movimientos_unidades USING btree (codigo_movimiento);


--
-- TOC entry 5114 (class 1259 OID 83576)
-- Name: productos_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX productos_codigo_key ON public.productos USING btree (codigo);


--
-- TOC entry 5119 (class 1259 OID 83577)
-- Name: proveedores_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX proveedores_codigo_key ON public.proveedores USING btree (codigo);


--
-- TOC entry 5122 (class 1259 OID 83578)
-- Name: roles_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_nombre_key ON public.roles USING btree (nombre);


--
-- TOC entry 5158 (class 1259 OID 83553)
-- Name: sesiones_caja_codigo_sesion_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sesiones_caja_codigo_sesion_key ON public.sesiones_caja USING btree (codigo_sesion);


--
-- TOC entry 5129 (class 1259 OID 83579)
-- Name: solicitudes_transferencia_codigo_solicitud_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX solicitudes_transferencia_codigo_solicitud_key ON public.solicitudes_transferencia USING btree (codigo_solicitud);


--
-- TOC entry 5135 (class 1259 OID 83580)
-- Name: turnos_numero_turno_fecha_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX turnos_numero_turno_fecha_key ON public.turnos USING btree (numero_turno, fecha);


--
-- TOC entry 5138 (class 1259 OID 83581)
-- Name: unidades_productivas_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unidades_productivas_codigo_key ON public.unidades_productivas USING btree (codigo);


--
-- TOC entry 5141 (class 1259 OID 83582)
-- Name: usuarios_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);


--
-- TOC entry 5147 (class 1259 OID 83583)
-- Name: ventas_codigo_venta_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ventas_codigo_venta_key ON public.ventas USING btree (codigo_venta);


--
-- TOC entry 5243 (class 2620 OID 83457)
-- Name: ventas trigger_actualizar_compras_cliente; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_compras_cliente AFTER INSERT ON public.ventas FOR EACH ROW WHEN (((new.estado)::text = 'completada'::text)) EXECUTE FUNCTION public.actualizar_total_compras_cliente();


--
-- TOC entry 5230 (class 2620 OID 83461)
-- Name: detalle_ventas trigger_actualizar_stock_venta; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_stock_venta AFTER INSERT ON public.detalle_ventas FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock_venta();


--
-- TOC entry 5233 (class 2620 OID 84034)
-- Name: lotes_productos trigger_auditoria_lotes_productos; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auditoria_lotes_productos AFTER INSERT OR DELETE OR UPDATE ON public.lotes_productos FOR EACH ROW EXECUTE FUNCTION public.auditar_lotes_productos();


--
-- TOC entry 5542 (class 0 OID 0)
-- Dependencies: 5233
-- Name: TRIGGER trigger_auditoria_lotes_productos ON lotes_productos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trigger_auditoria_lotes_productos ON public.lotes_productos IS 'Registra automÃ¡ticamente INSERT, UPDATE y DELETE en auditoria';


--
-- TOC entry 5228 (class 2620 OID 83411)
-- Name: clientes trigger_clientes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- TOC entry 5229 (class 2620 OID 83464)
-- Name: configuracion trigger_configuracion_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- TOC entry 5237 (class 2620 OID 83399)
-- Name: productos trigger_generar_codigo_producto; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_generar_codigo_producto BEFORE INSERT ON public.productos FOR EACH ROW EXECUTE FUNCTION public.generar_codigo_producto();


--
-- TOC entry 5240 (class 2620 OID 83463)
-- Name: turnos trigger_generar_numero_turno; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_generar_numero_turno BEFORE INSERT ON public.turnos FOR EACH ROW WHEN ((new.numero_turno IS NULL)) EXECUTE FUNCTION public.generar_numero_turno();


--
-- TOC entry 5238 (class 2620 OID 83394)
-- Name: productos trigger_productos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- TOC entry 5239 (class 2620 OID 83420)
-- Name: proveedores trigger_proveedores_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- TOC entry 5234 (class 2620 OID 83836)
-- Name: lotes_productos trigger_sync_stock_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_sync_stock_delete AFTER DELETE ON public.lotes_productos FOR EACH ROW EXECUTE FUNCTION public.sync_stock_on_lote_delete();


--
-- TOC entry 5235 (class 2620 OID 83832)
-- Name: lotes_productos trigger_sync_stock_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_sync_stock_insert AFTER INSERT ON public.lotes_productos FOR EACH ROW EXECUTE FUNCTION public.sync_stock_on_lote_insert();


--
-- TOC entry 5236 (class 2620 OID 83834)
-- Name: lotes_productos trigger_sync_stock_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_sync_stock_update AFTER UPDATE ON public.lotes_productos FOR EACH ROW EXECUTE FUNCTION public.sync_stock_on_lote_update();


--
-- TOC entry 5231 (class 2620 OID 83814)
-- Name: detalle_ventas trigger_sync_stock_venta; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_sync_stock_venta AFTER INSERT ON public.detalle_ventas FOR EACH ROW EXECUTE FUNCTION public.sync_stock_on_venta();


--
-- TOC entry 5241 (class 2620 OID 83395)
-- Name: unidades_productivas trigger_unidades_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_unidades_updated_at BEFORE UPDATE ON public.unidades_productivas FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- TOC entry 5242 (class 2620 OID 83393)
-- Name: usuarios trigger_usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- TOC entry 5232 (class 2620 OID 83459)
-- Name: detalle_ventas trigger_validar_stock_venta; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validar_stock_venta BEFORE INSERT ON public.detalle_ventas FOR EACH ROW EXECUTE FUNCTION public.validar_stock_venta();


--
-- TOC entry 5226 (class 2606 OID 83744)
-- Name: arqueos_caja arqueos_caja_realizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arqueos_caja
    ADD CONSTRAINT arqueos_caja_realizado_por_fkey FOREIGN KEY (realizado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5227 (class 2606 OID 83739)
-- Name: arqueos_caja arqueos_caja_sesion_caja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arqueos_caja
    ADD CONSTRAINT arqueos_caja_sesion_caja_id_fkey FOREIGN KEY (sesion_caja_id) REFERENCES public.sesiones_caja(id);


--
-- TOC entry 5182 (class 2606 OID 83589)
-- Name: costos_produccion costos_produccion_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costos_produccion
    ADD CONSTRAINT costos_produccion_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes_productos(id);


--
-- TOC entry 5183 (class 2606 OID 83584)
-- Name: costos_produccion costos_produccion_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costos_produccion
    ADD CONSTRAINT costos_produccion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- TOC entry 5185 (class 2606 OID 83604)
-- Name: descuentos_aplicados descuentos_aplicados_descuento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.descuentos_aplicados
    ADD CONSTRAINT descuentos_aplicados_descuento_id_fkey FOREIGN KEY (descuento_id) REFERENCES public.descuentos(id);


--
-- TOC entry 5186 (class 2606 OID 83599)
-- Name: descuentos_aplicados descuentos_aplicados_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.descuentos_aplicados
    ADD CONSTRAINT descuentos_aplicados_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- TOC entry 5184 (class 2606 OID 83594)
-- Name: descuentos descuentos_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.descuentos
    ADD CONSTRAINT descuentos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- TOC entry 5187 (class 2606 OID 83619)
-- Name: detalle_movimientos detalle_movimientos_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_movimientos
    ADD CONSTRAINT detalle_movimientos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes_productos(id);


--
-- TOC entry 5188 (class 2606 OID 83609)
-- Name: detalle_movimientos detalle_movimientos_movimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_movimientos
    ADD CONSTRAINT detalle_movimientos_movimiento_id_fkey FOREIGN KEY (movimiento_id) REFERENCES public.movimientos_unidades(id);


--
-- TOC entry 5189 (class 2606 OID 83614)
-- Name: detalle_movimientos detalle_movimientos_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_movimientos
    ADD CONSTRAINT detalle_movimientos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- TOC entry 5190 (class 2606 OID 83629)
-- Name: detalle_solicitudes detalle_solicitudes_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_solicitudes
    ADD CONSTRAINT detalle_solicitudes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- TOC entry 5191 (class 2606 OID 83624)
-- Name: detalle_solicitudes detalle_solicitudes_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_solicitudes
    ADD CONSTRAINT detalle_solicitudes_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES public.solicitudes_transferencia(id);


--
-- TOC entry 5192 (class 2606 OID 83644)
-- Name: detalle_ventas detalle_ventas_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes_productos(id);


--
-- TOC entry 5193 (class 2606 OID 83639)
-- Name: detalle_ventas detalle_ventas_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- TOC entry 5194 (class 2606 OID 83634)
-- Name: detalle_ventas detalle_ventas_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- TOC entry 5224 (class 2606 OID 83734)
-- Name: gastos_caja gastos_caja_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_caja
    ADD CONSTRAINT gastos_caja_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5225 (class 2606 OID 83729)
-- Name: gastos_caja gastos_caja_sesion_caja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_caja
    ADD CONSTRAINT gastos_caja_sesion_caja_id_fkey FOREIGN KEY (sesion_caja_id) REFERENCES public.sesiones_caja(id);


--
-- TOC entry 5195 (class 2606 OID 83402)
-- Name: historial_inventario historial_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE SET NULL;


--
-- TOC entry 5196 (class 2606 OID 83649)
-- Name: lotes_productos lotes_productos_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lotes_productos
    ADD CONSTRAINT lotes_productos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- TOC entry 5197 (class 2606 OID 83654)
-- Name: lotes_productos lotes_productos_unidad_productiva_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lotes_productos
    ADD CONSTRAINT lotes_productos_unidad_productiva_id_fkey FOREIGN KEY (unidad_productiva_id) REFERENCES public.unidades_productivas(id);


--
-- TOC entry 5217 (class 2606 OID 83709)
-- Name: movimientos_caja movimientos_caja_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5218 (class 2606 OID 83694)
-- Name: movimientos_caja movimientos_caja_sesion_caja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_sesion_caja_id_fkey FOREIGN KEY (sesion_caja_id) REFERENCES public.sesiones_caja(id);


--
-- TOC entry 5219 (class 2606 OID 83704)
-- Name: movimientos_caja movimientos_caja_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- TOC entry 5220 (class 2606 OID 83699)
-- Name: movimientos_caja movimientos_caja_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- TOC entry 5198 (class 2606 OID 83664)
-- Name: movimientos_unidades movimientos_unidades_unidad_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_unidades
    ADD CONSTRAINT movimientos_unidades_unidad_destino_id_fkey FOREIGN KEY (unidad_destino_id) REFERENCES public.unidades_productivas(id);


--
-- TOC entry 5199 (class 2606 OID 83659)
-- Name: movimientos_unidades movimientos_unidades_unidad_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_unidades
    ADD CONSTRAINT movimientos_unidades_unidad_origen_id_fkey FOREIGN KEY (unidad_origen_id) REFERENCES public.unidades_productivas(id);


--
-- TOC entry 5200 (class 2606 OID 83669)
-- Name: movimientos_unidades movimientos_unidades_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_unidades
    ADD CONSTRAINT movimientos_unidades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- TOC entry 5201 (class 2606 OID 83679)
-- Name: pagos_venta pagos_venta_metodo_pago_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_venta
    ADD CONSTRAINT pagos_venta_metodo_pago_id_fkey FOREIGN KEY (metodo_pago_id) REFERENCES public.metodos_pago(id);


--
-- TOC entry 5202 (class 2606 OID 83674)
-- Name: pagos_venta pagos_venta_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_venta
    ADD CONSTRAINT pagos_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- TOC entry 5203 (class 2606 OID 83749)
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- TOC entry 5204 (class 2606 OID 83759)
-- Name: productos productos_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- TOC entry 5205 (class 2606 OID 83754)
-- Name: productos productos_unidad_productiva_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_unidad_productiva_id_fkey FOREIGN KEY (unidad_productiva_id) REFERENCES public.unidades_productivas(id);


--
-- TOC entry 5221 (class 2606 OID 83724)
-- Name: retiros_caja retiros_caja_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retiros_caja
    ADD CONSTRAINT retiros_caja_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5222 (class 2606 OID 83714)
-- Name: retiros_caja retiros_caja_sesion_caja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retiros_caja
    ADD CONSTRAINT retiros_caja_sesion_caja_id_fkey FOREIGN KEY (sesion_caja_id) REFERENCES public.sesiones_caja(id);


--
-- TOC entry 5223 (class 2606 OID 83719)
-- Name: retiros_caja retiros_caja_solicitado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retiros_caja
    ADD CONSTRAINT retiros_caja_solicitado_por_fkey FOREIGN KEY (solicitado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5215 (class 2606 OID 83684)
-- Name: sesiones_caja sesiones_caja_caja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_caja
    ADD CONSTRAINT sesiones_caja_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES public.cajas(id);


--
-- TOC entry 5216 (class 2606 OID 83689)
-- Name: sesiones_caja sesiones_caja_cajero_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_caja
    ADD CONSTRAINT sesiones_caja_cajero_id_fkey FOREIGN KEY (cajero_id) REFERENCES public.usuarios(id);


--
-- TOC entry 5206 (class 2606 OID 83769)
-- Name: solicitudes_transferencia solicitudes_transferencia_unidad_proveedora_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_transferencia
    ADD CONSTRAINT solicitudes_transferencia_unidad_proveedora_id_fkey FOREIGN KEY (unidad_proveedora_id) REFERENCES public.unidades_productivas(id);


--
-- TOC entry 5207 (class 2606 OID 83764)
-- Name: solicitudes_transferencia solicitudes_transferencia_unidad_solicitante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_transferencia
    ADD CONSTRAINT solicitudes_transferencia_unidad_solicitante_id_fkey FOREIGN KEY (unidad_solicitante_id) REFERENCES public.unidades_productivas(id);


--
-- TOC entry 5208 (class 2606 OID 83779)
-- Name: solicitudes_transferencia solicitudes_transferencia_usuario_respuesta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_transferencia
    ADD CONSTRAINT solicitudes_transferencia_usuario_respuesta_id_fkey FOREIGN KEY (usuario_respuesta_id) REFERENCES public.usuarios(id);


--
-- TOC entry 5209 (class 2606 OID 83774)
-- Name: solicitudes_transferencia solicitudes_transferencia_usuario_solicitante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_transferencia
    ADD CONSTRAINT solicitudes_transferencia_usuario_solicitante_id_fkey FOREIGN KEY (usuario_solicitante_id) REFERENCES public.usuarios(id);


--
-- TOC entry 5210 (class 2606 OID 83784)
-- Name: turnos turnos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- TOC entry 5211 (class 2606 OID 83789)
-- Name: unidades_productivas unidades_productivas_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unidades_productivas
    ADD CONSTRAINT unidades_productivas_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.usuarios(id);


--
-- TOC entry 5212 (class 2606 OID 83794)
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- TOC entry 5213 (class 2606 OID 83804)
-- Name: ventas ventas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- TOC entry 5214 (class 2606 OID 83799)
-- Name: ventas ventas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2025-12-03 16:00:47

--
-- PostgreSQL database dump complete
--

