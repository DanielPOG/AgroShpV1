# Script para limpiar alertas duplicadas en la base de datos
# Ejecutar con: .\limpiar-alertas.ps1

Write-Host "🧹 Limpiando alertas duplicadas..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar el script de limpieza
npx ts-node scripts/limpiar-alertas-duplicadas.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Limpieza completada exitosamente!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error durante la limpieza" -ForegroundColor Red
    exit 1
}
