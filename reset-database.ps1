# =====================================================
# SCRIPT DE RESET COMPLETO DE BASE DE DATOS
# =====================================================
# Este script elimina todas las tablas y recrea
# la base de datos usando el schema de Prisma
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

# Paso 1: Leer DATABASE_URL del archivo .env
Write-Host "[1/6] Leyendo configuracion de base de datos..." -ForegroundColor Yellow

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: No se encontro el archivo .env" -ForegroundColor Red
    exit 1
}

$databaseUrl = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object { $_ -replace '^DATABASE_URL=["'']?(.+?)["'']?$', '$1' }

if (-not $databaseUrl) {
    Write-Host "ERROR: No se encontro DATABASE_URL en .env" -ForegroundColor Red
    exit 1
}

# Parsear la URL de conexion
if ($databaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $matches[1]
    $dbPassword = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
    
    Write-Host "OK - Configuracion leida correctamente" -ForegroundColor Green
    Write-Host "   Host: $dbHost" -ForegroundColor Gray
    Write-Host "   Puerto: $dbPort" -ForegroundColor Gray
    Write-Host "   Base de datos: $dbName" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "ERROR: Formato de DATABASE_URL invalido" -ForegroundColor Red
    exit 1
}

# Configurar variable de entorno para password
$env:PGPASSWORD = $dbPassword

# Paso 2: Eliminar directorio de migraciones corruptas
Write-Host "[2/6] Eliminando migraciones corruptas..." -ForegroundColor Yellow

$migrationsDir = "prisma\migrations"
if (Test-Path $migrationsDir) {
    Remove-Item -Path $migrationsDir -Recurse -Force
    Write-Host "OK - Migraciones eliminadas" -ForegroundColor Green
}
else {
    Write-Host "OK - No hay migraciones previas" -ForegroundColor Green
}
Write-Host ""

# Paso 3: Eliminar todas las tablas de la base de datos
Write-Host "[3/6] Eliminando todas las tablas existentes..." -ForegroundColor Yellow

$dropTablesSQL = @"
DO `$`$ DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END `$`$;
"@

# Guardar SQL temporalmente
$tempSQL = "temp-drop-all.sql"
$dropTablesSQL | Out-File -FilePath $tempSQL -Encoding UTF8

# Ejecutar SQL
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $tempSQL

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Todas las tablas eliminadas" -ForegroundColor Green
    Remove-Item $tempSQL
    Write-Host ""
}
else {
    Write-Host "ERROR: No se pudieron eliminar las tablas" -ForegroundColor Red
    Remove-Item $tempSQL
    exit 1
}

# Paso 4: Aplicar schema de Prisma (sin migraciones)
Write-Host "[4/6] Creando tablas desde schema de Prisma..." -ForegroundColor Yellow

npx prisma db push --force-reset --skip-generate --accept-data-loss

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Tablas creadas correctamente" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ERROR: No se pudieron crear las tablas" -ForegroundColor Red
    exit 1
}

# Paso 5: Generar cliente de Prisma
Write-Host "[5/6] Generando cliente de Prisma..." -ForegroundColor Yellow

npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Cliente de Prisma generado" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ERROR: Fallo la generacion del cliente" -ForegroundColor Red
    exit 1
}

# Paso 6: Crear datos iniciales (seed)
Write-Host "[6/6] Insertando datos iniciales..." -ForegroundColor Yellow

npm run seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Datos iniciales insertados" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ADVERTENCIA: No se pudieron insertar datos iniciales" -ForegroundColor Yellow
    Write-Host "   Puedes hacerlo manualmente despues" -ForegroundColor Gray
    Write-Host ""
}

# Limpiar variable de entorno
Remove-Item Env:\PGPASSWORD

# Resumen final
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  BASE DE DATOS REINICIADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Estado actual:" -ForegroundColor Yellow
Write-Host "  - Todas las tablas recreadas desde schema.prisma" -ForegroundColor Green
Write-Host "  - Migraciones corruptas eliminadas" -ForegroundColor Green
Write-Host "  - Cliente de Prisma actualizado" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Reiniciar el servidor: npm run dev" -ForegroundColor Gray
Write-Host "2. Crear usuario administrador inicial" -ForegroundColor Gray
Write-Host "3. Configurar datos de la empresa" -ForegroundColor Gray
Write-Host ""
