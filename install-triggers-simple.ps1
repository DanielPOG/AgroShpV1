# Script simple para instalar triggers
# Ejecutar: .\database\install-triggers-simple.ps1

Write-Host "Instalando triggers de sincronización de stock..." -ForegroundColor Cyan
Write-Host ""

# Cargar variables de entorno
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#].+?)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✓ Variables de entorno cargadas" -ForegroundColor Green
}

$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "ERROR: DATABASE_URL no encontrado en .env" -ForegroundColor Red
    exit 1
}

Write-Host "✓ DATABASE_URL encontrado" -ForegroundColor Green
Write-Host ""

# Leer archivo SQL
$sqlFile = "database\trigger-sync-stock-lotes.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: No se encuentra $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Ejecutando $sqlFile..." -ForegroundColor Yellow

try {
    # Usar psql
    $content = Get-Content $sqlFile -Raw
    $content | psql $dbUrl 2>&1 | Out-Host
    
    Write-Host ""
    Write-Host "✓ Triggers instalados correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Los siguientes triggers están activos:" -ForegroundColor Cyan
    Write-Host "  • trigger_sync_stock_insert  - Suma stock al crear lote" -ForegroundColor White
    Write-Host "  • trigger_sync_stock_update  - Ajusta stock al modificar lote" -ForegroundColor White
    Write-Host "  • trigger_sync_stock_venta   - Descuenta stock al vender" -ForegroundColor White
    Write-Host "  • trigger_sync_stock_delete  - Resta stock al eliminar lote" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "ERROR: No se pudieron instalar los triggers" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "NOTA: Los triggers NO son obligatorios." -ForegroundColor Yellow
    Write-Host "El código de la aplicación actualiza el stock manualmente." -ForegroundColor Yellow
    exit 1
}
