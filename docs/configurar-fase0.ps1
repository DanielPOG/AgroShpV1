# =====================================================
# Script Automatizado - Configuracion Fase 0 AgroShop
# =====================================================

Write-Host "=========================================" -ForegroundColor Green
Write-Host "   AGROSHOP - Configuracion Fase 0" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# =====================================================
# 1. CREAR ARCHIVO .env.local
# =====================================================

Write-Host "[1/3] Creando archivo .env.local..." -ForegroundColor Yellow

$envContent = @"
# =====================================================
# AGROSHOP - VARIABLES DE ENTORNO
# =====================================================

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:root@localhost:5432/AgroShop"

# NextAuth (Autenticacion)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="AgroShop2025SecretKeyParaSENACentroAgropecuario123456789"

# Configuracion de la Aplicacion
NEXT_PUBLIC_APP_NAME="AgroShop SENA"
NEXT_PUBLIC_IVA_PERCENTAGE="19"
NEXT_PUBLIC_STOCK_BAJO_UMBRAL="10"
NEXT_PUBLIC_DIAS_ALERTA_VENCIMIENTO="7"

# Cloudinary (Opcional - Para subir imagenes en Fase 7)
# CLOUDINARY_CLOUD_NAME=""
# CLOUDINARY_API_KEY=""
# CLOUDINARY_API_SECRET=""
"@

try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -Force
    Write-Host "  OK - Archivo .env.local creado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - No se pudo crear .env.local" -ForegroundColor Red
    Write-Host "  Detalles: $_" -ForegroundColor Red
    exit 1
}

# =====================================================
# 2. SINCRONIZAR PRISMA CON LA BASE DE DATOS
# =====================================================

Write-Host ""
Write-Host "[2/3] Sincronizando Prisma con la base de datos..." -ForegroundColor Yellow

Write-Host "  -> Ejecutando: npx prisma db pull" -ForegroundColor Cyan

$pullOutput = npx prisma db pull 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Schema de Prisma generado desde la BD" -ForegroundColor Green
} else {
    Write-Host "  ERROR - Fallo en prisma db pull" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "    1. Verifica que PostgreSQL este corriendo" -ForegroundColor White
    Write-Host "    2. Verifica las credenciales (usuario: postgres, password: root)" -ForegroundColor White
    Write-Host "    3. Verifica que la base de datos AgroShop exista" -ForegroundColor White
    Write-Host ""
    Write-Host "  Output del comando:" -ForegroundColor Yellow
    Write-Host $pullOutput
    exit 1
}

# =====================================================
# 3. GENERAR CLIENTE DE PRISMA
# =====================================================

Write-Host ""
Write-Host "[3/3] Generando cliente de Prisma..." -ForegroundColor Yellow

Write-Host "  -> Ejecutando: npx prisma generate" -ForegroundColor Cyan

$generateOutput = npx prisma generate 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Cliente de Prisma generado exitosamente" -ForegroundColor Green
} else {
    Write-Host "  ERROR - Fallo en prisma generate" -ForegroundColor Red
    Write-Host $generateOutput
    exit 1
}

# =====================================================
# RESUMEN FINAL
# =====================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "   FASE 0 COMPLETADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Archivos creados/actualizados:" -ForegroundColor Cyan
Write-Host "  OK .env.local" -ForegroundColor White
Write-Host "  OK prisma/schema.prisma (sincronizado con BD)" -ForegroundColor White
Write-Host "  OK node_modules/.prisma/client (generado)" -ForegroundColor White
Write-Host ""

# Contar modelos en schema.prisma
if (Test-Path "prisma/schema.prisma") {
    $schemaContent = Get-Content -Path "prisma/schema.prisma" -Raw
    $modelCount = ([regex]::Matches($schemaContent, "model ")).Count
    Write-Host "Estadisticas:" -ForegroundColor Cyan
    Write-Host "  -> $modelCount modelos (tablas) detectados en la BD" -ForegroundColor White
    Write-Host ""
}

Write-Host "Proximos Pasos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Verificar Prisma Studio:" -ForegroundColor White
Write-Host "     npx prisma studio" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Iniciar servidor de desarrollo:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Continuar con Fase 1 - Autenticacion" -ForegroundColor White
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "   Todo listo para continuar!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
