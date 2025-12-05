# =====================================================
# Script: Setup Nueva Base de Datos
# Descripción: Configura una nueva BD PostgreSQL y aplica todas las migraciones
# Uso: .\setup-nueva-bd.ps1 [-NombreDB "nombre"] [-Usuario "user"] [-Password "pass"]
# =====================================================

param(
    [string]$NombreDB = "agroshop_db",
    [string]$Usuario = "postgres",
    [string]$Password = "postgres",
    [string]$Host = "localhost",
    [string]$Puerto = "5432",
    [switch]$DropExisting,
    [switch]$Seed
)

# Colores para output
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

Write-Host "`n================================================" -ForegroundColor $ColorInfo
Write-Host "🔧 SETUP NUEVA BASE DE DATOS - AGROSHOP V1" -ForegroundColor $ColorInfo
Write-Host "================================================`n" -ForegroundColor $ColorInfo

Write-Host "📋 Configuración:" -ForegroundColor $ColorInfo
Write-Host "  Base de Datos: $NombreDB" -ForegroundColor White
Write-Host "  Usuario: $Usuario" -ForegroundColor White
Write-Host "  Host: $Host" -ForegroundColor White
Write-Host "  Puerto: $Puerto" -ForegroundColor White
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Este script debe ejecutarse desde la raíz del proyecto" -ForegroundColor $ColorError
    Write-Host "   Directorio actual: $(Get-Location)" -ForegroundColor $ColorError
    exit 1
}

# Verificar que existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: No se encontró el archivo .env" -ForegroundColor $ColorError
    Write-Host "   Crea un archivo .env basado en .env.example" -ForegroundColor $ColorError
    exit 1
}

# =====================================================
# PASO 1: Crear Base de Datos
# =====================================================
Write-Host "📦 PASO 1: Creando base de datos..." -ForegroundColor $ColorWarning

# Verificar si existe la BD
$checkDbQuery = "SELECT 1 FROM pg_database WHERE datname='$NombreDB';"
$dbExists = psql -U $Usuario -h $Host -p $Puerto -t -c $checkDbQuery postgres 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al conectar a PostgreSQL" -ForegroundColor $ColorError
    Write-Host "   Verifica que PostgreSQL esté corriendo y las credenciales sean correctas" -ForegroundColor $ColorError
    exit 1
}

if ($dbExists -match "1") {
    if ($DropExisting) {
        Write-Host "   ⚠️  La base de datos '$NombreDB' ya existe. Eliminándola..." -ForegroundColor $ColorWarning
        
        # Terminar conexiones activas
        $killQuery = "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$NombreDB' AND pid <> pg_backend_pid();"
        psql -U $Usuario -h $Host -p $Puerto -c $killQuery postgres | Out-Null
        
        # Eliminar BD
        psql -U $Usuario -h $Host -p $Puerto -c "DROP DATABASE IF EXISTS $NombreDB;" postgres | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error al eliminar la base de datos" -ForegroundColor $ColorError
            exit 1
        }
        
        Write-Host "   ✅ Base de datos eliminada" -ForegroundColor $ColorSuccess
    } else {
        Write-Host "   ⚠️  La base de datos '$NombreDB' ya existe" -ForegroundColor $ColorWarning
        Write-Host "   Si quieres eliminarla y recrearla, usa el flag -DropExisting" -ForegroundColor $ColorWarning
        Write-Host ""
        $respuesta = Read-Host "   ¿Continuar de todas formas? (S/N)"
        if ($respuesta -ne "S" -and $respuesta -ne "s") {
            Write-Host "❌ Operación cancelada" -ForegroundColor $ColorError
            exit 0
        }
    }
}

# Crear BD si no existe
$checkDbQuery = "SELECT 1 FROM pg_database WHERE datname='$NombreDB';"
$dbExists = psql -U $Usuario -h $Host -p $Puerto -t -c $checkDbQuery postgres 2>&1

if ($dbExists -notmatch "1") {
    Write-Host "   Creando base de datos '$NombreDB'..." -ForegroundColor White
    psql -U $Usuario -h $Host -p $Puerto -c "CREATE DATABASE $NombreDB;" postgres | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al crear la base de datos" -ForegroundColor $ColorError
        exit 1
    }
    
    Write-Host "   ✅ Base de datos creada exitosamente" -ForegroundColor $ColorSuccess
} else {
    Write-Host "   ℹ️  Usando base de datos existente" -ForegroundColor White
}

Write-Host ""

