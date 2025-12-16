# Historial Detallado de Arqueos

## Descripción General

El sistema de historial detallado de arqueos permite ver la información completa de una sesión de caja, incluyendo todos los turnos que ocurrieron durante esa sesión y las operaciones detalladas de cada turno.

## Estructura de Datos

### Niveles de Información

```
Arqueo
├── Información del Arqueo (fecha, tipo, diferencia)
├── Sesión de Caja (responsable, tienda, fechas)
├── Totales Generales (resumen de toda la sesión)
└── Turnos
    ├── Turno #1
    │   ├── Información del Turno (cajero, tipo relevo, fechas)
    │   ├── Resumen (cantidad de operaciones)
    │   ├── Totales por Método de Pago
    │   └── Operaciones Detalladas
    │       ├── Ventas
    │       ├── Retiros
    │       ├── Gastos
    │       └── Movimientos
    ├── Turno #2
    └── ...
```

## Componentes Implementados

### 1. Función de Base de Datos: `getArqueoHistoryDetail()`

**Ubicación:** `lib/db/arqueos-caja.ts`

**Funcionalidad:**

- Obtiene el arqueo con su sesión asociada
- Recupera todos los turnos de la sesión en orden cronológico
- Para cada turno, consulta todas las operaciones:
  - Ventas (con método de pago y estado)
  - Retiros (siempre en efectivo)
  - Gastos (con método de pago)
  - Movimientos extra (ingresos/egresos operativos)
- Calcula totales por método de pago para cada turno
- Calcula totales generales de toda la sesión

**Cálculo de Saldos por Método de Pago:**

```typescript
Saldo = Ventas + Ingresos - Gastos - Egresos - Retiros*

*Retiros solo aplican a efectivo
```

**Retorna:**

```typescript
{
  arqueo: { info del arqueo },
  sesion: { info de la sesión },
  turnos: [
    {
      turno: { info del turno },
      operaciones: {
        ventas: [...],
        retiros: [...],
        gastos: [...],
        movimientos: [...]
      },
      totales: {
        porMetodo: { efectivo, nequi, tarjeta, transferencia },
        saldos: { saldo final por método },
        cantidades: { conteo de operaciones }
      }
    }
  ],
  totalesGenerales: {
    porMetodo: { totales consolidados },
    cantidades: { conteos totales }
  }
}
```

### 2. Endpoint API: `/api/arqueos/[id]/history`

**Ubicación:** `app/api/arqueos/[id]/history/route.ts`

**Método:** GET

**Parámetros:**

- `id` (path): ID del arqueo

**Respuestas:**

- **200:** Historial completo del arqueo
- **400:** ID inválido
- **404:** Arqueo no encontrado
- **500:** Error del servidor

**Ejemplo de uso:**

```typescript
const response = await fetch("/api/arqueos/123/history");
const historial = await response.json();
```

### 3. Hook Personalizado: `useArqueoHistory()`

**Ubicación:** `hooks/use-arqueo-history.ts`

**Propiedades:**

```typescript
{
  data: ArqueoHistoryDetail | null,
  loading: boolean,
  error: string | null,
  fetchHistory: (arqueoId: number) => Promise<ArqueoHistoryDetail>,
  reset: () => void
}
```

**Ejemplo de uso:**

```typescript
const { data, loading, error, fetchHistory } = useArqueoHistory();

// Cargar historial
await fetchHistory(arqueoId);

// Limpiar estado
reset();
```

### 4. Componente UI: `ArqueoHistoryDialog`

**Ubicación:** `components/caja/arqueo-history-dialog.tsx`

**Props:**

```typescript
{
  arqueoId: number | null,
  open: boolean,
  onOpenChange: (open: boolean) => void
}
```

**Características:**

- Dialog modal de pantalla completa (90vh)
- Scroll interno para navegación
- Secciones colapsables por turno
- Visualización jerárquica de información
- Badges y colores para estados y tipos
- Íconos para métodos de pago
- Formateo automático de monedas y fechas

