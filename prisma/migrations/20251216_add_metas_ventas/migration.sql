-- CreateTable
CREATE TABLE "metas_ventas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "monto_objetivo" DECIMAL(12,2) NOT NULL,
    "anio" INTEGER NOT NULL,
    "activa" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_ventas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_metas_anio" ON "metas_ventas"("anio");
CREATE INDEX "idx_metas_activa" ON "metas_ventas"("activa");
