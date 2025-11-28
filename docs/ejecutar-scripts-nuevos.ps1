# =====================================================
# Script para Ejecutar Scripts Nuevos de BD
# =====================================================

Write-Host "=========================================" -ForegroundColor Green
Write-Host "   AGROSHOP - Actualizar Base de Datos" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Este script ejecutara los nuevos schemas SQL:" -ForegroundColor Cyan
Write-Host "  1. schema-control-caja.sql (6 tablas)" -ForegroundColor White
Write-Host "  2. schema-configuracion-mejorada.sql (configs)" -ForegroundColor White
Write-Host ""

# Pausar para confirmar
Write-Host "Presiona Enter para continuar o Ctrl+C para cancelar..." -ForegroundColor Yellow
Read-Host

# =====================================================
# 1. EJECUTAR CONTROL DE CAJA
# =====================================================

Write-Host ""
Write-Host "[1/3] Ejecutando schema-control-caja.sql..." -ForegroundColor Yellow

$env:PGPASSWORD = "root"

try {
    # Intentar ejecutar con psql (si está en PATH)
    $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
    
    if ($psqlCommand) {
        psql -U postgres -d AgroShop -f "database\schema-control-caja.sql"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK - Schema de control de caja ejecutado" -ForegroundColor Green
        } else {
            Write-Host "  ERROR - Fallo al ejecutar schema-control-caja.sql" -ForegroundColor Red
        }
    } else {
        Write-Host "  ADVERTENCIA - psql no encontrado en PATH" -ForegroundColor Yellow
        Write-Host "  Por favor ejecuta manualmente en pgAdmin:" -ForegroundColor White
        Write-Host "    database\schema-control-caja.sql" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
}

# =====================================================
# 2. EJECUTAR CONFIGURACIONES MEJORADAS
# =====================================================

Write-Host ""
Write-Host "[2/3] Ejecutando schema-configuracion-mejorada.sql..." -ForegroundColor Yellow

try {
    if ($psqlCommand) {
        psql -U postgres -d AgroShop -f "database\schema-configuracion-mejorada.sql"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK - Configuraciones mejoradas ejecutadas" -ForegroundColor Green
        } else {
            Write-Host "  ERROR - Fallo al ejecutar configuraciones" -ForegroundColor Red
        }
    } else {
        Write-Host "  Por favor ejecuta manualmente en pgAdmin:" -ForegroundColor White
        Write-Host "    database\schema-configuracion-mejorada.sql" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
}

# =====================================================
# 3. ACTUALIZAR PRISMA
# =====================================================

Write-Host ""
Write-Host "[3/3] Actualizando Prisma..." -ForegroundColor Yellow

Write-Host "  -> Ejecutando: npx prisma db pull" -ForegroundColor Cyan
npx prisma db pull

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Schema de Prisma actualizado" -ForegroundColor Green
} else {
    Write-Host "  ERROR - Fallo en prisma db pull" -ForegroundColor Red
}

Write-Host "  -> Ejecutando: npx prisma generate" -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Cliente de Prisma regenerado" -ForegroundColor Green
} else {
    Write-Host "  ERROR - Fallo en prisma generate" -ForegroundColor Red
}

# =====================================================
# RESUMEN FINAL
# =====================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "   Base de Datos Actualizada" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Tablas agregadas:" -ForegroundColor Cyan
Write-Host "  + cajas (cajas registradoras)" -ForegroundColor White
Write-Host "  + sesiones_caja (apertura/cierre)" -ForegroundColor White
Write-Host "  + movimientos_caja (flujo de efectivo)" -ForegroundColor White
Write-Host "  + retiros_caja (retiros autorizados)" -ForegroundColor White
Write-Host "  + gastos_caja (gastos menores)" -ForegroundColor White
Write-Host "  + arqueos_caja (conteo fisico)" -ForegroundColor White
Write-Host ""

Write-Host "Configuraciones actualizadas:" -ForegroundColor Cyan
Write-Host "  + 40+ configuraciones editables" -ForegroundColor White
Write-Host "  + Stock minimo por defecto clarificado" -ForegroundColor White
Write-Host "  + Control de caja configurado" -ForegroundColor White
Write-Host ""

# Contar tablas en Prisma
if (Test-Path "prisma/schema.prisma") {
    $schemaContent = Get-Content -Path "prisma/schema.prisma" -Raw
    $modelCount = ([regex]::Matches($schemaContent, "model ")).Count
    Write-Host "Total de tablas en Prisma: $modelCount" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Verificar cambios:" -ForegroundColor Yellow
Write-Host "  npx prisma studio" -ForegroundColor Cyan
Write-Host "  Abre: http://localhost:5555" -ForegroundColor Gray
Write-Host ""

Write-Host "Iniciar desarrollo:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "   Todo listo para continuar!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

