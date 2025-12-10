# ============================================
# EJECUTAR: Deshabilitar trigger que causa doble descuento
# ============================================

Write-Host ""
Write-Host "=== SOLUCION: Deshabilitar trigger doble descuento ===" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD = "root"

$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "Deshabilitando trigger_sync_stock_venta..." -ForegroundColor Yellow
    Write-Host ""
    
    psql -h localhost -p 5432 -U postgres -d agroshop_db -f "deshabilitar-trigger-doble-descuento.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "OK Trigger deshabilitado correctamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "Ahora el flujo sera:" -ForegroundColor Cyan
        Write-Host "1. descontarStockDeLotes() -> UPDATE lotes" -ForegroundColor Gray
        Write-Host "2. Trigger de lotes -> UPDATE productos.stock_actual" -ForegroundColor Gray
        Write-Host "3. INSERT detalle_ventas -> NO descuenta (trigger deshabilitado)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Resultado: UN SOLO descuento" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "ERROR al deshabilitar trigger" -ForegroundColor Red
    }
}
else {
    Write-Host "ERROR: psql no disponible" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usa pgAdmin y ejecuta:" -ForegroundColor Yellow
    Write-Host "ALTER TABLE detalle_ventas DISABLE TRIGGER trigger_sync_stock_venta;" -ForegroundColor Cyan
}

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Presiona Enter..." -ForegroundColor Gray
Read-Host
