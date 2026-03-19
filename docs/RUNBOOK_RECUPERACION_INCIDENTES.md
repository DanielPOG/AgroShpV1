# Runbook de Recuperación e Incidentes - AgroShpV1

Fecha: 2026-03-20
Versión: 1.0

---

## 1. Backup de Base de Datos

### Backup automático diario (recomendado)

Agregar al crontab del servidor o como servicio de Docker:

```bash
# Backup diario a las 2:00 AM, retención de 30 días
0 2 * * * /opt/scripts/backup-db.sh
```

Script `/opt/scripts/backup-db.sh`:

```bash
#!/bin/bash
set -euo pipefail

FECHA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
ARCHIVO="${BACKUP_DIR}/agroshp_${FECHA}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Dump comprimido con gzip
docker exec agroshp-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --no-owner --no-privileges --clean --if-exists | gzip > "$ARCHIVO"

# Cifrar con GPG (clave configurada previamente)
gpg --batch --yes --symmetric --cipher-algo AES256 \
  --passphrase-file /opt/secrets/backup-passphrase "$ARCHIVO"
rm "$ARCHIVO"

# Retención: eliminar backups de más de 30 días
find "$BACKUP_DIR" -name "*.sql.gz.gpg" -mtime +30 -delete

echo "[$(date)] Backup completado: ${ARCHIVO}.gpg"
```

### Backup manual antes de migraciones

```bash
docker exec agroshp-db pg_dump -U postgres -d agroshop \
  --no-owner --no-privileges --clean --if-exists > backup_pre_migracion.sql
```

---

## 2. Procedimiento de Restore

### Restore completo

```bash
# 1. Descifrar backup
gpg --decrypt --batch --passphrase-file /opt/secrets/backup-passphrase \
  /backups/postgres/agroshp_YYYYMMDD.sql.gz.gpg > restore.sql.gz

# 2. Descomprimir
gunzip restore.sql.gz

# 3. Detener aplicación
docker compose stop app

# 4. Restaurar
docker exec -i agroshp-db psql -U postgres -d agroshop < restore.sql

# 5. Verificar integridad
docker exec agroshp-db psql -U postgres -d agroshop \
  -c "SELECT COUNT(*) FROM ventas; SELECT COUNT(*) FROM sesiones_caja;"

# 6. Reiniciar aplicación
docker compose start app
```

### Restore parcial (tabla específica)

```bash
# Extraer solo una tabla del dump
pg_restore -t ventas backup.dump > ventas_only.sql
```

---

## 3. Respuesta a Incidentes de Seguridad

### Clasificación

| Nivel        | Descripción                     | Ejemplo                                                        | Tiempo de respuesta  |
| ------------ | ------------------------------- | -------------------------------------------------------------- | -------------------- |
| P0 - Crítico | Compromiso de datos financieros | Acceso no autorizado a BD, inyección SQL, fuga de credenciales | Inmediato (< 1 hora) |
| P1 - Alto    | Abuso de funcionalidad          | Bypass de RBAC, retiro fraudulento                             | < 4 horas            |
| P2 - Medio   | Anomalía operativa              | Rate limit eludido, sesión duplicada                           | < 24 horas           |
| P3 - Bajo    | Configuración débil             | Header faltante, log excesivo                                  | Próximo sprint       |

### Protocolo P0 – Compromiso crítico

1. **Contener**: Deshabilitar acceso externo (Vercel/firewall/DNS)
2. **Preservar evidencia**: Snapshot de BD y logs ANTES de cualquier cambio
3. **Investigar**: Revisar `tabla auditoria` para el rango de tiempo afectado:
   ```sql
   SELECT * FROM auditoria
   WHERE fecha >= '2026-03-20 00:00:00'
   ORDER BY fecha DESC;
   ```
4. **Rotar credenciales**: NEXTAUTH_SECRET, DB password, REDIS password
5. **Invalidar sesiones**: Cambiar NEXTAUTH_SECRET reinicia todas las sesiones JWT
6. **Parche**: Aplicar fix, desplegar, verificar
7. **Comunicar**: Informar a administración del SENA si aplica
8. **Postmortem**: Documentar causa raíz, timeline, acciones preventivas

