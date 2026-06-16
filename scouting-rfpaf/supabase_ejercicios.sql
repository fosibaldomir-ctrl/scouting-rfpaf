-- ============================================================
-- TABLA: ejercicios
-- Almacena ejercicios con todos los campos necesarios para búsqueda
-- ============================================================

CREATE TABLE ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  duracion INTEGER NOT NULL,
  num_jugadores TEXT NOT NULL,
  material TEXT,
  descripcion TEXT NOT NULL,
  imagen TEXT,
  video TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES: Para optimizar búsquedas y filtrados
-- ============================================================

-- Búsqueda por tipo de ejercicio
CREATE INDEX idx_ejercicios_tipo ON ejercicios(tipo);

-- Búsqueda por número de jugadores
CREATE INDEX idx_ejercicios_num_jugadores ON ejercicios(num_jugadores);

-- Búsqueda por material
CREATE INDEX idx_ejercicios_material ON ejercicios(material);

-- Búsqueda de texto en descripción (búsqueda full-text)
CREATE INDEX idx_ejercicios_descripcion ON ejercicios USING GIN(to_tsvector('spanish', descripcion));

-- Índice para ordenamiento por fecha
CREATE INDEX idx_ejercicios_creado_en ON ejercicios(creado_en DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS): Control de acceso
-- ============================================================

-- Habilitar RLS en la tabla
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;

-- Política 1: Todos pueden leer ejercicios
CREATE POLICY "Ejercicios lectura pública" ON ejercicios
  FOR SELECT USING (true);

-- Política 2: Solo usuarios autenticados pueden crear ejercicios
CREATE POLICY "Ejercicios insert autenticado" ON ejercicios
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política 3: Solo usuarios autenticados pueden actualizar ejercicios
CREATE POLICY "Ejercicios update autenticado" ON ejercicios
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política 4: Solo usuarios autenticados pueden borrar ejercicios
CREATE POLICY "Ejercicios delete autenticado" ON ejercicios
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- DATOS DE PRUEBA: Ejercicios predefinidos
-- ============================================================

INSERT INTO ejercicios (tipo, duracion, num_jugadores, material, descripcion, imagen, video, creado_en)
VALUES
  ('Calentamiento', 10, '11', 'Balones', 'Toque de balón en movimiento en todo el campo', NULL, 'https://www.youtube.com/embed/dQw4w9WgXcQ', NOW()),
  ('Técnico', 15, '5-8', 'Conos', 'Control orientado con cambio de dirección', NULL, NULL, NOW()),
  ('Táctico', 20, '9-11', 'Balones', 'Posesión en zona con presión defensiva', NULL, NULL, NOW()),
  ('Físico', 12, '2-4', 'Vallas', 'Cambios de dirección rápidos', NULL, NULL, NOW()),
  ('Fuerza', 15, '1', 'Sin material', 'Ejercicios de piernas y core', NULL, NULL, NOW()),
  ('Agilidad', 10, '5-8', 'Conos', 'Carrera lateral y cambios rápidos', NULL, NULL, NOW());

-- ============================================================
-- INFORMACIÓN: Campos de la tabla
-- ============================================================
-- id: Identificador único (UUID)
-- tipo: Tipo de ejercicio (Calentamiento, Técnico, Táctico, Físico, Fuerza, Agilidad)
-- duracion: Duración en minutos (INTEGER)
-- num_jugadores: Número de jugadores (1, 2-4, 5-8, 9-11)
-- material: Material necesario (texto, separado por comas)
-- descripcion: Descripción detallada del ejercicio
-- imagen: Imagen en base64 o URL
-- video: URL del video (YouTube, Vimeo, etc.)
-- creado_en: Fecha de creación
-- created_at: Timestamp automático de creación
-- updated_at: Timestamp automático de actualización
