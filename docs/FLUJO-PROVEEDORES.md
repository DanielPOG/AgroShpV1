# Flujo de Proveedores en Productos

## Descripción General

El sistema de productos implementa la lógica de **producción propia vs. proveedor externo** correctamente integrada con la base de datos.

## Campos en la Base de Datos

En la tabla `productos`:
- `proveedor_id` (INT, nullable): ID del proveedor externo
- `es_produccion_propia` (BOOLEAN, default true): Indica si el producto es de producción propia

## Reglas de Negocio

### 1. Producción Propia (es_produccion_propia = true)
- **Proveedor**: NO requerido (proveedor_id = null)
- **Uso**: Productos que la finca/empresa produce directamente
- **Ejemplo**: Leche fresca, huevos, vegetales cultivados en la finca

### 2. Proveedor Externo (es_produccion_propia = false)
- **Proveedor**: REQUERIDO (proveedor_id debe tener un valor)
- **Uso**: Productos comprados a proveedores externos
- **Ejemplo**: Insumos, productos procesados, materias primas externas

## Validaciones Implementadas

### Schema Zod (`product.schema.ts`)

```typescript
.refine(
  (data) => {
    // Si NO es producción propia, debe tener proveedor
    if (data.es_produccion_propia === false && !data.proveedor_id) {
      return false
    }
    return true
  },
  {
    message: 'Los productos de proveedor externo deben tener un proveedor asignado',
    path: ['proveedor_id'],
  }
)
```

Aplica tanto para:
- `createProductSchema` (crear productos)
- `updateProductSchema` (actualizar productos)

## Interfaz de Usuario

### Formulario de Creación (`create-product-modal.tsx`)

1. **Checkbox "Producción Propia"**
   - Marcado por defecto (true)
   - Al cambiar, limpia el campo proveedor_id

2. **Select "Proveedor"**
   - Solo visible cuando es_produccion_propia = false
   - Marcado como requerido (*)
   - Carga proveedores activos desde `/api/proveedores`
   - Muestra: Nombre del proveedor (NIT: xxxxxx)

### Estado del Formulario

```typescript
formData: {
  // ... otros campos
  es_produccion_propia: true,  // Default
  proveedor_id: "",            // Vacío por defecto
}
```

### Lógica de Cambio

```typescript
// Al marcar/desmarcar "Producción Propia"
onChange={(e) => setFormData({ 
  ...formData, 
  es_produccion_propia: e.target.checked, 
  proveedor_id: "" // Limpia el proveedor al cambiar
})}
```

## API Endpoints

### GET /api/proveedores
- **Propósito**: Obtener lista de proveedores activos para selects
- **Autenticación**: Requerida
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "codigo": "PROV-001",
      "nombre": "Lácteos San Fernando",
      "nit": "900123456-7",
      "contacto_nombre": "Juan Pérez",
      "contacto_telefono": "3101234567"
    }
  ]
  ```

## Hooks Personalizados

### useProveedoresSelect()

```typescript
const { proveedores, isLoading, error } = useProveedoresSelect()

// Retorna:
// - proveedores: ProveedorSelect[] (array de proveedores activos)
// - isLoading: boolean (estado de carga)
// - error: string | null (mensaje de error si falla)
```

## Datos de Prueba

### Script SQL: `seed-proveedores.sql`

Inserta 8 proveedores de ejemplo:
1. Lácteos San Fernando
2. Frutas y Verduras El Campo
3. Carnes y Embutidos Don José
4. Distribuidora de Granos La Cosecha
5. Agroquímicos del Valle
6. Panadería y Pastelería El Trigo
7. Distribuidora de Bebidas Refrescos
8. Empaques y Envases Plásticos S.A.

### Ejecutar Seed

```powershell
# Desde la carpeta database/
.\seed-proveedores.ps1
```

O manualmente:
```powershell
psql -U postgres -d AgroShop -f seed-proveedores.sql
```

## Flujo Completo

### Caso 1: Producto de Producción Propia

```
1. Usuario marca "Producción Propia" ✓
2. Campo proveedor NO aparece
3. Al enviar:
   - es_produccion_propia: true
   - proveedor_id: undefined/null
4. Validación Zod: ✓ PASA (no requiere proveedor)
5. Se crea el producto sin proveedor
```

### Caso 2: Producto de Proveedor Externo

```
1. Usuario desmarca "Producción Propia" ✗
2. Campo proveedor APARECE (Select)
3. Usuario selecciona proveedor del dropdown
4. Al enviar:
   - es_produccion_propia: false
   - proveedor_id: 1 (ejemplo)
5. Validación Zod: ✓ PASA (tiene proveedor)
6. Se crea el producto con relación al proveedor
```

### Caso 3: Error - Proveedor Externo sin Proveedor

```
1. Usuario desmarca "Producción Propia" ✗
2. Campo proveedor aparece
3. Usuario NO selecciona ningún proveedor
4. Al enviar:
   - es_produccion_propia: false
   - proveedor_id: undefined/null
5. Validación Zod: ✗ FALLA
6. Error: "Los productos de proveedor externo deben tener un proveedor asignado"
7. Toast muestra el error al usuario
```

## Archivos Modificados

1. **API**
   - `/app/api/proveedores/route.ts` (NEW)

2. **Hooks**
   - `/hooks/use-proveedores.ts` (NEW)

3. **Validaciones**
   - `/lib/validations/product.schema.ts` (UPDATED)
     - Agregada validación para proveedor en createProductSchema
     - Agregada validación para proveedor en updateProductSchema

4. **Componentes**
   - `/components/inventory/create-product-modal.tsx` (UPDATED)
     - Import useProveedoresSelect
     - Estado del formulario incluye es_produccion_propia y proveedor_id
     - UI con checkbox y select condicional
     - handleSubmit envía ambos campos

5. **Base de Datos**
   - `/database/seed-proveedores.sql` (NEW)
   - `/database/seed-proveedores.ps1` (NEW)

## Testing

### Test 1: Producción Propia
```
1. Ir a Inventario → Crear Producto
2. Verificar que "Producción Propia" está marcado
3. Verificar que NO aparece campo proveedor
4. Completar formulario y guardar
5. Verificar que se crea correctamente
```

### Test 2: Proveedor Externo
```
1. Ir a Inventario → Crear Producto
2. Desmarcar "Producción Propia"
3. Verificar que aparece select de proveedores
4. Seleccionar un proveedor
5. Completar formulario y guardar
6. Verificar que se crea correctamente con proveedor asignado
```

### Test 3: Validación
```
1. Ir a Inventario → Crear Producto
2. Desmarcar "Producción Propia"
3. NO seleccionar proveedor
4. Intentar guardar
5. Verificar que muestra error de validación
```

## Próximos Pasos

- [ ] Implementar módulo completo de Proveedores (CRUD)
- [ ] Agregar filtro por proveedor en lista de productos
- [ ] Mostrar información del proveedor en detalle de producto
- [ ] Reportes de compras por proveedor
- [ ] Gestión de órdenes de compra a proveedores
