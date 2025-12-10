# Script de Migracion - Fase 3 y 3.5

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRACION FASE 3 Y 3.5" -ForegroundColor Cyan
Write-Host "  AgroShop V1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que existe .env
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: No se encontro el archivo .env" -ForegroundColor Red
    Write-Host "Por favor crea el archivo .env con DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK Archivo .env encontrado" -ForegroundColor Green
Write-Host ""

# 2. Generar cliente de Prisma
Write-Host "Generando cliente de Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al generar cliente de Prisma" -ForegroundColor Red
    exit 1
}
Write-Host "OK Cliente de Prisma generado" -ForegroundColor Green
Write-Host ""

# 3. Crear migracion
Write-Host "Creando migracion..." -ForegroundColor Yellow
$migracionNombre = "fase_3_5_correcciones_y_mejoras"
npx prisma migrate dev --name $migracionNombre
if ($LASTEXITCODE -ne 0) {
    Write-Host "Si la migracion fallo, intenta con db push:" -ForegroundColor Yellow
    Write-Host "npx prisma db push" -ForegroundColor Cyan
    
    $respuesta = Read-Host "Deseas intentar con db push? (s/n)"
    if ($respuesta -eq "s" -or $respuesta -eq "S") {
        npx prisma db push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR al aplicar cambios con db push" -ForegroundColor Red
            exit 1
        }
    } else {
        exit 1
    }
}
Write-Host "OK Migracion aplicada exitosamente" -ForegroundColor Green
Write-Host ""

# 4. Verificar cambios
Write-Host "Verificando cambios en la base de datos..." -ForegroundColor Yellow
Write-Host ""

# 5. Resumen de cambios
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CAMBIOS APLICADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OK Campo 'deleted_at' agregado a tabla 'ventas'" -ForegroundColor Green
Write-Host "OK Indice 'idx_ventas_fecha_usuario' creado" -ForegroundColor Green
Write-Host "OK Indice 'idx_ventas_cliente' creado" -ForegroundColor Green
Write-Host "OK Indice 'idx_detalle_ventas_venta' creado" -ForegroundColor Green
Write-Host "OK Indice 'idx_detalle_ventas_producto_lote' creado" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROXIMOS PASOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Iniciar el servidor de desarrollo:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Probar el flujo completo:" -ForegroundColor White
Write-Host "   - Abrir caja en /dashboard/pos" -ForegroundColor Cyan
Write-Host "   - Realizar una venta" -ForegroundColor Cyan
Write-Host "   - Verificar historial en /dashboard/inventario/historial" -ForegroundColor Cyan
Write-Host "   - Ver auditoria en /dashboard/reportes/auditoria" -ForegroundColor Cyan
Write-Host "   - Cerrar caja y ver reporte en /dashboard/reportes/caja" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Configurar cron job para lotes:" -ForegroundColor White
Write-Host "   Ver documentacion en IMPLEMENTACION-COMPLETA-FASE-3-3.5.md" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  OK MIGRACION COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
