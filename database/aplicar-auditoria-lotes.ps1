# Script para aplicar trigger de auditoría de lotes
# Asegúrate de tener las variables de entorno configuradas

Write-Host "🔧 Aplicando trigger de auditoría para lotes..." -ForegroundColor Cyan

# Verificar que existe la variable de entorno DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "❌ Error: Variable DATABASE_URL no encontrada" -ForegroundColor Red
    Write-Host "Configura la variable de entorno DATABASE_URL antes de ejecutar este script" -ForegroundColor Yellow
    exit 1
}

# Ejecutar el script SQL
Write-Host "📝 Ejecutando trigger-auditoria-lotes.sql..." -ForegroundColor Yellow

try {
    # Usar psql para ejecutar el script
    $scriptPath = Join-Path $PSScriptRoot "trigger-auditoria-lotes.sql"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "❌ Error: No se encontró el archivo trigger-auditoria-lotes.sql" -ForegroundColor Red
        exit 1
    }
    
    # Ejecutar con psql (asumiendo que está en el PATH)
    psql $env:DATABASE_URL -f $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Trigger de auditoría aplicado exitosamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Ahora todos los cambios en lotes_productos se registrarán automáticamente en la tabla 'auditoria'" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Consultas útiles:" -ForegroundColor Yellow
        Write-Host "  • Ver auditoría de un lote:" -ForegroundColor White
        Write-Host "    SELECT * FROM auditoria WHERE tabla = 'lotes_productos' AND registro_id = 1 ORDER BY fecha DESC;" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  • Ver cambios de estado:" -ForegroundColor White
        Write-Host "    SELECT registro_id, datos_anteriores->>'estado' as anterior, datos_nuevos->>'estado' as nuevo, fecha" -ForegroundColor Gray
        Write-Host "    FROM auditoria WHERE tabla = 'lotes_productos' AND accion = 'UPDATE' ORDER BY fecha DESC;" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error al aplicar el trigger" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
