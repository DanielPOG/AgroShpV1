# 🚀 Scripts de Utilidad - AgroShop V1

## 📁 Contenido

- `setup-nueva-bd.ps1` - Configurar nueva base de datos con migraciones

---

## 🔧 setup-nueva-bd.ps1

Script de PowerShell para crear y configurar una base de datos PostgreSQL nueva con todas las migraciones aplicadas.

### Uso Básico

```powershell
# Configuración por defecto (agroshop_db, postgres/postgres, localhost:5432)
.\scripts\setup-nueva-bd.ps1

# Con seed (datos iniciales)
.\scripts\setup-nueva-bd.ps1 -Seed

# Eliminar BD existente antes de crear
.\scripts\setup-nueva-bd.ps1 -DropExisting
```

### Uso Avanzado

```powershell
# BD personalizada
.\scripts\setup-nueva-bd.ps1 -NombreDB "agroshop_test"

# Credenciales personalizadas
.\scripts\setup-nueva-bd.ps1 -Usuario "admin" -Password "mipassword"

# Servidor remoto
.\scripts\setup-nueva-bd.ps1 -Host "192.168.1.100" -Puerto "5432"

# Combinación completa
.\scripts\setup-nueva-bd.ps1 `
  -NombreDB "agroshop_produccion" `
  -Usuario "admin" `
  -Password "supersecret" `
  -Host "db.servidor.com" `
  -Puerto "5432" `
  -DropExisting `
  -Seed
```

### Parámetros

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `-NombreDB` | String | `agroshop_db` | Nombre de la base de datos |
| `-Usuario` | String | `postgres` | Usuario de PostgreSQL |
| `-Password` | String | `postgres` | Contraseña del usuario |
| `-Host` | String | `localhost` | Servidor de PostgreSQL |
| `-Puerto` | String | `5432` | Puerto de PostgreSQL |
| `-DropExisting` | Switch | `false` | Eliminar BD si ya existe |
| `-Seed` | Switch | `false` | Cargar datos iniciales |

### Ejemplo de Salida

```
================================================
🔧 SETUP NUEVA BASE DE DATOS - AGROSHOP V1
================================================

📋 Configuración:
  Base de Datos: agroshop_db
  Usuario: postgres
  Host: localhost
  Puerto: 5432

📦 PASO 1: Creando base de datos...
   ✅ Base de datos creada exitosamente

📝 PASO 2: Actualizando archivo .env...
   ✅ DATABASE_URL actualizada

🚀 PASO 3: Aplicando migraciones...
   ✅ Migraciones aplicadas correctamente

⚙️  PASO 4: Generando Prisma Client...
   ✅ Prisma Client generado

🔍 PASO 5: Verificando estado...
Database schema is up to date!

================================================
✅ ¡BASE DE DATOS CONFIGURADA EXITOSAMENTE!
================================================

📊 Resumen:
  ✓ Base de datos: agroshop_db
  ✓ Migraciones aplicadas
  ✓ Prisma Client generado

🎯 Próximos pasos:
  1. Ejecutar: npm run dev
  2. Abrir: http://localhost:3000
  3. (Opcional) Prisma Studio: npx prisma studio
```

---

## ⚠️ Notas Importantes

### Requisitos Previos

1. **PostgreSQL instalado** y corriendo
2. **Node.js** y **npm** instalados
3. **Archivo .env** en la raíz del proyecto
4. **Permisos** para crear bases de datos

### Seguridad

- ⚠️ No uses credenciales en plaintext en scripts de producción
- 🔒 Usa variables de entorno o Azure Key Vault para producción
- 🚫 No commitees archivos .env con contraseñas reales

### Troubleshooting

**Error: "Este script debe ejecutarse desde la raíz del proyecto"**
```powershell
# Navegar a la raíz del proyecto
cd C:\Users\santi\OneDrive\Documentos\GitHub\AgroShpV1
.\scripts\setup-nueva-bd.ps1
```

**Error: "No se encontró el archivo .env"**
```powershell
# Crear archivo .env desde ejemplo
copy .env.example .env
# Editar y agregar credenciales
notepad .env
```

**Error: "Error al conectar a PostgreSQL"**
```powershell
# Verificar que PostgreSQL está corriendo
Get-Service -Name postgresql*

# Iniciar si está detenido
Start-Service postgresql-x64-14  # Ajustar nombre según versión

# O verificar manualmente
psql -U postgres -c "SELECT version();"
```

**Error: "Error al aplicar migraciones"**
```powershell
# Ver estado de migraciones
npx prisma migrate status

# Si hay drift, resetear (borra datos)
npx prisma migrate reset

# O resolver manualmente
npx prisma migrate resolve --applied NOMBRE_MIGRACION
```

---

## 📚 Documentación Relacionada

- [SETUP-CAMBIO-BD.md](../docs/SETUP-CAMBIO-BD.md) - Guía completa de cambio de BD
- [GUIA-MIGRACIONES-PRISMA.md](../docs/GUIA-MIGRACIONES-PRISMA.md) - Todo sobre migraciones
- [DATABASE_SETUP.md](../docs/DATABASE_SETUP.md) - Setup inicial de BD

---

## 🎯 Casos de Uso

### Desarrollo Local

```powershell
# Setup inicial para un nuevo desarrollador
.\scripts\setup-nueva-bd.ps1 -Seed

# Resetear BD durante desarrollo
.\scripts\setup-nueva-bd.ps1 -DropExisting -Seed
```

### Testing

```powershell
# Crear BD de testing
.\scripts\setup-nueva-bd.ps1 -NombreDB "agroshop_test" -Seed

# BD de testing limpia
.\scripts\setup-nueva-bd.ps1 -NombreDB "agroshop_test" -DropExisting
```

### Producción (Staging)

```powershell
# Setup staging con credenciales seguras
$env:DB_PASSWORD = Read-Host -AsSecureString "Password"
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:DB_PASSWORD)
)

.\scripts\setup-nueva-bd.ps1 `
  -NombreDB "agroshop_staging" `
  -Usuario "agroshop_user" `
  -Password $plainPassword `
  -Host "staging.db.servidor.com"
```

### CI/CD Pipeline

```yaml
# Azure Pipelines / GitHub Actions
- name: Setup Database
  run: |
    .\scripts\setup-nueva-bd.ps1 `
      -NombreDB "agroshop_ci_${{ github.run_id }}" `
      -Usuario "${{ secrets.DB_USER }}" `
      -Password "${{ secrets.DB_PASSWORD }}" `
      -Host "${{ secrets.DB_HOST }}" `
      -DropExisting `
      -Seed
```

---

## ✅ Checklist de Uso

Antes de ejecutar el script:

- [ ] PostgreSQL está corriendo
- [ ] Tienes credenciales correctas
- [ ] Archivo .env existe
- [ ] Estás en la raíz del proyecto
- [ ] Tienes permisos para crear BD

Después de ejecutar el script:

- [ ] Verificar con `npx prisma migrate status`
- [ ] Probar conexión con `npx prisma studio`
- [ ] Ejecutar aplicación con `npm run dev`
- [ ] Verificar que triggers funcionan
- [ ] (Opcional) Verificar datos seed

---

## 🔄 Actualizar Script

El script se actualiza automáticamente con el proyecto. Si necesitas la última versión:

```powershell
git pull origin main
```

Si hiciste cambios locales:

```powershell
# Ver cambios
git diff scripts/setup-nueva-bd.ps1

# Restaurar versión del repo
git checkout scripts/setup-nueva-bd.ps1
```
