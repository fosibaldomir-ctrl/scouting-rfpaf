-- ================================================================
-- TABLA: analisis_partidos
-- Historial completo de análisis de partidos con vídeos, PDFs e imágenes
-- ================================================================

CREATE TABLE IF NOT EXISTS analisis_partidos (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               text        NOT NULL,
  rival                text        NOT NULL DEFAULT '',
  fecha                text        NOT NULL DEFAULT '',
  categoria            text,                          -- Sub 12 / Sub 14 / Sub 16 / Selección
  equipo_local         jsonb       NOT NULL DEFAULT '{}',
  equipo_visitante     jsonb       NOT NULL DEFAULT '{}',
  analisis_ia          text        NOT NULL DEFAULT '',
  caracteristicas_rival jsonb      NOT NULL DEFAULT '{}',
  video_rival_url      text        NOT NULL DEFAULT '',
  presentacion_url     text        NOT NULL DEFAULT '',
  bloque_ataque        jsonb       NOT NULL DEFAULT '{}',
  bloque_defensa       jsonb       NOT NULL DEFAULT '{}',
  bloque_transicion    jsonb       NOT NULL DEFAULT '{}',
  abp_ofensivo         jsonb       NOT NULL DEFAULT '[]',
  abp_defensivo        jsonb       NOT NULL DEFAULT '[]',
  video_partido_url    text        NOT NULL DEFAULT '',
  tiempos              jsonb       NOT NULL DEFAULT '{}',
  eventos_partido      jsonb       NOT NULL DEFAULT '[]',
  creado_en            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analisis_fecha      ON analisis_partidos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_analisis_categoria  ON analisis_partidos (categoria);
CREATE INDEX IF NOT EXISTS idx_analisis_creado_en  ON analisis_partidos (creado_en DESC);

-- Row Level Security (same open pattern as other tables)
ALTER TABLE analisis_partidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analisis_public_select" ON analisis_partidos FOR SELECT USING (true);
CREATE POLICY "analisis_public_insert" ON analisis_partidos FOR INSERT WITH CHECK (true);
CREATE POLICY "analisis_public_update" ON analisis_partidos FOR UPDATE USING (true);
CREATE POLICY "analisis_public_delete" ON analisis_partidos FOR DELETE USING (true);

-- ================================================================
-- STORAGE BUCKET: analisis-archivos
-- Para subir PDFs, imágenes y vídeos vinculados a análisis
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analisis-archivos',
  'analisis-archivos',
  true,
  104857600,   -- 100 MB por archivo
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policies para el bucket
CREATE POLICY "analisis_bucket_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'analisis-archivos');
CREATE POLICY "analisis_bucket_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'analisis-archivos');
CREATE POLICY "analisis_bucket_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'analisis-archivos');
