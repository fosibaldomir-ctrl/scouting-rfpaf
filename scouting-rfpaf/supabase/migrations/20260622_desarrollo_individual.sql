-- ═══════════════════════════════════════════════════════════════
--  DESARROLLO INDIVIDUAL — tablas + RLS
--  Ejecutar en: Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabla principal de objetivos ──────────────────────────
CREATE TABLE IF NOT EXISTS objetivos_individuales (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id     text,                          -- referencia opcional a fichas BD
  player_name  text NOT NULL,
  player_club  text,
  player_photo text,
  player_number integer,
  titulo       text NOT NULL,
  descripcion  text,
  fecha_inicio date NOT NULL,
  estado       text NOT NULL DEFAULT 'EN_CURSO',   -- EN_CURSO | COMPLETADO | ABANDONADO
  tipo         text NOT NULL DEFAULT 'DEPORTIVO',  -- DEPORTIVO | FISICO | MENTAL | TECNICO | TACTICO
  accion       text NOT NULL DEFAULT 'MEJORAR',    -- MEJORAR | MANTENER | DESARROLLAR | CORREGIR
  imagen_url   text,
  pdf_url      text,
  video_url    text,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Tabla de historial (acciones y evaluaciones) ──────────
CREATE TABLE IF NOT EXISTS historial_acciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo_id  uuid NOT NULL REFERENCES objetivos_individuales(id) ON DELETE CASCADE,
  fecha        date NOT NULL,
  tipo         text NOT NULL,                      -- SESION | PARTIDO | EVALUACION
  titulo       text,
  comentario   text NOT NULL,
  imagen_url   text,
  video_url    text,
  estado_badge text,                               -- EN_CURSO | CONSEGUIDO | EN_REVISION
  creado_en    timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_objetivos_creado_en   ON objetivos_individuales(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_historial_objetivo_id ON historial_acciones(objetivo_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha       ON historial_acciones(fecha DESC);

-- ── 4. Row Level Security ─────────────────────────────────────
ALTER TABLE objetivos_individuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_acciones     ENABLE ROW LEVEL SECURITY;

-- Política permisiva (misma que el resto de tablas de la app)
DROP POLICY IF EXISTS "allow_all_objetivos"  ON objetivos_individuales;
DROP POLICY IF EXISTS "allow_all_historial"  ON historial_acciones;

CREATE POLICY "allow_all_objetivos"
  ON objetivos_individuales FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_historial"
  ON historial_acciones FOR ALL
  USING (true) WITH CHECK (true);
