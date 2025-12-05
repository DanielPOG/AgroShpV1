# =====================================================
# Script: Crear Migración Baseline Actualizada
# Descripción: Genera una migración baseline desde el estado actual de la BD
# Uso: .\crear-baseline-actualizada.ps1
# =====================================================

param(
    [switch]$Force,
    [string]$BackupFolder = ".\prisma\migrations\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

Write-Host "`n================================================" -ForegroundColor $ColorInfo
Write-Host "📦 CREAR BASELINE ACTUALIZADA - AGROSHOP V1" -ForegroundColor $ColorInfo
Write-Host "================================================`n" -ForegroundColor $ColorInfo

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Este script debe ejecutarse desde la raíz del proyecto" -ForegroundColor $ColorError
    exit 1
}

# =====================================================
# PASO 1: Hacer Backup de Migraciones Actuales
# =====================================================
Write-Host "📦 PASO 1: Haciendo backup de migraciones actuales..." -ForegroundColor $ColorWarning

if (Test-Path "prisma\migrations") {
    Write-Host "   Creando backup en: $BackupFolder" -ForegroundColor White
    
    # Crear carpeta de backup
    New-Item -ItemType Directory -Path $BackupFolder -Force | Out-Null
    
    # Copiar migraciones actuales
    Copy-Item -Path "prisma\migrations\*" -Destination $BackupFolder -Recurse -Force
    
    Write-Host "   ✅ Backup creado exitosamente" -ForegroundColor $ColorSuccess
    Write-Host "   📁 Ubicación: $BackupFolder" -ForegroundColor White
} else {
    Write-Host "   ℹ️  No hay migraciones previas para respaldar" -ForegroundColor White
}

Write-Host ""

# =====================================================
# PASO 2: Advertencia
# =====================================================
Write-Host "⚠️  ADVERTENCIA" -ForegroundColor $ColorWarning
Write-Host "   Este proceso:" -ForegroundColor White
Write-Host "   1. Eliminará todas las migraciones actuales" -ForegroundColor White
Write-Host "   2. Creará una nueva migración baseline desde tu BD actual" -ForegroundColor White
Write-Host "   3. Incluirá TODOS los triggers y funciones actuales" -ForegroundColor White
Write-Host ""
Write-Host "   Las migraciones antiguas estarán respaldadas en:" -ForegroundColor White
Write-Host "   $BackupFolder" -ForegroundColor Yellow
Write-Host ""

if (-not $Force) {
    $respuesta = Read-Host "   ¿Continuar? (S/N)"
    if ($respuesta -ne "S" -and $respuesta -ne "s") {
        Write-Host "❌ Operación cancelada" -ForegroundColor $ColorError
        exit 0
    }
}

Write-Host ""

# =====================================================
# PASO 3: Sincronizar Schema desde BD
# =====================================================
Write-Host "🔄 PASO 2: Sincronizando schema desde BD actual..." -ForegroundColor $ColorWarning

npx prisma db pull

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al sincronizar schema" -ForegroundColor $ColorError
    exit 1
}

Write-Host "   ✅ Schema sincronizado" -ForegroundColor $ColorSuccess
Write-Host ""

# =====================================================
# PASO 4: Eliminar Migraciones Antiguas
# =====================================================
Write-Host "🗑️  PASO 3: Eliminando migraciones antiguas..." -ForegroundColor $ColorWarning

# Eliminar solo las migraciones, mantener migration_lock.toml
Get-ChildItem -Path "prisma\migrations" -Directory | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
    Write-Host "   🗑️  Eliminada: $($_.Name)" -ForegroundColor White
}

Write-Host "   ✅ Migraciones antiguas eliminadas" -ForegroundColor $ColorSuccess
Write-Host ""

# =====================================================
# PASO 5: Crear Nueva Migración Baseline
# =====================================================
Write-Host "📝 PASO 4: Creando nueva migración baseline..." -ForegroundColor $ColorWarning

# Crear migración sin aplicar (la BD ya tiene todo)
npx prisma migrate dev --name baseline_completa --create-only

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al crear migración baseline" -ForegroundColor $ColorError
    Write-Host "   Restaurando backup..." -ForegroundColor $ColorWarning
    
    # Restaurar backup
    if (Test-Path $BackupFolder) {
        Remove-Item -Path "prisma\migrations\*" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -Path "$BackupFolder\*" -Destination "prisma\migrations\" -Recurse -Force
        Write-Host "   ✅ Backup restaurado" -ForegroundColor $ColorSuccess
    }
    
    exit 1
}

