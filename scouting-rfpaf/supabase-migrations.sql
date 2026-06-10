CREATE TABLE IF NOT EXISTS fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro TEXT UNIQUE NOT NULL,
  fecha_partido DATE NOT NULL,
  equipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  local TEXT NOT NULL,
  visitante TEXT NOT NULL,
  observador UUID NOT NULL,
  nombre TEXT NOT NULL,
  primer_apellido TEXT NOT NULL,
  segundo_apellido TEXT,
  fecha_nacimiento DATE NOT NULL,
  dorsal INTEGER,
  lateralidad TEXT NOT NULL,
  tipologia TEXT NOT NULL,
  altura TEXT NOT NULL,
  club UUID NOT NULL,
  foto TEXT,
  fuerza INTEGER,
  velocidad INTEGER,
  resistencia INTEGER,
  demarcacion TEXT NOT NULL,
  otra_demarcacion TEXT,
  evaluacion_tecnica JSONB,
  valoracion_general INTEGER,
  propuesta TEXT NOT NULL,
  descripcion_jugadora TEXT,
  observaciones TEXT,
  cierre TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clubes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  escudo TEXT,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fichas_observador_idx ON fichas(observador);
CREATE INDEX IF NOT EXISTS fichas_club_idx ON fichas(club);
CREATE INDEX IF NOT EXISTS fichas_fecha_partido_idx ON fichas(fecha_partido);
CREATE INDEX IF NOT EXISTS fichas_propuesta_idx ON fichas(propuesta);

ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE observadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY fichas_select ON fichas FOR SELECT USING (true);
CREATE POLICY clubes_select ON clubes FOR SELECT USING (true);
CREATE POLICY observadores_select ON observadores FOR SELECT USING (true);
CREATE POLICY categorias_select ON categorias FOR SELECT USING (true);

CREATE POLICY fichas_insert ON fichas FOR INSERT WITH CHECK (true);
CREATE POLICY fichas_update ON fichas FOR UPDATE USING (true);
CREATE POLICY fichas_delete ON fichas FOR DELETE USING (true);

CREATE POLICY clubes_insert ON clubes FOR INSERT WITH CHECK (true);
CREATE POLICY clubes_update ON clubes FOR UPDATE USING (true);
CREATE POLICY clubes_delete ON clubes FOR DELETE USING (true);

CREATE POLICY observadores_insert ON observadores FOR INSERT WITH CHECK (true);
CREATE POLICY observadores_update ON observadores FOR UPDATE USING (true);
CREATE POLICY observadores_delete ON observadores FOR DELETE USING (true);

CREATE POLICY categorias_insert ON categorias FOR INSERT WITH CHECK (true);
CREATE POLICY categorias_update ON categorias FOR UPDATE USING (true);
CREATE POLICY categorias_delete ON categorias FOR DELETE USING (true);
