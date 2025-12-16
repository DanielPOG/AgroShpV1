#!/usr/bin/env pwsh
# Script para resetear completamente el proyecto AgroShop

Write-Host "🔧 Iniciando reset completo del proyecto..." -ForegroundColor Cyan
Write-Host ""

# 1. Detener procesos Node
Write-Host "1️⃣ Deteniendo procesos Node.js..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq 'node' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✅ Procesos detenidos" -ForegroundColor Green
Write-Host ""

# 2. Eliminar cache de Next.js
Write-Host "2️⃣ Eliminando cache de Next.js..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cache .next eliminado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No existe carpeta .next" -ForegroundColor Gray
}
Write-Host ""

# 3. Eliminar cliente de Prisma generado
Write-Host "3️⃣ Eliminando cliente Prisma generado..." -ForegroundColor Yellow
if (Test-Path node_modules\.prisma) {
    Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
    Write-Host "   ✅ node_modules\.prisma eliminado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No existe node_modules\.prisma" -ForegroundColor Gray
}

if (Test-Path node_modules\@prisma\client) {
    Remove-Item -Recurse -Force node_modules\@prisma\client -ErrorAction SilentlyContinue
    Write-Host "   ✅ node_modules\@prisma\client eliminado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No existe node_modules\@prisma\client" -ForegroundColor Gray
}
Write-Host ""

# 4. Verificar DATABASE_URL
Write-Host "4️⃣ Verificando DATABASE_URL..." -ForegroundColor Yellow
$envContent = Get-Content .env.local -Raw
if ($envContent -match 'DATABASE_URL="postgresql://postgres:root@localhost:5432/agroshop_db"') {
    Write-Host "   ✅ DATABASE_URL correcto en .env.local" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ DATABASE_URL no encontrado o incorrecto" -ForegroundColor Red
}
Write-Host ""

# 5. Establecer variable de entorno en sesión actual
Write-Host "5️⃣ Estableciendo DATABASE_URL en la sesión..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://postgres:root@localhost:5432/agroshop_db"
Write-Host "   ✅ DATABASE_URL = $env:DATABASE_URL" -ForegroundColor Green
Write-Host ""

# 6. Reinstalar @prisma/client
Write-Host "6️⃣ Reinstalando @prisma/client..." -ForegroundColor Yellow
npm install @prisma/client@6.19.0 --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ @prisma/client instalado" -ForegroundColor Green
} else {
    Write-Host "   ❌ Error al instalar @prisma/client" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 7. Regenerar cliente Prisma
Write-Host "7️⃣ Regenerando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Cliente Prisma generado correctamente" -ForegroundColor Green
} else {
    Write-Host "   ❌ Error al generar cliente Prisma" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 8. Verificar conexión a PostgreSQL
Write-Host "8️⃣ Verificando PostgreSQL..." -ForegroundColor Yellow
$pgServices = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if ($pgServices) {
    foreach ($service in $pgServices) {
        Write-Host "   📊 $($service.Name): $($service.Status)" -ForegroundColor Cyan
        if ($service.Status -ne 'Running') {
            Write-Host "   ⚠️ PostgreSQL no está corriendo!" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️ No se encontraron servicios de PostgreSQL" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Reset completado. Ahora ejecuta:" -ForegroundColor Green
Write-Host ""
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
