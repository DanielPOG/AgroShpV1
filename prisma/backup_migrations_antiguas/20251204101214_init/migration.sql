-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "tabla" VARCHAR(50) NOT NULL,
    "registro_id" INTEGER NOT NULL,
    "accion" VARCHAR(20) NOT NULL,
    "usuario_id" INTEGER,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "fecha" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "icono" VARCHAR(50),
    "color" VARCHAR(20),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "tipo_cliente" VARCHAR(20) DEFAULT 'ocasional',
    "tipo_documento" VARCHAR(20),
    "numero_documento" VARCHAR(50),
    "nombre" VARCHAR(150) NOT NULL,
    "apellido" VARCHAR(150),
    "email" VARCHAR(150),
    "telefono" VARCHAR(20),
    "direccion" TEXT,
    "ciudad" VARCHAR(100),
    "es_institucional" BOOLEAN DEFAULT false,
    "dependencia" VARCHAR(200),
    "total_compras" DECIMAL(10,2) DEFAULT 0,
    "ultima_compra" TIMESTAMP(6),
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" SERIAL NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "valor" TEXT,
    "tipo" VARCHAR(20),
    "descripcion" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costos_produccion" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER,
    "lote_id" INTEGER,
    "costo_materia_prima" DECIMAL(10,2) DEFAULT 0,
    "costo_mano_obra" DECIMAL(10,2) DEFAULT 0,
    "costo_insumos" DECIMAL(10,2) DEFAULT 0,
    "costo_energia" DECIMAL(10,2) DEFAULT 0,
    "otros_costos" DECIMAL(10,2) DEFAULT 0,
    "costo_total" DECIMAL(10,2),
    "cantidad_producida" DECIMAL(10,2) NOT NULL,
    "costo_unitario" DECIMAL(10,2),
    "fecha_registro" DATE DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "costos_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descuentos" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "tipo" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "minimo_compra" DECIMAL(10,2),
    "maximo_descuento" DECIMAL(10,2),
    "aplica_a" VARCHAR(20),
    "categoria_id" INTEGER,
    "producto_id" INTEGER,
    "usos_maximos" INTEGER,
    "usos_actuales" INTEGER DEFAULT 0,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "solo_aprendices" BOOLEAN DEFAULT false,
    "solo_empleados" BOOLEAN DEFAULT false,
    "solo_institucional" BOOLEAN DEFAULT false,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "descuentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descuentos_aplicados" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER,
    "descuento_id" INTEGER,
    "monto_descuento" DECIMAL(10,2) NOT NULL,
    "aplicado_por" INTEGER,
    "fecha_aplicacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "descuentos_aplicados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_movimientos" (
    "id" SERIAL NOT NULL,
    "movimiento_id" INTEGER,
    "producto_id" INTEGER,
    "lote_id" INTEGER,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" VARCHAR(20),

    CONSTRAINT "detalle_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_solicitudes" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER,
    "producto_id" INTEGER,
    "cantidad_solicitada" DECIMAL(10,2) NOT NULL,
    "cantidad_aprobada" DECIMAL(10,2),
    "observaciones" TEXT,

    CONSTRAINT "detalle_solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_ventas" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER,
    "producto_id" INTEGER,
    "lote_id" INTEGER,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalle_ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER,
    "tipo_movimiento" VARCHAR(30) NOT NULL,
    "cantidad_anterior" DECIMAL(10,2),
    "cantidad_movimiento" DECIMAL(10,2) NOT NULL,
    "cantidad_nueva" DECIMAL(10,2),
    "usuario_id" INTEGER,
    "referencia_id" INTEGER,
    "referencia_tipo" VARCHAR(30),
    "observaciones" TEXT,
    "fecha_movimiento" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes_productos" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER,
    "codigo_lote" VARCHAR(50) NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "fecha_produccion" TIMESTAMPTZ(6) NOT NULL,
    "fecha_vencimiento" TIMESTAMPTZ(6),
    "unidad_productiva_id" INTEGER,
    "estado" VARCHAR(20) DEFAULT 'disponible',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pago" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "icono" VARCHAR(50),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_unidades" (
    "id" SERIAL NOT NULL,
    "codigo_movimiento" VARCHAR(50) NOT NULL,
    "unidad_origen_id" INTEGER,
    "unidad_destino_id" INTEGER,
    "usuario_id" INTEGER,
    "fecha_movimiento" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "estado" VARCHAR(20) DEFAULT 'completado',
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "prioridad" VARCHAR(20) DEFAULT 'normal',
    "leida" BOOLEAN DEFAULT false,
    "usuario_id" INTEGER,
    "referencia_id" INTEGER,
    "referencia_tipo" VARCHAR(30),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_venta" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER,
    "metodo_pago_id" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,
    "referencia" VARCHAR(100),
    "fecha_pago" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ubicacion" VARCHAR(200),
    "tipo" VARCHAR(20) DEFAULT 'principal',
    "activa" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_caja" (
    "id" SERIAL NOT NULL,
    "codigo_sesion" VARCHAR(50) NOT NULL,
    "caja_id" INTEGER NOT NULL,
    "cajero_id" INTEGER NOT NULL,
    "fecha_apertura" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fondo_inicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observaciones_apertura" TEXT,
    "fecha_cierre" TIMESTAMP(6),
    "estado" VARCHAR(20) DEFAULT 'abierta',
    "observaciones_cierre" TEXT,
    "total_ventas_efectivo" DECIMAL(10,2) DEFAULT 0,
    "total_ventas_nequi" DECIMAL(10,2) DEFAULT 0,
    "total_ventas_tarjeta" DECIMAL(10,2) DEFAULT 0,
    "total_ventas_transferencia" DECIMAL(10,2) DEFAULT 0,
    "total_ingresos_adicionales" DECIMAL(10,2) DEFAULT 0,
    "total_retiros" DECIMAL(10,2) DEFAULT 0,
    "total_gastos" DECIMAL(10,2) DEFAULT 0,
    "efectivo_esperado" DECIMAL(10,2),
    "efectivo_contado" DECIMAL(10,2),
    "diferencia" DECIMAL(10,2),
    "desglose_efectivo" JSONB,
    "cuadrada" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" SERIAL NOT NULL,
    "sesion_caja_id" INTEGER NOT NULL,
    "venta_id" INTEGER,
    "tipo_movimiento" VARCHAR(20) NOT NULL,
    "metodo_pago" VARCHAR(20),
    "monto" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "usuario_id" INTEGER,
    "requiere_autorizacion" BOOLEAN DEFAULT false,
    "autorizado_por" INTEGER,
    "fecha_movimiento" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retiros_caja" (
    "id" SERIAL NOT NULL,
    "sesion_caja_id" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "motivo" VARCHAR(200) NOT NULL,
    "solicitado_por" INTEGER NOT NULL,
    "autorizado_por" INTEGER,
    "estado" VARCHAR(20) DEFAULT 'pendiente',
    "fecha_solicitud" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP(6),
    "observaciones" TEXT,
    "recibo_url" VARCHAR(500),
    "destino_fondos" VARCHAR(200),

    CONSTRAINT "retiros_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_caja" (
    "id" SERIAL NOT NULL,
    "sesion_caja_id" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "categoria_gasto" VARCHAR(100) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "beneficiario" VARCHAR(200),
    "comprobante_url" VARCHAR(500),
    "numero_factura" VARCHAR(100),
    "autorizado_por" INTEGER,
    "fecha_gasto" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "gastos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arqueos_caja" (
    "id" SERIAL NOT NULL,
    "sesion_caja_id" INTEGER NOT NULL,
    "tipo_arqueo" VARCHAR(20) NOT NULL,
    "realizado_por" INTEGER NOT NULL,
    "fecha_arqueo" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "billetes_100000" INTEGER DEFAULT 0,
    "billetes_50000" INTEGER DEFAULT 0,
    "billetes_20000" INTEGER DEFAULT 0,
    "billetes_10000" INTEGER DEFAULT 0,
    "billetes_5000" INTEGER DEFAULT 0,
    "billetes_2000" INTEGER DEFAULT 0,
    "billetes_1000" INTEGER DEFAULT 0,
    "monedas_1000" INTEGER DEFAULT 0,
    "monedas_500" INTEGER DEFAULT 0,
    "monedas_200" INTEGER DEFAULT 0,
    "monedas_100" INTEGER DEFAULT 0,
    "monedas_50" INTEGER DEFAULT 0,
    "total_contado" DECIMAL(10,2),
    "total_esperado" DECIMAL(10,2),
    "diferencia" DECIMAL(10,2),
    "observaciones" TEXT,

    CONSTRAINT "arqueos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "categoria_id" INTEGER,
    "unidad_productiva_id" INTEGER,
    "tipo_medida" VARCHAR(20) NOT NULL,
    "unidad" VARCHAR(20),
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "precio_mayorista" DECIMAL(10,2),
    "stock_actual" DECIMAL(10,2) DEFAULT 0,
    "stock_minimo" DECIMAL(10,2) DEFAULT 0,
    "stock_maximo" DECIMAL(10,2),
    "es_perecedero" BOOLEAN DEFAULT false,
    "dias_vencimiento" INTEGER,
    "imagen_url" VARCHAR(500),
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "proveedor_id" INTEGER,
    "es_produccion_propia" BOOLEAN DEFAULT true,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "nit" VARCHAR(50),
    "contacto_nombre" VARCHAR(150),
    "contacto_email" VARCHAR(150),
    "contacto_telefono" VARCHAR(20),
    "direccion" TEXT,
    "ciudad" VARCHAR(100),
    "tipo_productos" TEXT[],
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "permisos" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_transferencia" (
    "id" SERIAL NOT NULL,
    "codigo_solicitud" VARCHAR(50) NOT NULL,
    "unidad_solicitante_id" INTEGER,
    "unidad_proveedora_id" INTEGER,
    "usuario_solicitante_id" INTEGER,
    "estado" VARCHAR(20) DEFAULT 'pendiente',
    "fecha_solicitud" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP(6),
    "usuario_respuesta_id" INTEGER,
    "observaciones" TEXT,
    "motivo_rechazo" TEXT,

    CONSTRAINT "solicitudes_transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" SERIAL NOT NULL,
    "numero_turno" INTEGER NOT NULL,
    "cliente_nombre" VARCHAR(150),
    "cliente_id" INTEGER,
    "estado" VARCHAR(20) DEFAULT 'esperando',
    "cajero_id" INTEGER,
    "fecha" DATE DEFAULT CURRENT_DATE,
    "hora_creacion" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "hora_atencion" TIMESTAMPTZ(6),
    "hora_finalizacion" TIMESTAMPTZ(6),

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_productivas" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "tipo" VARCHAR(50),
    "responsable_id" INTEGER,
    "ubicacion" VARCHAR(200),
    "activa" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_productivas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol_id" INTEGER,
    "activo" BOOLEAN DEFAULT true,
    "ultimo_acceso" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "codigo_venta" VARCHAR(50) NOT NULL,
    "usuario_id" INTEGER,
    "fecha_venta" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "impuesto" DECIMAL(10,2) DEFAULT 0,
    "descuento" DECIMAL(10,2) DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "cliente_nombre" VARCHAR(150),
    "cliente_email" VARCHAR(150),
    "cliente_telefono" VARCHAR(20),
    "estado" VARCHAR(20) DEFAULT 'completada',
    "requiere_factura" BOOLEAN DEFAULT false,
    "factura_generada" BOOLEAN DEFAULT false,
    "factura_url" VARCHAR(500),
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "cliente_id" INTEGER,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE INDEX "idx_clientes_documento" ON "clientes"("numero_documento");

-- CreateIndex
CREATE INDEX "idx_clientes_email" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "idx_clientes_tipo" ON "clientes"("tipo_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_clave_key" ON "configuracion"("clave");

-- CreateIndex
CREATE INDEX "idx_costos_producto" ON "costos_produccion"("producto_id");

-- CreateIndex
CREATE INDEX "idx_costos_lote" ON "costos_produccion"("lote_id");

-- CreateIndex
CREATE INDEX "idx_costos_fecha" ON "costos_produccion"("fecha_registro");

-- CreateIndex
CREATE UNIQUE INDEX "descuentos_codigo_key" ON "descuentos"("codigo");

-- CreateIndex
CREATE INDEX "idx_descuentos_codigo" ON "descuentos"("codigo");

-- CreateIndex
CREATE INDEX "idx_descuentos_activo" ON "descuentos"("activo");

-- CreateIndex
CREATE INDEX "idx_descuentos_aplicados_venta" ON "descuentos_aplicados"("venta_id");

-- CreateIndex
CREATE INDEX "idx_historial_fecha" ON "historial_inventario"("fecha_movimiento");

-- CreateIndex
CREATE INDEX "idx_historial_producto" ON "historial_inventario"("producto_id");

-- CreateIndex
CREATE INDEX "idx_historial_tipo" ON "historial_inventario"("tipo_movimiento");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_productos_codigo_lote_key" ON "lotes_productos"("codigo_lote");

-- CreateIndex
CREATE INDEX "idx_lotes_estado" ON "lotes_productos"("estado");

-- CreateIndex
CREATE INDEX "idx_lotes_producto" ON "lotes_productos"("producto_id");

-- CreateIndex
CREATE INDEX "idx_lotes_vencimiento" ON "lotes_productos"("fecha_vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_unidades_codigo_movimiento_key" ON "movimientos_unidades"("codigo_movimiento");

-- CreateIndex
CREATE INDEX "idx_movimientos_destino" ON "movimientos_unidades"("unidad_destino_id");

-- CreateIndex
CREATE INDEX "idx_movimientos_fecha" ON "movimientos_unidades"("fecha_movimiento");

-- CreateIndex
CREATE INDEX "idx_movimientos_origen" ON "movimientos_unidades"("unidad_origen_id");

-- CreateIndex
CREATE INDEX "idx_notificaciones_fecha" ON "notificaciones"("created_at");

-- CreateIndex
CREATE INDEX "idx_notificaciones_leida" ON "notificaciones"("leida");

-- CreateIndex
CREATE INDEX "idx_notificaciones_usuario" ON "notificaciones"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_pagos_metodo" ON "pagos_venta"("metodo_pago_id");

-- CreateIndex
CREATE INDEX "idx_pagos_venta" ON "pagos_venta"("venta_id");

-- CreateIndex
CREATE UNIQUE INDEX "cajas_codigo_key" ON "cajas"("codigo");

-- CreateIndex
CREATE INDEX "idx_cajas_activa" ON "cajas"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_caja_codigo_sesion_key" ON "sesiones_caja"("codigo_sesion");

-- CreateIndex
CREATE INDEX "idx_sesiones_caja" ON "sesiones_caja"("caja_id");

-- CreateIndex
CREATE INDEX "idx_sesiones_cajero" ON "sesiones_caja"("cajero_id");

-- CreateIndex
CREATE INDEX "idx_sesiones_fecha" ON "sesiones_caja"("fecha_apertura");

-- CreateIndex
CREATE INDEX "idx_sesiones_estado" ON "sesiones_caja"("estado");

-- CreateIndex
CREATE INDEX "idx_movimientos_caja_sesion" ON "movimientos_caja"("sesion_caja_id");

-- CreateIndex
CREATE INDEX "idx_movimientos_caja_tipo" ON "movimientos_caja"("tipo_movimiento");

-- CreateIndex
CREATE INDEX "idx_movimientos_caja_fecha" ON "movimientos_caja"("fecha_movimiento");

-- CreateIndex
CREATE INDEX "idx_movimientos_caja_venta" ON "movimientos_caja"("venta_id");

-- CreateIndex
CREATE INDEX "idx_retiros_sesion" ON "retiros_caja"("sesion_caja_id");

-- CreateIndex
CREATE INDEX "idx_retiros_estado" ON "retiros_caja"("estado");

-- CreateIndex
CREATE INDEX "idx_retiros_fecha" ON "retiros_caja"("fecha_solicitud");

-- CreateIndex
CREATE INDEX "idx_gastos_sesion" ON "gastos_caja"("sesion_caja_id");

-- CreateIndex
CREATE INDEX "idx_gastos_categoria" ON "gastos_caja"("categoria_gasto");

-- CreateIndex
CREATE INDEX "idx_gastos_fecha" ON "gastos_caja"("fecha_gasto");

-- CreateIndex
CREATE INDEX "idx_arqueos_sesion" ON "arqueos_caja"("sesion_caja_id");

-- CreateIndex
CREATE INDEX "idx_arqueos_tipo" ON "arqueos_caja"("tipo_arqueo");

-- CreateIndex
CREATE INDEX "idx_arqueos_fecha" ON "arqueos_caja"("fecha_arqueo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE INDEX "idx_productos_activo" ON "productos"("activo");

-- CreateIndex
CREATE INDEX "idx_productos_categoria" ON "productos"("categoria_id");

-- CreateIndex
CREATE INDEX "idx_productos_codigo" ON "productos"("codigo");

-- CreateIndex
CREATE INDEX "idx_productos_unidad" ON "productos"("unidad_productiva_id");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_codigo_key" ON "proveedores"("codigo");

-- CreateIndex
CREATE INDEX "idx_proveedores_codigo" ON "proveedores"("codigo");

-- CreateIndex
CREATE INDEX "idx_proveedores_activo" ON "proveedores"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_transferencia_codigo_solicitud_key" ON "solicitudes_transferencia"("codigo_solicitud");

-- CreateIndex
CREATE INDEX "idx_solicitudes_estado" ON "solicitudes_transferencia"("estado");

-- CreateIndex
CREATE INDEX "idx_solicitudes_solicitante" ON "solicitudes_transferencia"("unidad_solicitante_id");

-- CreateIndex
CREATE INDEX "idx_solicitudes_proveedora" ON "solicitudes_transferencia"("unidad_proveedora_id");

-- CreateIndex
CREATE INDEX "idx_solicitudes_fecha" ON "solicitudes_transferencia"("fecha_solicitud");

-- CreateIndex
CREATE INDEX "idx_turnos_fecha" ON "turnos"("fecha");

-- CreateIndex
CREATE INDEX "idx_turnos_estado" ON "turnos"("estado");

-- CreateIndex
CREATE INDEX "idx_turnos_cajero" ON "turnos"("cajero_id");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_numero_turno_fecha_key" ON "turnos"("numero_turno", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_productivas_codigo_key" ON "unidades_productivas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_codigo_venta_key" ON "ventas"("codigo_venta");

-- CreateIndex
CREATE INDEX "idx_ventas_estado" ON "ventas"("estado");

-- CreateIndex
CREATE INDEX "idx_ventas_fecha" ON "ventas"("fecha_venta");

-- CreateIndex
CREATE INDEX "idx_ventas_usuario" ON "ventas"("usuario_id");

-- AddForeignKey
ALTER TABLE "costos_produccion" ADD CONSTRAINT "costos_produccion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "costos_produccion" ADD CONSTRAINT "costos_produccion_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes_productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "descuentos_aplicados" ADD CONSTRAINT "descuentos_aplicados_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "descuentos_aplicados" ADD CONSTRAINT "descuentos_aplicados_descuento_id_fkey" FOREIGN KEY ("descuento_id") REFERENCES "descuentos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_movimientos" ADD CONSTRAINT "detalle_movimientos_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimientos_unidades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_movimientos" ADD CONSTRAINT "detalle_movimientos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_movimientos" ADD CONSTRAINT "detalle_movimientos_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes_productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_solicitudes" ADD CONSTRAINT "detalle_solicitudes_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_transferencia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_solicitudes" ADD CONSTRAINT "detalle_solicitudes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_ventas" ADD CONSTRAINT "detalle_ventas_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_ventas" ADD CONSTRAINT "detalle_ventas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_ventas" ADD CONSTRAINT "detalle_ventas_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes_productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historial_inventario" ADD CONSTRAINT "historial_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lotes_productos" ADD CONSTRAINT "lotes_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lotes_productos" ADD CONSTRAINT "lotes_productos_unidad_productiva_id_fkey" FOREIGN KEY ("unidad_productiva_id") REFERENCES "unidades_productivas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_unidades" ADD CONSTRAINT "movimientos_unidades_unidad_origen_id_fkey" FOREIGN KEY ("unidad_origen_id") REFERENCES "unidades_productivas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_unidades" ADD CONSTRAINT "movimientos_unidades_unidad_destino_id_fkey" FOREIGN KEY ("unidad_destino_id") REFERENCES "unidades_productivas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_unidades" ADD CONSTRAINT "movimientos_unidades_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos_venta" ADD CONSTRAINT "pagos_venta_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos_venta" ADD CONSTRAINT "pagos_venta_metodo_pago_id_fkey" FOREIGN KEY ("metodo_pago_id") REFERENCES "metodos_pago"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "cajas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_autorizado_por_fkey" FOREIGN KEY ("autorizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "retiros_caja" ADD CONSTRAINT "retiros_caja_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "retiros_caja" ADD CONSTRAINT "retiros_caja_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "retiros_caja" ADD CONSTRAINT "retiros_caja_autorizado_por_fkey" FOREIGN KEY ("autorizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "gastos_caja" ADD CONSTRAINT "gastos_caja_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "gastos_caja" ADD CONSTRAINT "gastos_caja_autorizado_por_fkey" FOREIGN KEY ("autorizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "arqueos_caja" ADD CONSTRAINT "arqueos_caja_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "arqueos_caja" ADD CONSTRAINT "arqueos_caja_realizado_por_fkey" FOREIGN KEY ("realizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidad_productiva_id_fkey" FOREIGN KEY ("unidad_productiva_id") REFERENCES "unidades_productivas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudes_transferencia" ADD CONSTRAINT "solicitudes_transferencia_unidad_solicitante_id_fkey" FOREIGN KEY ("unidad_solicitante_id") REFERENCES "unidades_productivas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudes_transferencia" ADD CONSTRAINT "solicitudes_transferencia_unidad_proveedora_id_fkey" FOREIGN KEY ("unidad_proveedora_id") REFERENCES "unidades_productivas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudes_transferencia" ADD CONSTRAINT "solicitudes_transferencia_usuario_solicitante_id_fkey" FOREIGN KEY ("usuario_solicitante_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudes_transferencia" ADD CONSTRAINT "solicitudes_transferencia_usuario_respuesta_id_fkey" FOREIGN KEY ("usuario_respuesta_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unidades_productivas" ADD CONSTRAINT "unidades_productivas_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
