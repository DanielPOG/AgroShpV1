# Configuración de Verificación Automática de Lotes Vencidos

## 🎯 Sistema Híbrido Implementado

El sistema ahora verifica lotes vencidos de **DOS formas**:

### 1️⃣ **Verificación Manual (Inmediata)**

Se ejecuta cuando el usuario:

- ✅ Abre el Punto de Venta (POS)
- ✅ Entra a Gestión de Lotes

### 2️⃣ **Verificación Automática (Cada 6 horas)**

Se ejecuta automáticamente sin intervención humana:

- ✅ 00:00 AM
- ✅ 06:00 AM
- ✅ 12:00 PM
- ✅ 06:00 PM

---

## 📋 Archivos Configurados

### 1. `vercel.json` (Nuevo)

```json
{
  "crons": [
    {
      "path": "/api/lotes/check-vencimientos",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**¿Qué hace?**

- Define un **Cron Job** en Vercel
- Se ejecuta cada 6 horas automáticamente
- Llama al endpoint `/api/lotes/check-vencimientos`

**Sintaxis del Schedule:**

```
0 */6 * * *
│  │  │ │ │
│  │  │ │ └─── Día de la semana (0-7, 0=Domingo)
│  │  │ └───── Mes (1-12)
│  │  └─────── Día del mes (1-31)
│  └────────── Hora (*/6 = cada 6 horas)
└───────────── Minuto (0 = minuto 0)
```

### 2. `.env.example` (Actualizado)

```env
# Secret para Vercel Cron
CRON_SECRET="tu-cron-secret-cambiar-en-produccion"
```

### 3. `app/api/lotes/check-vencimientos/route.ts` (Mejorado)

Ahora detecta si la llamada viene de:

- **Vercel Cron** (automático)
- **Usuario** (manual)

Y registra logs diferenciados.

### 4. `proxy.ts` (Actualizado)

El middleware de autenticación (`proxy.ts`) fue modificado para **permitir acceso público** al endpoint de verificación de lotes:

```typescript
const isCronRoute = pathname === "/api/lotes/check-vencimientos";

// Permitir Vercel Cron para verificación de lotes vencidos
if (isCronRoute) {
  return NextResponse.next();
}
```

**¿Por qué?**  
Vercel Cron no envía sesión de usuario, por lo que necesita acceso sin autenticación.

---

## 🚀 Pasos para Activar en Producción

### Paso 1: Generar CRON_SECRET

**En tu terminal local:**

```powershell
# Windows PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

O usa un generador online: https://generate-secret.vercel.app/32

**Ejemplo de output:**

```
aB3kL9mP2qR5sT8vW1xY4zA6cD9fG2hJ5kL8mP1qR4sT7vW0xY3zA6cD=
```

### Paso 2: Configurar en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Click en **Settings** → **Environment Variables**
3. Agrega una nueva variable:
   - **Key:** `CRON_SECRET`
   - **Value:** (el secreto generado en Paso 1)
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

### Paso 3: Actualizar `.env.local`

```env
# .env.local
CRON_SECRET="aB3kL9mP2qR5sT8vW1xY4zA6cD9fG2hJ5kL8mP1qR4sT7vW0xY3zA6cD="
```

### Paso 4: Commit y Deploy

```bash
git add vercel.json .env.example
git commit -m "feat: agregar verificación automática de lotes vencidos cada 6 horas"
git push origin main
```

Vercel detectará automáticamente el `vercel.json` y configurará el Cron Job.

---

## ✅ Verificar que Funciona

### 1. En Vercel Dashboard

1. Ve a tu proyecto → **Settings** → **Cron Jobs**
2. Deberías ver:
   ```
   Path: /api/lotes/check-vencimientos
   Schedule: 0 */6 * * *
   Status: ✅ Active
   ```

### 2. Ver Logs de Ejecución

1. Ve a **Deployments** → Click en tu deployment
2. Ve a **Functions** → Busca `/api/lotes/check-vencimientos`
3. Verás los logs cada vez que se ejecute:

```
🔍 Iniciando verificación de lotes vencidos...
📍 Origen: Vercel Cron (automático)
✅ Verificación completada: {
  proximosVencer: 3,
  vencidos: 2,
  timestamp: "2025-12-10T12:00:00.000Z"
}
```

### 3. Forzar Ejecución Manual

**IMPORTANTE:** El endpoint está configurado para ser público (sin autenticación) para permitir llamadas de Vercel Cron.

Puedes probar manualmente haciendo una request:

```powershell
# En desarrollo local
$url = "http://localhost:3000/api/lotes/check-vencimientos"
$response = Invoke-RestMethod -Uri $url -Method Get
$response | ConvertTo-Json

# En producción (reemplaza con tu URL de Vercel)
$url = "https://tu-app.vercel.app/api/lotes/check-vencimientos"
$response = Invoke-RestMethod -Uri $url -Method Get
$response | ConvertTo-Json
```

**Respuesta esperada:**

