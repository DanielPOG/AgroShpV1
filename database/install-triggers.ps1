# Script para instalar triggers de sincronización de stock
# Ejecutar desde: database/install-triggers.ps1

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   INSTALANDO TRIGGERS DE SINCRONIZACIÓN STOCK   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que DATABASE_URL exista
if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: Variable de entorno DATABASE_URL no encontrada" -ForegroundColor Red
    Write-Host "Carga las variables de entorno primero con: " -ForegroundColor Yellow
    Write-Host "Get-Content ..\.env | ForEach-Object { if (`$_ -match '^([^#].+?)=(.+)`$') { `$env:`$matches[1] = `$matches[2] } }" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ DATABASE_URL encontrado" -ForegroundColor Green
Write-Host ""

# Ejecutar archivo SQL
Write-Host "Instalando triggers desde: trigger-sync-stock-lotes.sql" -ForegroundColor Yellow

try {
    $content = Get-Content "trigger-sync-stock-lotes.sql" -Raw
    $content | psql $env:DATABASE_URL
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host "   ✓ TRIGGERS INSTALADOS EXITOSAMENTE           " -ForegroundColor Green
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Triggers instalados:" -ForegroundColor Cyan
        Write-Host "  1. trigger_sync_stock_insert  - Al crear lote" -ForegroundColor White
        Write-Host "  2. trigger_sync_stock_update  - Al actualizar lote" -ForegroundColor White
        Write-Host "  3. trigger_sync_stock_venta   - Al vender producto" -ForegroundColor White
        Write-Host "  4. trigger_sync_stock_delete  - Al eliminar lote" -ForegroundColor White
        Write-Host ""
        Write-Host "El stock_actual de productos ahora se sincroniza automáticamente con los lotes" -ForegroundColor Green
    } else {
        throw "Error al ejecutar SQL"
    }
} catch {
    Write-Host ""
    Write-Host "ERROR al instalar triggers:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
