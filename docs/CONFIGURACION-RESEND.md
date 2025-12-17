# 📧 Configuración de Resend para Envío de Facturas

## Paso 1: Crear cuenta en Resend

1. Ve a: https://resend.com/signup
2. Regístrate con tu email
3. Verifica tu cuenta

## Paso 2: Obtener API Key

1. Inicia sesión en https://resend.com
2. Ve a **"API Keys"** en el menú lateral
3. Haz clic en **"Create API Key"**
4. Dale un nombre (ej: "AgroShop Production")
5. Selecciona permisos: **"Sending access"**
6. Copia la API Key (se muestra solo una vez)

## Paso 3: Configurar en tu proyecto

Edita el archivo `.env.local` y reemplaza:

```env
RESEND_API_KEY="re_123456789"
```

Por tu API Key real:

```env
RESEND_API_KEY="re_TuAPIKeyReal12345..."
```

## Paso 4: Configurar dominio de envío (Opcional pero recomendado)

### Opción A: Usar dominio de prueba (100 correos/día)

- Por defecto usa: `onboarding@resend.dev`
- Solo puedes enviar a tu propio email registrado
- Ideal para pruebas

### Opción B: Agregar tu propio dominio (Recomendado para producción)

1. En Resend, ve a **"Domains"**
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `agroshop.com`)
4. Agrega los registros DNS que te proporciona Resend:
   - Record Type: **TXT**
   - Record Name: **\_resend**
   - Record Value: **(el que te da Resend)**
5. Espera verificación (puede tomar hasta 72 horas)
6. Una vez verificado, edita `app/api/send-invoice/route.ts` línea 53:
   ```typescript
   from: 'AgroShop SENA <facturacion@tudominio.com>',
   ```

## Paso 5: Instalar dependencias

Ejecuta en la terminal:

```bash
npm install resend jspdf
```

## Paso 6: Reiniciar servidor

```bash
npm run dev
```

## Paso 7: Probar envío

1. Ve al POS
2. Agrega productos al carrito
3. Finaliza la venta
4. En el modal de facturación:
   - Marca **"Enviar por Correo"**
   - Ingresa un email válido
   - Haz clic en **"Finalizar"**
5. Revisa la bandeja de entrada del email

## Límites de la cuenta gratuita

- ✅ **100 correos por día** (más que suficiente para tu proyecto)
- ✅ Envío ilimitado a tu propio email en modo prueba
- ✅ Archivos adjuntos hasta 40MB
- ✅ Sin tarjeta de crédito requerida

## Solución de problemas

### Error: "API key is invalid"

- Verifica que copiaste la API Key completa
- Asegúrate de que esté en `.env.local` correctamente
- Reinicia el servidor de desarrollo

### El correo no llega

- Revisa la carpeta de spam
- Si usas dominio de prueba, solo puedes enviar a tu email registrado
- Verifica los logs en la consola del servidor

### Error: "Domain not verified"

- Si agregaste tu propio dominio, espera la verificación DNS
- Mientras tanto, usa el dominio de prueba `onboarding@resend.dev`

## Verificar que funciona

1. Abre la consola del navegador (F12)
2. Abre la terminal donde corre `npm run dev`
3. Al enviar una factura, deberías ver:
   ```
   📧 [Send Invoice API] Datos recibidos: ...
   📄 PDF generado, tamaño: XXXXX bytes
   ✅ Correo enviado exitosamente: xxxxx-xxxxx-xxxxx
   ```

## Próximos pasos (Opcional)

- [ ] Agregar plantilla HTML más personalizada
- [ ] Agregar logo de la empresa en el correo
- [ ] Implementar reintentos automáticos si falla el envío
- [ ] Guardar historial de correos enviados en la BD
- [ ] Agregar opción de reenviar factura desde el dashboard

---

**¿Necesitas ayuda?** Revisa la documentación oficial: https://resend.com/docs
