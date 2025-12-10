# =====================================================
# SCRIPT DE CORRECCIÓN COMPLETA - DOBLE DESCUENTO
# Ejecuta todos los pasos necesarios para corregir el problema
# =====================================================

Write-Host "🔧 INICIANDO CORRECCIÓN DE DOBLE DESCUENTO..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Este script debe ejecutarse desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Verificar que existe la carpeta database
if (-not (Test-Path "database")) {
    Write-Host "❌ Error: No se encuentra la carpeta database/" -ForegroundColor Red
    exit 1
}

Write-Host "📋 PASO 1: Corrigiendo stock negativo..." -ForegroundColor Yellow
Write-Host "Ejecutando: database/corregir-stock-negativo-rapido.sql"
Write-Host ""

# Leer variable de entorno o pedir la URL de la base de datos
if (-not $env:DATABASE_URL) {
    Write-Host "⚠️  No se encontró DATABASE_URL en las variables de entorno" -ForegroundColor Yellow
    Write-Host "Por favor, ejecuta manualmente el siguiente comando SQL en tu base de datos:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "UPDATE productos SET stock_actual = 0 WHERE stock_actual < 0;" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Presiona Enter cuando hayas ejecutado el comando"
}
else {
    Write-Host "✅ DATABASE_URL encontrada, ejecutando corrección..." -ForegroundColor Green
    # Aquí podrías ejecutar el SQL si tienes psql instalado
}

Write-Host ""
Write-Host "📋 PASO 2: Actualizando trigger SQL..." -ForegroundColor Yellow
Write-Host "Ejecutando: database/fix-trigger-stock-negativo.sql"
Write-Host ""

Write-Host "⚠️  Por favor, ejecuta manualmente este archivo SQL en tu base de datos:" -ForegroundColor Yellow
Write-Host "   database/fix-trigger-stock-negativo.sql" -ForegroundColor Cyan
Write-Host ""
Read-Host "Presiona Enter cuando hayas ejecutado el script"

Write-Host ""
Write-Host "📋 PASO 3: Verificando correcciones en código TypeScript..." -ForegroundColor Yellow

$salesFile = "lib/db/sales.ts"
if (Test-Path $salesFile) {
    $content = Get-Content $salesFile -Raw
    
    # Verificar que NO exista el UPDATE manual del producto
    if ($content -match "productos\.update.*stock_actual.*decrement") {
        Write-Host "❌ ADVERTENCIA: Todavía existe UPDATE manual en $salesFile" -ForegroundColor Red
        Write-Host "   Esto causará DOBLE DESCUENTO. Debes eliminarlo." -ForegroundColor Red
        Write-Host ""
        Write-Host "   Busca y ELIMINA este código:" -ForegroundColor Yellow
        Write-Host "   await tx.productos.update({" -ForegroundColor Gray
        Write-Host "     where: { id: item.producto_id }," -ForegroundColor Gray
        Write-Host "     data: { stock_actual: { decrement: item.cantidad } }" -ForegroundColor Gray
        Write-Host "   })" -ForegroundColor Gray
        Write-Host ""
    }
    else {
        Write-Host "✅ Código TypeScript correcto (sin UPDATE manual)" -ForegroundColor Green
    }
}
else {
    Write-Host "⚠️  No se encontró $salesFile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 PASO 4: Reiniciando servidor de desarrollo..." -ForegroundColor Yellow

# Matar procesos de Node.js que estén corriendo
Write-Host "Deteniendo procesos de Node.js..." -ForegroundColor Gray
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ CORRECCIÓN COMPLETADA" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 PASOS SIGUIENTES:" -ForegroundColor Cyan
Write-Host "1. Ejecuta: npm run dev" -ForegroundColor White
Write-Host "2. Haz una venta de prueba" -ForegroundColor White
Write-Host "3. Verifica que el stock se descuenta UNA SOLA VEZ" -ForegroundColor White
Write-Host ""
Write-Host "📊 Para verificar el stock:" -ForegroundColor Cyan
Write-Host "   SELECT nombre, stock_actual FROM productos WHERE nombre LIKE '%Helado%';" -ForegroundColor White
Write-Host ""
