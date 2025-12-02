# Script para eliminar el trigger automatico de inventario que causa duplicados
# Fecha: 30 de noviembre de 2025

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ELIMINAR TRIGGER DE INVENTARIO AUTOMATICO" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Cargar variables de entorno desde .env.local
$envPath = "..\\.env.local"
if (Test-Path $envPath) {
    Write-Host "OK Cargando variables de entorno..." -ForegroundColor Green
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "ERROR: Archivo .env.local no encontrado" -ForegroundColor Red
    exit 1
}

$DATABASE_URL = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")

if (-not $DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL no encontrada en .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "OK Conexion configurada" -ForegroundColor Green
Write-Host ""

Write-Host "PROBLEMA DETECTADO:" -ForegroundColor Yellow
Write-Host "  - El trigger crea registros duplicados" -ForegroundColor Yellow
Write-Host "  - Los registros automaticos tienen usuario_id NULL" -ForegroundColor Yellow
Write-Host "  - Causa timestamps diferentes entre registros" -ForegroundColor Yellow
Write-Host ""

Write-Host "SOLUCION:" -ForegroundColor Green
Write-Host "  - Eliminar el trigger y su funcion" -ForegroundColor Green
Write-Host "  - Manejar historial desde la aplicacion" -ForegroundColor Green
Write-Host "  - Mejor control de usuario_id y observaciones" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Deseas continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operacion cancelada" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Ejecutando script SQL..." -ForegroundColor Cyan

try {
    # Ejecutar el script SQL usando psql
    $scriptPath = ".\remove-trigger-inventario.sql"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "ERROR: Archivo remove-trigger-inventario.sql no encontrado" -ForegroundColor Red
        exit 1
    }

    # Extraer info de conexion de DATABASE_URL
    $pattern = 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)(\?.*)?$'
    if ($DATABASE_URL -match $pattern) {
        $dbUser = $matches[1]
        $dbPassword = $matches[2]
        $dbHost = $matches[3]
        $dbPort = $matches[4]
        $dbName = $matches[5]
        
        # Establecer variable de entorno para psql
        $env:PGPASSWORD = $dbPassword
        
        # Leer el contenido del script SQL
        $sqlContent = Get-Content $scriptPath -Raw
        
        # Ejecutar script usando pipeline
        $sqlContent | & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "================================================" -ForegroundColor Green
            Write-Host "  OK TRIGGER ELIMINADO EXITOSAMENTE" -ForegroundColor Green
            Write-Host "================================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Cambios aplicados:" -ForegroundColor Green
            Write-Host "  - Trigger eliminado" -ForegroundColor Green
            Write-Host "  - Funcion eliminada" -ForegroundColor Green
            Write-Host ""
            Write-Host "PROXIMOS PASOS:" -ForegroundColor Cyan
            Write-Host "  1. Reiniciar el servidor (npm run dev)" -ForegroundColor White
            Write-Host "  2. Probar ajuste de stock" -ForegroundColor White
            Write-Host "  3. Verificar UN solo registro en historial" -ForegroundColor White
            Write-Host "  4. Confirmar que usuario_id no es NULL" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host ""
            Write-Host "ERROR: No se pudo ejecutar el script SQL" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERROR: Formato de DATABASE_URL invalido" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR al ejecutar el script" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