# =====================================================
# PASO 2: Actualizar .env
# =====================================================
Write-Host "📝 PASO 2: Actualizando archivo .env..." -ForegroundColor $ColorWarning

# Construir URL de conexión
$databaseUrl = "postgresql://${Usuario}:${Password}@${Host}:${Puerto}/${NombreDB}"

# Leer .env actual
$envContent = Get-Content .env -Raw

# Reemplazar o agregar DATABASE_URL
if ($envContent -match 'DATABASE_URL=') {
    $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=`"$databaseUrl`""
    Write-Host "   ✅ DATABASE_URL actualizada" -ForegroundColor $ColorSuccess
} else {
    $envContent += "`nDATABASE_URL=`"$databaseUrl`"`n"
    Write-Host "   ✅ DATABASE_URL agregada" -ForegroundColor $ColorSuccess
}

# Guardar .env
$envContent | Set-Content .env -NoNewline

Write-Host ""

# =====================================================
# PASO 3: Aplicar Migraciones
# =====================================================
Write-Host "🚀 PASO 3: Aplicando migraciones..." -ForegroundColor $ColorWarning

# Verificar que existan migraciones
if (-not (Test-Path "prisma\migrations")) {
    Write-Host "❌ Error: No se encontró la carpeta prisma\migrations" -ForegroundColor $ColorError
    exit 1
}

# Aplicar migraciones
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al aplicar migraciones" -ForegroundColor $ColorError
    Write-Host "   Revisa los errores anteriores para más detalles" -ForegroundColor $ColorError
    exit 1
}

Write-Host "   ✅ Migraciones aplicadas correctamente" -ForegroundColor $ColorSuccess
Write-Host ""

# =====================================================
# PASO 4: Generar Prisma Client
# =====================================================
Write-Host "⚙️  PASO 4: Generando Prisma Client..." -ForegroundColor $ColorWarning

npx prisma generate | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al generar Prisma Client" -ForegroundColor $ColorError
    exit 1
}

Write-Host "   ✅ Prisma Client generado" -ForegroundColor $ColorSuccess
Write-Host ""

# =====================================================
# PASO 5: Seed (Opcional)
# =====================================================
if ($Seed) {
    Write-Host "🌱 PASO 5: Cargando datos iniciales..." -ForegroundColor $ColorWarning
    
    if (Test-Path "prisma\seed.ts") {
        npx prisma db seed
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Error al cargar datos iniciales" -ForegroundColor $ColorWarning
            Write-Host "   La base de datos está lista pero sin datos de prueba" -ForegroundColor $ColorWarning
        } else {
            Write-Host "   ✅ Datos iniciales cargados" -ForegroundColor $ColorSuccess
        }
    } else {
        Write-Host "   ℹ️  No se encontró archivo de seed (prisma\seed.ts)" -ForegroundColor White
    }
    
    Write-Host ""
}

# =====================================================
# PASO 6: Verificar Estado
# =====================================================
Write-Host "🔍 PASO 6: Verificando estado..." -ForegroundColor $ColorWarning

npx prisma migrate status

Write-Host ""

# =====================================================
# RESUMEN FINAL
# =====================================================
Write-Host "================================================" -ForegroundColor $ColorSuccess
Write-Host "✅ ¡BASE DE DATOS CONFIGURADA EXITOSAMENTE!" -ForegroundColor $ColorSuccess
Write-Host "================================================`n" -ForegroundColor $ColorSuccess

Write-Host "📊 Resumen:" -ForegroundColor $ColorInfo
Write-Host "  ✓ Base de datos: $NombreDB" -ForegroundColor White
Write-Host "  ✓ Migraciones aplicadas" -ForegroundColor White
Write-Host "  ✓ Prisma Client generado" -ForegroundColor White
if ($Seed) {
    Write-Host "  ✓ Datos iniciales cargados" -ForegroundColor White
}
Write-Host ""

Write-Host "🎯 Próximos pasos:" -ForegroundColor $ColorInfo
Write-Host "  1. Ejecutar: npm run dev" -ForegroundColor White
Write-Host "  2. Abrir: http://localhost:3000" -ForegroundColor White
Write-Host "  3. (Opcional) Prisma Studio: npx prisma studio" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentación:" -ForegroundColor $ColorInfo
Write-Host "  - docs/SETUP-CAMBIO-BD.md" -ForegroundColor White
Write-Host "  - docs/GUIA-MIGRACIONES-PRISMA.md" -ForegroundColor White
Write-Host ""
