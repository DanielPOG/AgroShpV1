# SCRIPT: Ejecutar ver-triggers.sql en PostgreSQL

Write-Host ""
Write-Host "=== VERIFICANDO TRIGGERS ACTIVOS EN LA BD ===" -ForegroundColor Cyan
Write-Host "Este script ejecutara queries para ver todos los triggers activos" -ForegroundColor Gray
Write-Host ""

$env:PGPASSWORD = "root"
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "agroshop_db"
$dbUser = "postgres"

$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "OK psql encontrado" -ForegroundColor Green
    Write-Host "Ejecutando queries..." -ForegroundColor Yellow
    Write-Host ""
    
    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f "ver-triggers.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "OK Queries ejecutadas correctamente" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "ERROR al ejecutar las queries" -ForegroundColor Red
    }
}
else {
    Write-Host "ERROR psql no esta disponible" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usa pgAdmin 4 o Prisma Studio:" -ForegroundColor Yellow
    Write-Host "npx prisma studio" -ForegroundColor Cyan
}

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Presiona Enter..." -ForegroundColor Gray
Read-Host
