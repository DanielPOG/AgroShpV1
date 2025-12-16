-- Actualizar IVA a 0%
UPDATE configuracion 
SET valor = '0', updated_at = NOW() 
WHERE clave = 'iva_porcentaje';

-- Verificar el cambio
SELECT clave, valor, tipo, updated_at 
FROM configuracion 
WHERE clave = 'iva_porcentaje';
