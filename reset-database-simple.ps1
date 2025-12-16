# =====================================================
# SCRIPT DE RESET SIMPLE DE BASE DE DATOS
# =====================================================
# Este script usa solo Prisma para recrear la BD
# =====================================================

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  RESET COMPLETO DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "ADVERTENCIA: Este script eliminara TODOS los datos!" -ForegroundColor Red
Write-Host ""
$confirmation = Read-Host "Escribe 'SI' para continuar"

if ($confirmation -ne "SI") {
    Write-Host "Operacion cancelada" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Paso 1: Eliminar directorio de migraciones corruptas
Write-Host "[1/4] Eliminando migraciones corruptas..." -ForegroundColor Yellow

$migrationsDir = "prisma\migrations"
if (Test-Path $migrationsDir) {
    # Crear backup por si acaso
    $backupDir = "prisma\migrations_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path $migrationsDir -Destination $backupDir -Recurse
    Write-Host "   Backup creado en: $backupDir" -ForegroundColor Gray
    
    # Eliminar migraciones
    Remove-Item -Path $migrationsDir -Recurse -Force
    Write-Host "OK - Migraciones eliminadas" -ForegroundColor Green
}
else {
    Write-Host "OK - No hay migraciones previas" -ForegroundColor Green
}
Write-Host ""

# Paso 2: Aplicar schema de Prisma con force reset
Write-Host "[2/4] Recreando base de datos desde schema..." -ForegroundColor Yellow
Write-Host "   Esto eliminara todas las tablas y las recreara" -ForegroundColor Gray

npx prisma db push --force-reset --skip-generate --accept-data-loss

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Base de datos recreada correctamente" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ERROR: No se pudo recrear la base de datos" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solucion manual:" -ForegroundColor Yellow
    Write-Host "1. Abre pgAdmin" -ForegroundColor Gray
    Write-Host "2. Conectate a la base de datos 'agroshop_db'" -ForegroundColor Gray
    Write-Host "3. Click derecho -> Query Tool" -ForegroundColor Gray
    Write-Host "4. Ejecuta este SQL:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   DROP SCHEMA public CASCADE;" -ForegroundColor Cyan
    Write-Host "   CREATE SCHEMA public;" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. Vuelve a ejecutar este script" -ForegroundColor Gray
    exit 1
}

# Paso 3: Generar cliente de Prisma
Write-Host "[3/4] Generando cliente de Prisma..." -ForegroundColor Yellow

npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Cliente de Prisma generado" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ERROR: Fallo la generacion del cliente" -ForegroundColor Red
    exit 1
}

# Paso 4: Crear datos iniciales (seed)
Write-Host "[4/4] Insertando datos iniciales..." -ForegroundColor Yellow

npm run seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Datos iniciales insertados" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ADVERTENCIA: No se pudieron insertar datos iniciales" -ForegroundColor Yellow
    Write-Host "   Puedes ejecutar: npm run seed" -ForegroundColor Gray
    Write-Host ""
}

# Resumen final
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  BASE DE DATOS REINICIADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Estado actual:" -ForegroundColor Yellow
Write-Host "  [OK] Todas las tablas recreadas desde schema.prisma" -ForegroundColor Green
Write-Host "  [OK] Migraciones corruptas eliminadas (backup creado)" -ForegroundColor Green
Write-Host "  [OK] Cliente de Prisma actualizado" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Reiniciar el servidor: npm run dev" -ForegroundColor Gray
Write-Host "2. Ir a /login y crear usuario admin inicial" -ForegroundColor Gray
Write-Host "3. Configurar datos de la empresa en Dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "Nota: Las migraciones antiguas se guardaron en:" -ForegroundColor Cyan
Get-ChildItem -Path "prisma\migrations_backup_*" -Directory | Select-Object -Last 1 | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Gray }
Write-Host ""
