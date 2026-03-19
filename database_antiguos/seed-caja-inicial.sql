-- =============================================================================
-- Script: Crear Caja Inicial para Control de Caja
-- Descripción: Inserta una caja principal para que los cajeros puedan abrir sesiones
-- Fecha: 2024
-- =============================================================================

-- Crear caja principal
INSERT INTO cajas (
    codigo,
    nombre,
    ubicacion,
    tipo,
    activa,
    created_at,
    updated_at
) VALUES (
    'CAJA-001',
    'Caja Principal',
    'Mostrador 1',
    'principal',
    true,
    NOW(),
    NOW()
);

-- Verificar que se creó correctamente
SELECT 
    id,
    codigo,
    nombre,
    ubicacion,
    tipo,
    activa,
    created_at
FROM cajas
WHERE codigo = 'CAJA-001';

-- Mensaje de confirmación
SELECT '✅ Caja principal creada exitosamente' AS mensaje;
SELECT 'Los cajeros ya pueden abrir sesiones desde el POS' AS siguiente_paso;