**Estructura Visual:**

1. **Header del Arqueo:**

   - Fecha y hora del arqueo
   - Tipo de arqueo
   - Realizador
   - Total contado vs esperado
   - Diferencia (color según signo)

2. **Información de la Sesión:**

   - Tienda
   - Responsable
   - Fecha de apertura
   - Fondo inicial

3. **Resumen General:**

   - Cantidad de turnos, ventas, retiros, gastos, movimientos
   - Totales por método de pago con desglose:
     - Ventas (+)
     - Ingresos (+)
     - Retiros (-)
     - Gastos (-)
     - Egresos (-)
     - Saldo final

4. **Lista de Turnos (Expandible):**

   - **Header (siempre visible):**

     - Número de turno
     - Tipo de relevo
     - Cajero
     - Efectivo inicial y final
     - Fecha/hora inicio y fin

   - **Detalles (expandible):**
     - Resumen de cantidades
     - Totales por método de pago
     - Operaciones detalladas:
       - Ventas: ID, hora, método, monto
       - Retiros: ID, hora, motivo, monto
       - Gastos: ID, hora, categoría, método, monto
       - Movimientos: ID, hora, tipo, método, monto
     - Observaciones del turno

## Uso en la Aplicación

### Integración con Lista de Arqueos

```typescript
import { ArqueoHistoryDialog } from "@/components/caja/arqueo-history-dialog";

export function ArqueosPage() {
  const [selectedArqueoId, setSelectedArqueoId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleVerHistorial = (arqueoId: number) => {
    setSelectedArqueoId(arqueoId);
    setHistoryOpen(true);
  };

  return (
    <>
      {/* Lista de arqueos */}
      <div>
        {arqueos.map((arqueo) => (
          <div key={arqueo.id}>
            <Button onClick={() => handleVerHistorial(arqueo.id)}>
              Ver Historial Detallado
            </Button>
          </div>
        ))}
      </div>

      {/* Dialog de historial */}
      <ArqueoHistoryDialog
        arqueoId={selectedArqueoId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}
```

## Validaciones y Lógica de Negocio

### Métodos de Pago Soportados

- **Efectivo:** Puede tener saldo negativo (préstamo)
- **Nequi:** Solo saldo positivo o cero
- **Tarjeta:** Solo saldo positivo o cero
- **Transferencia:** Solo saldo positivo o cero

### Tipos de Relevo

- `inicio_jornada`: Inicio de Jornada
- `cambio_turno`: Cambio de Turno
- `fin_jornada`: Fin de Jornada
- `emergencia`: Emergencia

### Estados de Ventas

- Solo se cuentan ventas con estado diferente a `cancelada`

### Cálculos

#### Saldo por Método de Pago (por turno):

```
Saldo = (Ventas + Ingresos) - (Gastos + Egresos + Retiros*)
*Retiros solo en efectivo
```

#### Totales Generales:

Suma de todos los totales de cada turno

## Consideraciones de Rendimiento

### Optimizaciones Implementadas

1. **Consultas en Paralelo:**

   - Se usa `Promise.all()` para consultar operaciones de cada turno simultáneamente

2. **Selección de Campos:**

   - Solo se seleccionan los campos necesarios de cada tabla
   - Se usan `select` específicos en lugar de traer todos los campos

3. **Ordenamiento:**

   - Turnos ordenados por fecha de inicio (cronológico)
   - Operaciones ordenadas por fecha dentro de cada turno

4. **Lazy Loading:**
   - Los detalles de cada turno solo se muestran cuando se expanden
   - El componente solo carga datos cuando el dialog se abre

### Recomendaciones

- **Sesiones grandes (>10 turnos):** El componente maneja scroll y expansión para evitar renderizar todo al mismo tiempo
- **Paginación:** Si se requiere, considerar paginar los turnos cuando haya más de 20
- **Caché:** Considerar cachear los resultados en el cliente si el usuario consulta el mismo arqueo varias veces

## Casos de Uso

### 1. Auditoría de Sesión

