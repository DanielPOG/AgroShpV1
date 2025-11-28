# 🚀 Instrucciones Finales - Completar Fase 0

## ✅ Lo que ya está hecho

- ✅ Dependencias instaladas (330 paquetes)
- ✅ Archivo `.env` creado con tus credenciales
- ✅ Prisma inicializado
- ✅ Archivos de configuración creados

## 📋 Pasos Finales (Debes hacer TÚ)

### Paso 1: Ejecutar Schemas SQL

Tienes 3 opciones para ejecutar los schemas SQL:

#### Opción A: pgAdmin (Recomendado - Visual)

1. Abre **pgAdmin**
2. Conecta al servidor PostgreSQL (localhost)
3. Expande **Databases** → **AgroShop**
4. Click derecho en **AgroShop** → **Query Tool**
5. Abre el archivo `database/schema.sql`:
   - Click en el ícono de carpeta 📁
   - Navega a: `C:\Users\santi\OneDrive\Documentos\GitHub\AgroShpV1\database\schema.sql`
   - Click **Select**
6. Click en el botón **Execute** ▶️ (o presiona F5)
7. Espera a que termine (verás "Query returned successfully")
8. Repite los pasos 4-6 con `database/schema-mejoras.sql`

#### Opción B: Línea de Comandos (Si tienes psql en PATH)

```bash
# Navegar a la carpeta del proyecto
cd c:\Users\santi\OneDrive\Documentos\GitHub\AgroShpV1

# Ejecutar schema principal
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d AgroShop -f database\schema.sql

# Ejecutar mejoras
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d AgroShop -f database\schema-mejoras.sql
```

**Nota:** Ajusta la ruta de `psql.exe` según tu versión de PostgreSQL (puede ser 15, 14, etc.)

#### Opción C: DBeaver u otro cliente SQL

1. Abre DBeaver o tu cliente SQL favorito
2. Conecta a PostgreSQL (localhost:5432, user: postgres, password: root, database: AgroShop)
3. Abre `database/schema.sql`
4. Ejecuta el script completo
5. Abre `database/schema-mejoras.sql`
6. Ejecuta el script completo

### Paso 2: Verificar que los Schemas se Ejecutaron

En pgAdmin o cualquier cliente SQL, ejecuta:

```sql
-- Ver todas las tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deberías ver **22 tablas**:
- auditoria
- categorias
- clientes
- configuracion
- costos_produccion
- descuentos
- descuentos_aplicados
- detalle_movimientos
- detalle_solicitudes
- detalle_ventas
- historial_inventario
- lotes_productos
- metodos_pago
- movimientos_unidades
- notificaciones
- pagos_venta
- productos
- proveedores
- roles
- solicitudes_transferencia
- turnos
- unidades_productivas
- usuarios
- ventas

### Paso 3: Verificar Datos Iniciales

```sql
-- Ver roles (debe haber 4)
SELECT * FROM roles;

-- Ver categorías (debe haber 8)
SELECT * FROM categorias;

-- Ver unidades productivas (debe haber 6)
SELECT * FROM unidades_productivas;

-- Ver métodos de pago (debe haber 4)
SELECT * FROM metodos_pago;
```

### Paso 4: Configurar Prisma

Una vez que los schemas SQL estén ejecutados, ejecuta estos comandos en PowerShell:

```bash
# Navegar al proyecto
cd c:\Users\santi\OneDrive\Documentos\GitHub\AgroShpV1

# Generar schema de Prisma desde la base de datos
npx prisma db pull

# Generar cliente de Prisma
npx prisma generate
```

**Espera a que terminen** (puede tomar 1-2 minutos)

### Paso 5: Verificar que Prisma Funciona

```bash
# Abrir Prisma Studio
npx prisma studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde podrás ver todas tus tablas y datos.

**Verifica que puedes ver:**
- ✅ Las 22 tablas
- ✅ Los datos iniciales (roles, categorías, etc.)

## ✅ Checklist Final

Marca cuando completes cada paso:

- [ ] Schemas SQL ejecutados (schema.sql)
- [ ] Mejoras SQL ejecutadas (schema-mejoras.sql)
- [ ] Verificadas 22 tablas en la base de datos
- [ ] Verificados datos iniciales (4 roles, 8 categorías, 6 unidades, 4 métodos de pago)
- [ ] Ejecutado `npx prisma db pull` exitosamente
- [ ] Ejecutado `npx prisma generate` exitosamente
- [ ] Prisma Studio abre y muestra las tablas

## 🎯 Una vez completado todo

Cuando hayas marcado todos los checkboxes, **Fase 0 estará 100% COMPLETADA** y podremos continuar con:

**Fase 1: Autenticación con NextAuth.js**

## 🚨 Solución de Problemas

### Error: "relation already exists"
- Significa que ya ejecutaste el schema antes
- Puedes ignorar este error o eliminar las tablas y volver a ejecutar

### Error: "database does not exist"
- Verifica que la base de datos se llama exactamente "AgroShop" (con mayúscula)
- Verifica que estás conectado al servidor correcto

### Prisma db pull falla
- Verifica que el archivo `.env` tiene la DATABASE_URL correcta
- Verifica que puedes conectarte a la base de datos desde pgAdmin
- Verifica que los schemas SQL se ejecutaron correctamente

### Prisma Studio no abre
- Verifica que el puerto 5555 no esté en uso
- Cierra Prisma Studio si ya está abierto
- Intenta con: `npx prisma studio --port 5556`

## 💡 Comandos Útiles

```bash
# Ver el schema de Prisma generado
cat prisma\schema.prisma

# Ver las variables de entorno
cat .env

# Reiniciar Prisma
npx prisma generate --force

# Ver logs de Prisma
npx prisma studio --verbose
```

---

**¿Listo?** Una vez completados todos los pasos, avísame y continuamos con la Fase 1! 🚀
