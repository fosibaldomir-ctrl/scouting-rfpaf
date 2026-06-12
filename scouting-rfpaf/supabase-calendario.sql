-- Tabla calendario_partidos: histórico de partidos asignados/vistos
-- Ejecutar en Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS calendario_partidos (
  id TEXT PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TEXT NOT NULL,
  local TEXT NOT NULL,
  visitante TEXT NOT NULL,
  observador TEXT NOT NULL,
  categoria TEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendario_partidos_fecha_idx ON calendario_partidos(fecha);
CREATE INDEX IF NOT EXISTS calendario_partidos_observador_idx ON calendario_partidos(observador);

ALTER TABLE calendario_partidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendario_partidos_select ON calendario_partidos FOR SELECT USING (true);
CREATE POLICY calendario_partidos_insert ON calendario_partidos FOR INSERT WITH CHECK (true);
CREATE POLICY calendario_partidos_update ON calendario_partidos FOR UPDATE USING (true);
CREATE POLICY calendario_partidos_delete ON calendario_partidos FOR DELETE USING (true);