```json
{
  "success": true,
  "message": "Verificación de lotes completada",
  "proximosVencer": 3,
  "vencidos": 0,
  "ejecutadoPor": "usuario",
  "timestamp": "2025-12-10T14:30:00.000Z"
}
```

---

## 🎛️ Personalizar el Schedule

Si quieres cambiar la frecuencia, edita `vercel.json`:

### Cada 3 horas (más frecuente)

```json
"schedule": "0 */3 * * *"
```

### Cada 12 horas (menos frecuente)

```json
"schedule": "0 */12 * * *"
```

### Solo a medianoche

```json
"schedule": "0 0 * * *"
```

### Cada hora (no recomendado - consume recursos)

```json
"schedule": "0 * * * *"
```

### Personalizado (ej: 8 AM, 2 PM, 8 PM)

```json
"schedule": "0 8,14,20 * * *"
```

---

## 📊 Ventajas del Sistema Híbrido

| Característica    | Manual (Al abrir POS)           | Automática (Cada 6h)                            |
| ----------------- | ------------------------------- | ----------------------------------------------- |
| **Inmediatez**    | ✅ Instantánea                  | ⏱️ Máx. 6h de delay                             |
| **Confiabilidad** | ⚠️ Depende de usuarios          | ✅ 100% automática                              |
| **Cobertura**     | ⚠️ Solo cuando alguien abre POS | ✅ 24/7 sin intervención                        |
| **Costo**         | 🆓 Gratis                       | 🆓 Gratis (hasta 100 ejecuciones/día en Vercel) |
| **Logs**          | ✅ En consola de navegador      | ✅ En Vercel Functions                          |

**Conclusión:** Al tener AMBOS sistemas, obtienes lo mejor de los dos mundos.

---

## 🧪 Casos de Uso

### Caso 1: Tienda con Alta Rotación

```
Escenario: Alguien abre el POS cada 2 horas

Resultado:
├─ Verificación manual cada 2h ✅
├─ Verificación automática cada 6h ✅
└─ Máximo desfase: 2 horas
```

### Caso 2: Tienda Cerrada (Domingo)

```
Escenario: Nadie trabaja en domingo

Resultado:
├─ Verificación manual: NO se ejecuta ❌
├─ Verificación automática: SÍ se ejecuta (00:00, 06:00, 12:00, 18:00) ✅
└─ Lotes vencidos a medianoche se marcan automáticamente
```

### Caso 3: Lote Vence a las 11 AM

```
Escenario:
- Lote vence a las 11:00 AM
- Último Cron: 06:00 AM
- Próximo Cron: 12:00 PM

Opción A: Alguien abre POS a las 11:30 AM
└─ Verificación manual detecta el vencimiento ✅

Opción B: Nadie abre el POS
└─ Cron de las 12:00 PM lo detecta (1h de delay) ✅
```

---

## ⚠️ Limitaciones de Vercel Cron (Plan Gratuito)

- **Máximo:** 100 ejecuciones por día
- **Con schedule `0 */6 * * *`:** 4 ejecuciones/día = **OK** ✅
- **Si cambias a cada hora:** 24 ejecuciones/día = **OK** ✅
- **Si cambias a cada minuto:** 1440 ejecuciones/día = **EXCEDE LÍMITE** ❌

Para planes Pro/Enterprise, el límite es mucho mayor.

---

## 🔧 Troubleshooting

### El Cron no aparece en Vercel Dashboard

1. Verifica que `vercel.json` esté en la raíz del proyecto
2. Haz un nuevo deploy después de agregar el archivo
3. Espera 1-2 minutos para que Vercel lo procese

### El Cron falla con error 500

1. Revisa los logs en Vercel Functions
2. Verifica que `DATABASE_URL` esté configurado
3. Confirma que Prisma está generado en el deployment

### El Cron no se ejecuta

1. Verifica que el schedule sea válido: https://crontab.guru/#0_*/6_*__\__
2. Espera al menos 1 ciclo completo (6 horas)
3. Revisa la zona horaria (Vercel usa UTC)

### Error de autenticación

Si ves "Unauthorized", verifica que `CRON_SECRET` esté configurado correctamente en Vercel.

---

## 📝 Resumen para el Usuario

### ¿Qué cambió?

Ahora el sistema verifica lotes vencidos **automáticamente cada 6 horas**, además de hacerlo cuando abres el POS.

### ¿Necesito hacer algo?

**En desarrollo local:** No, sigue funcionando igual.  
**En producción (Vercel):** Sí, debes configurar `CRON_SECRET` (ver Paso 1-3 arriba).

### ¿Cuándo se ejecuta?

- ✅ Cada vez que abres el POS (inmediato)
- ✅ Cada vez que entras a Gestión de Lotes (inmediato)
- ✅ Automáticamente a las 00:00, 06:00, 12:00, 18:00 (sin intervención)

### ¿Cuánto cuesta?

**Gratis.** Vercel incluye Cron Jobs en el plan gratuito (hasta 100 ejecuciones/día).

---

**Fecha de Implementación:** 10 de diciembre de 2025  
**Versión:** 1.3.0  
**Estado:** ✅ Implementado - Requiere configuración en producción
