# =====================================================
# CORRECCIÓN AUTOMÁTICA DE STOCK NEGATIVO
# =====================================================

$ErrorActionPreference = "Stop"

Write-Host "🔧 CORRECCIÓN DE STOCK NEGATIVO - AgroShop" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configuración de base de datos desde .env.local
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "agroshop_db"
$dbUser = "postgres"
$dbPassword = "root"

Write-Host "📊 Verificando productos con stock negativo..." -ForegroundColor Yellow
Write-Host ""

# Script SQL para verificar y corregir
$sqlVerificar = @"
SELECT 
    id,
    codigo,
    nombre,
    stock_actual,
    unidad
FROM productos
WHERE stock_actual < 0
ORDER BY stock_actual ASC;
"@

$sqlCorregir = @"
-- Corregir stock negativo a 0
UPDATE productos
SET stock_actual = 0
WHERE stock_actual < 0;

-- Verificar corrección
SELECT 
    COUNT(*) as productos_corregidos
FROM productos
WHERE stock_actual = 0;
"@

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "⚠️  psql no está disponible en el PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPCIÓN 1: Instalar psql" -ForegroundColor Cyan
    Write-Host "  - Descarga: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OPCIÓN 2: Usar pgAdmin o cliente SQL" -ForegroundColor Cyan
    Write-Host "  Ejecuta este SQL manualmente:" -ForegroundColor White
    Write-Host ""
    Write-Host "  UPDATE productos SET stock_actual = 0 WHERE stock_actual < 0;" -ForegroundColor Green
    Write-Host ""
    Write-Host "OPCIÓN 3: Usar Prisma Studio" -ForegroundColor Cyan
    Write-Host "  1. Ejecuta: npx prisma studio" -ForegroundColor White
    Write-Host "  2. Abre tabla 'productos'" -ForegroundColor White
    Write-Host "  3. Filtra por stock_actual < 0" -ForegroundColor White
    Write-Host "  4. Edita manualmente a 0" -ForegroundColor White
    Write-Host ""
    
    $opcion = Read-Host "¿Qué opción prefieres? (1/2/3)"
    
    if ($opcion -eq "3") {
        Write-Host ""
        Write-Host "🚀 Abriendo Prisma Studio..." -ForegroundColor Green
        Start-Process -FilePath "npx" -ArgumentList "prisma", "studio"
        Write-Host ""
        Write-Host "✅ Prisma Studio se abrirá en tu navegador" -ForegroundColor Green
        Write-Host "   URL: http://localhost:5555" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Presiona Enter cuando hayas corregido los productos"
    }
    else {
        Write-Host ""
        Write-Host "Por favor, ejecuta manualmente el SQL y luego continúa." -ForegroundColor Yellow
        Read-Host "Presiona Enter cuando hayas ejecutado el SQL"
    }
}
else {
    Write-Host "✅ psql encontrado, ejecutando corrección automática..." -ForegroundColor Green
    Write-Host ""
    
    # Configurar variable de entorno para password
    $env:PGPASSWORD = $dbPassword
    
    try {
        # Verificar productos con stock negativo
        Write-Host "📋 Productos con stock negativo:" -ForegroundColor Yellow
        $sqlVerificar | psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t
        Write-Host ""
        
        # Ejecutar corrección
        Write-Host "🔧 Aplicando corrección..." -ForegroundColor Yellow
        $sqlCorregir | psql -h $dbHost -p $dbPort -U $dbUser -d $dbName
        Write-Host ""
        
        Write-Host "✅ Stock negativo corregido exitosamente" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error al ejecutar SQL: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Ejecuta manualmente:" -ForegroundColor Yellow
        Write-Host "UPDATE productos SET stock_actual = 0 WHERE stock_actual < 0;" -ForegroundColor Cyan
    }
    finally {
        # Limpiar password del entorno
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ CORRECCIÓN COMPLETADA" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 SIGUIENTE PASO:" -ForegroundColor Cyan
Write-Host "   Reinicia el servidor de desarrollo:" -ForegroundColor White
Write-Host ""
Write-Host "   npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "   Luego haz una venta de prueba para verificar" -ForegroundColor Gray
Write-Host "   que el stock se descuente UNA SOLA VEZ." -ForegroundColor Gray
Write-Host ""
