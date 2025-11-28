# =====================================================
# Script de Configuración Automática - AgroShop
# =====================================================
# Este script configura automáticamente la base de datos

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Configurando AgroShop..." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# 1. Crear archivo .env
Write-Host "`n[1/4] Creando archivo .env..." -ForegroundColor Yellow

$envContent = @"
# =====================================================
# AGROSHOP - VARIABLES DE ENTORNO
# =====================================================

DATABASE_URL="postgresql://postgres:root@localhost:5432/AgroShop"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="desarrollo-secret-agroshop-sena-2025-cambiar-en-produccion"

NEXT_PUBLIC_APP_NAME="AgroShop SENA"
NEXT_PUBLIC_IVA_PERCENTAGE="19"
NEXT_PUBLIC_STOCK_BAJO_UMBRAL="10"
NEXT_PUBLIC_DIAS_ALERTA_VENCIMIENTO="7"
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✓ Archivo .env creado" -ForegroundColor Green

# 2. Buscar psql.exe
Write-Host "`n[2/4] Buscando PostgreSQL..." -ForegroundColor Yellow

$psqlPaths = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe"
)

$psqlPath = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        break
    }
}

if ($psqlPath) {
    Write-Host "✓ PostgreSQL encontrado en: $psqlPath" -ForegroundColor Green
    
    # 3. Ejecutar schemas SQL
    Write-Host "`n[3/4] Ejecutando schemas SQL..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = "root"
    
    Write-Host "  - Ejecutando schema principal..." -ForegroundColor Cyan
    & $psqlPath -U postgres -d AgroShop -f "database\schema.sql" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Schema principal ejecutado" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Error al ejecutar schema principal" -ForegroundColor Red
    }
    
    Write-Host "  - Ejecutando mejoras..." -ForegroundColor Cyan
    & $psqlPath -U postgres -d AgroShop -f "database\schema-mejoras.sql" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Mejoras ejecutadas" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Error al ejecutar mejoras" -ForegroundColor Red
    }
    
} else {
    Write-Host "✗ PostgreSQL no encontrado en rutas comunes" -ForegroundColor Red
    Write-Host "`nPor favor, ejecuta manualmente:" -ForegroundColor Yellow
    Write-Host "  1. Abre pgAdmin o cualquier cliente PostgreSQL" -ForegroundColor White
    Write-Host "  2. Conecta a la base de datos 'AgroShop'" -ForegroundColor White
    Write-Host "  3. Ejecuta el archivo: database\schema.sql" -ForegroundColor White
    Write-Host "  4. Ejecuta el archivo: database\schema-mejoras.sql" -ForegroundColor White
}

# 4. Configurar Prisma
Write-Host "`n[4/4] Configurando Prisma..." -ForegroundColor Yellow

Write-Host "  - Ejecutando prisma db pull..." -ForegroundColor Cyan
npx prisma db pull 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Schema de Prisma generado" -ForegroundColor Green
} else {
    Write-Host "  ✗ Error al generar schema de Prisma" -ForegroundColor Red
    Write-Host "    Ejecuta manualmente: npx prisma db pull" -ForegroundColor Yellow
}

Write-Host "  - Ejecutando prisma generate..." -ForegroundColor Cyan
npx prisma generate 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Cliente de Prisma generado" -ForegroundColor Green
} else {
    Write-Host "  ✗ Error al generar cliente de Prisma" -ForegroundColor Red
    Write-Host "    Ejecuta manualmente: npx prisma generate" -ForegroundColor Yellow
}

# Resumen
Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "Configuración completada!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

Write-Host "`nPróximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Verifica que todo funciona: npx prisma studio" -ForegroundColor White
Write-Host "  2. Inicia el servidor: npm run dev" -ForegroundColor White
Write-Host "  3. Abre: http://localhost:3000" -ForegroundColor White

Write-Host "`n¡Listo para continuar con Fase 1!" -ForegroundColor Green