### Protocolo P1 – Abuso funcional

1. Bloquear usuario sospechoso: `UPDATE usuarios SET activo = false WHERE id = ?`
2. Revisar auditoría del usuario:
   ```sql
   SELECT * FROM auditoria WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 100;
   ```
3. Revisar retiros y movimientos del período:
   ```sql
   SELECT * FROM retiros_caja WHERE solicitado_por = ? AND fecha_solicitud >= '...';
   SELECT * FROM movimientos_caja WHERE usuario_id = ? AND fecha_movimiento >= '...';
   ```
4. Comparar con arqueos de caja para detectar faltantes
5. Restaurar datos si fue manipulación (usar backup)

---

## 4. Monitoreo de Salud

### Queries de verificación rápida

```sql
-- Sesiones huérfanas (abiertas hace más de 24h)
SELECT id, codigo_sesion, cajero_id, fecha_apertura
FROM sesiones_caja
WHERE estado = 'abierta'
  AND fecha_apertura < NOW() - INTERVAL '24 hours';

-- Retiros pendientes antiguos (más de 4h)
SELECT id, monto, solicitado_por, fecha_solicitud
FROM retiros_caja
WHERE estado = 'pendiente'
  AND fecha_solicitud < NOW() - INTERVAL '4 hours';

-- Diferencias grandes en turnos recientes
SELECT id, cajero_id, diferencia, fecha_fin
FROM turnos_caja
WHERE estado = 'finalizado'
  AND ABS(diferencia) > 50000
  AND fecha_fin >= NOW() - INTERVAL '7 days'
ORDER BY ABS(diferencia) DESC;

-- Intentos de rate limit (buscar en logs del servidor)
-- grep "429" /var/log/agroshp/access.log | tail -50

-- Verificar idempotency keys expiradas (limpieza)
DELETE FROM idempotency_keys WHERE expires_at < NOW();
```

### Healthcheck de servicios

```bash
# App
curl -f http://localhost:3000/api/auth/session || echo "APP DOWN"

# PostgreSQL
docker exec agroshp-db pg_isready -U postgres || echo "DB DOWN"

# Redis
docker exec agroshp-redis redis-cli ping || echo "REDIS DOWN"
```

---

## 5. Procedimiento de Despliegue Seguro

### Pre-despliegue

1. Verificar que CI pasa (typecheck + audit + secret scan)
2. Hacer backup de BD (ver sección 2)
3. Revisar migrations pendientes

### Despliegue

```bash
# Pull nueva imagen
docker compose pull app

# Ejecutar migraciones (si las hay)
docker compose run --rm migrate

# Reiniciar con zero-downtime
docker compose up -d --no-deps app
```

### Post-despliegue

1. Verificar healthcheck: `curl http://localhost:3000/api/auth/session`
2. Verificar que la caja puede crear ventas (smoke test manual)
3. Revisar logs por errores nuevos: `docker logs agroshp-app --since 5m`

### Rollback

```bash
# Revertir a imagen anterior
docker compose down app
docker tag agroshp:previous agroshp:latest
docker compose up -d app

# Si hubo migración DB destructiva, restaurar backup
```

---

## 6. Contactos

| Rol                       | Responsabilidad                            |
| ------------------------- | ------------------------------------------ |
| Administrador del sistema | Primer respondiente para P0/P1             |
| DBA / Encargado BD        | Backups, restore, queries de investigación |
| Instructor SENA           | Escalación si hay impacto institucional    |

---

## 7. Checklist Operativa Mensual

- [ ] Verificar que los backups diarios se ejecutan correctamente
- [ ] Probar restore en entorno de staging
- [ ] Revisar `npm audit` en el repositorio
- [ ] Revisar sesiones huérfanas y retiros pendientes antiguos
- [ ] Limpiar `idempotency_keys` expiradas
- [ ] Verificar que Redis está funcionando y no está lleno
- [ ] Revisar diferencias grandes en turnos del mes
