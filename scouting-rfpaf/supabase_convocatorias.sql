-- ============================================================
-- TABLA: convocatorias
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS convocatorias (
  id          UUID        PRIMARY KEY,
  nombre      TEXT        NOT NULL,
  fecha       DATE        NOT NULL,
  hora        TEXT        NOT NULL,          -- formato HH:MM
  jugadoras   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  pdf_url     TEXT,                          -- URL pública del PDF en Storage
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (permitir todo por ahora; ajustar según autenticación)
ALTER TABLE convocatorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on convocatorias"
  ON convocatorias
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- BUCKET DE STORAGE: convocatorias-pdfs
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('convocatorias-pdfs', 'convocatorias-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Política para subir y leer PDFs
CREATE POLICY "Allow all on convocatorias-pdfs"
  ON storage.objects
  FOR ALL
  USING  (bucket_id = 'convocatorias-pdfs')
  WITH CHECK (bucket_id = 'convocatorias-pdfs');
