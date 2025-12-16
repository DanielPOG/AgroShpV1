# Script para verificar configuracion actual
Write-Host "Verificando configuracion en base de datos..." -ForegroundColor Cyan

# Obtener DATABASE_URL
$databaseUrl = (Get-Content .env.local | Select-String "DATABASE_URL" | ForEach-Object { $_.ToString().Split('=', 2)[1] })

# Query SQL
$query = "SELECT clave, valor, tipo FROM configuracion WHERE clave = 'iva_porcentaje';"

Write-Host "Consultando configuracion.iva_porcentaje..." -ForegroundColor Yellow

# Ejecutar query con psql
$result = psql $databaseUrl -c $query

Write-Host $result -ForegroundColor Green

Write-Host "Verificacion completada" -ForegroundColor Cyan
Write-Host "Si el valor no es 0, actualiza con:" -ForegroundColor Yellow
Write-Host "UPDATE configuracion SET valor = '0' WHERE clave = 'iva_porcentaje';" -ForegroundColor White
