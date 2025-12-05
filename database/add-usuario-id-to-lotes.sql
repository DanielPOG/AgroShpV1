-- Agregar campo usuario_id a la tabla lotes_productos
-- Este campo registra qué usuario creó el lote

ALTER TABLE lotes_productos 
ADD COLUMN IF NOT EXISTS usuario_id INT;

-- Agregar índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_lotes_usuario ON lotes_productos(usuario_id);

-- Agregar foreign key a usuarios
ALTER TABLE lotes_productos 
ADD CONSTRAINT fk_lotes_usuario 
FOREIGN KEY (usuario_id) 
REFERENCES usuarios(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Comentario para documentación
COMMENT ON COLUMN lotes_productos.usuario_id IS 'ID del usuario que creó el lote';
