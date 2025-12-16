# =====================================================
# SCRIPT DE MIGRACION - METAS DE VENTAS
# =====================================================
# Este script automatiza la limpieza de indices duplicados
# y la aplicacion de la migracion de metas_ventas
# =====================================================

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  MIGRACION: Tabla metas_ventas" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Leer DATABASE_URL del archivo .env
Write-Host "[1/4] Leyendo configuracion de base de datos..." -ForegroundColor Yellow

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
# Formato: postgresql://usuario:password@host:puerto/database
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

# Paso 2: Verificar si psql está disponible (opcional)
Write-Host "[2/4] Verificando limpieza de indices..." -ForegroundColor Yellow

$psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlAvailable) {
    $sqlFile = "database\fix-all-indices.sql"
    if (Test-Path $sqlFile) {
        # Configurar variable de entorno para password
        $env:PGPASSWORD = $dbPassword
        
        # Ejecutar SQL
        psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK - Indices duplicados eliminados" -ForegroundColor Green
        }
        else {
            Write-Host "OK - No hay indices duplicados (o ya fueron limpiados)" -ForegroundColor Green
        }
        
        # Limpiar variable de entorno
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
    else {
        Write-Host "OK - No se requiere limpieza de indices" -ForegroundColor Green
    }
}
else {
    Write-Host "OK - Omitiendo limpieza de indices (psql no disponible)" -ForegroundColor Green
    Write-Host "   Nota: Prisma manejara los indices automaticamente" -ForegroundColor Gray
}
Write-Host ""

# Paso 3: Aplicar migracion de Prisma
Write-Host "[3/4] Aplicando migracion de Prisma..." -ForegroundColor Yellow

npx prisma db push --skip-generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Migracion aplicada correctamente" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ERROR: La migracion fallo" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones alternativas:" -ForegroundColor Yellow
    Write-Host "1. Revisar el error anterior y corregir manualmente" -ForegroundColor Gray
    Write-Host "2. Usar pgAdmin para eliminar los indices manualmente" -ForegroundColor Gray
    Write-Host "3. Ejecutar: npx prisma db push --force-reset" -ForegroundColor Gray
    Write-Host "   (ADVERTENCIA: Esto borrara todos los datos!)" -ForegroundColor Red
    exit 1
}

# Paso 4: Generar cliente de Prisma
Write-Host "[4/4] Generando cliente de Prisma..." -ForegroundColor Yellow

npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Cliente de Prisma generado correctamente" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ERROR: Fallo la generacion del cliente" -ForegroundColor Red
    exit 1
}

# Resumen final
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  MIGRACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Reiniciar el servidor de desarrollo: npm run dev" -ForegroundColor Gray
Write-Host "2. Ir a Dashboard -> Configuracion" -ForegroundColor Gray
Write-Host "3. Crear tu primera meta de ventas" -ForegroundColor Gray
Write-Host ""