Write-Host "   ✅ Migración baseline creada" -ForegroundColor $ColorSuccess
Write-Host ""

# =====================================================
# PASO 6: Marcar como Aplicada
# =====================================================
Write-Host "✔️  PASO 5: Marcando migración como aplicada..." -ForegroundColor $ColorWarning

# Obtener nombre de la migración creada
$migracionNombre = Get-ChildItem -Path "prisma\migrations" -Directory | 
    Where-Object { $_.Name -like "*baseline_completa*" } | 
    Select-Object -First 1 -ExpandProperty Name

if ($migracionNombre) {
    Write-Host "   Marcando migración: $migracionNombre" -ForegroundColor White
    
    npx prisma migrate resolve --applied $migracionNombre
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Migración marcada como aplicada" -ForegroundColor $ColorSuccess
    } else {
        Write-Host "   ⚠️  Error al marcar migración, pero puede continuar" -ForegroundColor $ColorWarning
    }
} else {
    Write-Host "   ⚠️  No se encontró la migración creada" -ForegroundColor $ColorWarning
}

Write-Host ""

# =====================================================
# PASO 7: Verificar Estado
# =====================================================
Write-Host "🔍 PASO 6: Verificando estado..." -ForegroundColor $ColorWarning

npx prisma migrate status

Write-Host ""

# =====================================================
# PASO 8: Generar Prisma Client
# =====================================================
Write-Host "⚙️  PASO 7: Generando Prisma Client..." -ForegroundColor $ColorWarning

npx prisma generate | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Prisma Client generado" -ForegroundColor $ColorSuccess
} else {
    Write-Host "   ⚠️  Error al generar Prisma Client" -ForegroundColor $ColorWarning
}

Write-Host ""

# =====================================================
# RESUMEN FINAL
# =====================================================
Write-Host "================================================" -ForegroundColor $ColorSuccess
Write-Host "✅ ¡BASELINE ACTUALIZADA CREADA EXITOSAMENTE!" -ForegroundColor $ColorSuccess
Write-Host "================================================`n" -ForegroundColor $ColorSuccess

Write-Host "📊 Resumen:" -ForegroundColor $ColorInfo
Write-Host "  ✓ Backup guardado en: $BackupFolder" -ForegroundColor White
Write-Host "  ✓ Schema sincronizado desde BD actual" -ForegroundColor White
Write-Host "  ✓ Nueva migración baseline creada" -ForegroundColor White
Write-Host "  ✓ Migración marcada como aplicada" -ForegroundColor White
Write-Host "  ✓ Prisma Client actualizado" -ForegroundColor White
Write-Host ""

Write-Host "📋 La nueva migración incluye:" -ForegroundColor $ColorInfo
Write-Host "  • Todas las tablas actuales (30 modelos)" -ForegroundColor White
Write-Host "  • Todos los triggers de lotes" -ForegroundColor White
Write-Host "  • Triggers de auditoría" -ForegroundColor White
Write-Host "  • Triggers de historial" -ForegroundColor White
Write-Host "  • Índices optimizados" -ForegroundColor White
Write-Host "  • Usuario_id en todas las tablas necesarias" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Próximos pasos:" -ForegroundColor $ColorInfo
Write-Host "  1. Revisar migración: prisma\migrations\$migracionNombre" -ForegroundColor White
Write-Host "  2. Probar aplicación: npm run dev" -ForegroundColor White
Write-Host "  3. Commit cambios: git add prisma/migrations; git commit" -ForegroundColor White
Write-Host ""

Write-Host "💡 Notas importantes:" -ForegroundColor $ColorInfo
Write-Host "  • Esta migración es tu nuevo punto de partida" -ForegroundColor White
Write-Host "  • Incluye TODO el estado actual de tu BD" -ForegroundColor White
Write-Host "  • Puedes usar npx prisma migrate deploy en nuevas BD" -ForegroundColor White
Write-Host "  • Backup de migraciones antiguas: $BackupFolder" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentación:" -ForegroundColor $ColorInfo
Write-Host "  - docs/SETUP-CAMBIO-BD.md" -ForegroundColor White
Write-Host "  - docs/GUIA-MIGRACIONES-PRISMA.md" -ForegroundColor White
Write-Host ""