Un supervisor quiere revisar todas las operaciones que ocurrieron durante una sesión específica para validar el arqueo.

### 2. Análisis de Desempeño

Revisar cuántas ventas, retiros y gastos realizó cada cajero durante sus turnos.

### 3. Resolución de Diferencias

Cuando hay una diferencia en el arqueo, se puede rastrear operación por operación para encontrar la causa.

### 4. Reporte de Turno

Generar un informe detallado de las operaciones de un turno específico.

### 5. Conciliación Bancaria

Verificar los totales por método de pago (Nequi, Tarjeta, Transferencia) contra los registros bancarios.

## Testing

### Escenarios a Probar

1. **Sesión con un solo turno**

   - Verificar que muestra correctamente todas las operaciones
   - Validar cálculos de totales

2. **Sesión con múltiples turnos**

   - Verificar orden cronológico
   - Validar totales generales contra suma de turnos

3. **Turno sin operaciones**

   - Verificar que se muestra el turno
   - Validar que los totales son cero

4. **Todos los métodos de pago**

   - Verificar que se muestran los 4 métodos
   - Validar cálculos independientes

5. **Todos los tipos de operaciones**

   - Ventas, retiros, gastos, movimientos
   - Verificar colores y símbolos correctos (+/-)

6. **Arqueo no encontrado**
   - Verificar mensaje de error apropiado

## Mantenimiento

### Actualizar Tipos de Relevo

Si se agregan nuevos tipos de relevo, actualizar:

```typescript
// En arqueo-history-dialog.tsx
const TIPO_RELEVO_LABELS = {
  inicio_jornada: "Inicio de Jornada",
  cambio_turno: "Cambio de Turno",
  fin_jornada: "Fin de Jornada",
  emergencia: "Emergencia",
  nuevo_tipo: "Nueva Etiqueta", // Agregar aquí
};
```

### Agregar Nuevos Métodos de Pago

Si se agregan nuevos métodos de pago, actualizar:

```typescript
// En arqueo-history-dialog.tsx
const METODO_PAGO_ICONS = {
  efectivo: Wallet,
  nequi: DollarSign,
  tarjeta: CreditCard,
  transferencia: ArrowUpCircle,
  nuevo_metodo: Icon, // Agregar aquí
};

const METODO_PAGO_LABELS = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  nuevo_metodo: "Etiqueta", // Agregar aquí
};
```

Y también en `getArqueoHistoryDetail()`:

```typescript
const totalesPorMetodo = {
  efectivo: { ventas: 0, retiros: 0, gastos: 0, ingresos: 0, egresos: 0 },
  nequi: { ventas: 0, gastos: 0, ingresos: 0, egresos: 0 },
  tarjeta: { ventas: 0, gastos: 0, ingresos: 0, egresos: 0 },
  transferencia: { ventas: 0, gastos: 0, ingresos: 0, egresos: 0 },
  nuevo_metodo: { ventas: 0, gastos: 0, ingresos: 0, egresos: 0 }, // Agregar aquí
};
```

## Próximas Mejoras

### Funcionalidades Futuras

1. **Exportar a Excel/PDF:**

   - Botón para exportar el historial completo
   - Formato de reporte imprimible

2. **Filtros:**

   - Filtrar operaciones por tipo
   - Filtrar por método de pago
   - Búsqueda por monto

3. **Gráficos:**

   - Gráfico de barras de ventas por turno
   - Gráfico de pie de métodos de pago

4. **Comparación:**

   - Comparar dos sesiones
   - Ver tendencias históricas

5. **Notificaciones:**
   - Alertar si un turno tiene operaciones inusuales
   - Resaltar diferencias significativas

## Conclusión

El historial detallado de arqueos proporciona una vista completa y jerárquica de todas las operaciones de caja, facilitando la auditoría, análisis y resolución de problemas. La implementación utiliza consultas optimizadas, componentes reutilizables y una interfaz intuitiva para navegar grandes cantidades de información de manera eficiente.
