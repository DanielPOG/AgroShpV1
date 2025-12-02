# Script para insertar proveedores de ejemplo en la base de datos
# Ejecutar: .\seed-proveedores.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "SEED DATA: Proveedores" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuracion de la base de datos
$DB_NAME = "AgroShop"
$DB_USER = "postgres"
$DB_PASSWORD = "root"
$DB_HOST = "localhost"
$DB_PORT = "5432"

# Archivo SQL
$SQL_FILE = Join-Path $PSScriptRoot "seed-proveedores.sql"

if (-not (Test-Path $SQL_FILE)) {
    Write-Host "Error: No se encuentra el archivo $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Conectando a la base de datos '$DB_NAME'..." -ForegroundColor Yellow

# Establecer variable de entorno para la contrasena
$env:PGPASSWORD = $DB_PASSWORD

try {
    # Ejecutar el script SQL
    $output = psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f $SQL_FILE 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Proveedores insertados correctamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "Resultado:" -ForegroundColor Cyan
        Write-Host $output
    } else {
        Write-Host ""
        Write-Host "Error al insertar proveedores" -ForegroundColor Red
        Write-Host $output
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error al ejecutar el script: $_" -ForegroundColor Red
    exit 1
} finally {
    # Limpiar la variable de entorno
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Proceso completado" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
