-- ================================================================
-- Sincronización automática de estadísticas desde actas de asturfutbol.es
-- ================================================================

-- Mapeo editable desde Admin: qué competición/grupo de asturfutbol.es
-- corresponde a cada categoría de la app. Los IDs cambian cada temporada.
CREATE TABLE IF NOT EXISTS competicion_mapeos (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  temporada_valor          text        NOT NULL,        -- value del <select id=temporada>, ej '21'
  temporada_label          text        NOT NULL DEFAULT '', -- ej '2025-2026'
  tipo_juego               text        NOT NULL DEFAULT '1', -- value de #Sch_Tipo_Juego, 1 = Futbol-11
  competicion_id           text        NOT NULL,        -- value de #competicion
  competicion_label        text        NOT NULL DEFAULT '',
  grupo_id                 text        NOT NULL,        -- value de #grupo
  grupo_label               text        NOT NULL DEFAULT '',
  categoria                text        NOT NULL,        -- debe coincidir con categorias.nombre
  activo                   boolean     NOT NULL DEFAULT true,
  ultima_jornada_procesada integer     NOT NULL DEFAULT 0,
  creado_en                timestamptz NOT NULL DEFAULT now(),
  actualizado_en           timestamptz NOT NULL DEFAULT now()
);

-- Ledger de idempotencia: cada acta se procesa una única vez.
CREATE TABLE IF NOT EXISTS actas_procesadas (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_acta                text        NOT NULL UNIQUE,
  competicion_mapeo_id    uuid        REFERENCES competicion_mapeos(id) ON DELETE SET NULL,
  jornada                 integer,
  fecha_partido           text        NOT NULL DEFAULT '',
  equipo_local            text        NOT NULL DEFAULT '',
  equipo_visitante        text        NOT NULL DEFAULT '',
  jugadoras_actualizadas  integer     NOT NULL DEFAULT 0,
  jugadoras_sin_match     integer     NOT NULL DEFAULT 0,
  procesado_en            timestamptz NOT NULL DEFAULT now()
);

-- Log de cada ejecución del job (cron o manual), para poder ver qué pasó.
CREATE TABLE IF NOT EXISTS sync_runs (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_en             timestamptz NOT NULL DEFAULT now(),
  finalizado_en           timestamptz,
  estado                  text        NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso','completado','error')),
  disparado_por           text        NOT NULL DEFAULT 'cron' CHECK (disparado_por IN ('cron','manual')),
  competiciones_procesadas integer    NOT NULL DEFAULT 0,
  actas_nuevas            integer     NOT NULL DEFAULT 0,
  fichas_actualizadas     integer     NOT NULL DEFAULT 0,
  jugadoras_sin_match     integer     NOT NULL DEFAULT 0,
  errores                 jsonb       NOT NULL DEFAULT '[]',
  resumen                 text        NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_competicion_mapeos_activo ON competicion_mapeos (activo);
CREATE INDEX IF NOT EXISTS idx_actas_procesadas_cod_acta ON actas_procesadas (cod_acta);
CREATE INDEX IF NOT EXISTS idx_sync_runs_iniciado_en     ON sync_runs (iniciado_en DESC);

ALTER TABLE competicion_mapeos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competicion_mapeos_public_select" ON competicion_mapeos FOR SELECT USING (true);
CREATE POLICY "competicion_mapeos_public_insert" ON competicion_mapeos FOR INSERT WITH CHECK (true);
CREATE POLICY "competicion_mapeos_public_update" ON competicion_mapeos FOR UPDATE USING (true);
CREATE POLICY "competicion_mapeos_public_delete" ON competicion_mapeos FOR DELETE USING (true);

ALTER TABLE actas_procesadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actas_procesadas_public_select" ON actas_procesadas FOR SELECT USING (true);
CREATE POLICY "actas_procesadas_public_insert" ON actas_procesadas FOR INSERT WITH CHECK (true);

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_runs_public_select" ON sync_runs FOR SELECT USING (true);
CREATE POLICY "sync_runs_public_insert" ON sync_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "sync_runs_public_update" ON sync_runs FOR UPDATE USING (true);

-- ================================================================
-- RPC: aplica las estadísticas de una acta de forma atómica e idempotente.
-- Si el cod_acta ya fue procesado, no hace nada (permite reintentar sin duplicar).
-- p_updates: jsonb array de {ficha_id, minutos, titular, suplente, goles, amarillas, rojas}
-- ================================================================
CREATE OR REPLACE FUNCTION apply_acta_stats(
  p_cod_acta text,
  p_competicion_mapeo_id uuid,
  p_jornada int,
  p_fecha_partido text,
  p_equipo_local text,
  p_equipo_visitante text,
  p_updates jsonb
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_count int := 0;
  v_item jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM actas_procesadas WHERE cod_acta = p_cod_acta) THEN
    RETURN jsonb_build_object('already_processed', true, 'updated', 0);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates) LOOP
    UPDATE fichas SET
      minutos_jugados    = minutos_jugados    + COALESCE((v_item->>'minutos')::int, 0),
      partidos_titular   = partidos_titular   + COALESCE((v_item->>'titular')::int, 0),
      partidos_suplente  = partidos_suplente  + COALESCE((v_item->>'suplente')::int, 0),
      goles              = goles              + COALESCE((v_item->>'goles')::int, 0),
      tarjetas_amarillas = tarjetas_amarillas + COALESCE((v_item->>'amarillas')::int, 0),
      tarjetas_rojas     = tarjetas_rojas     + COALESCE((v_item->>'rojas')::int, 0),
      actualizado_en     = now()
    WHERE id = (v_item->>'ficha_id')::uuid;
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO actas_procesadas (cod_acta, competicion_mapeo_id, jornada, fecha_partido, equipo_local, equipo_visitante, jugadoras_actualizadas)
  VALUES (p_cod_acta, p_competicion_mapeo_id, p_jornada, p_fecha_partido, p_equipo_local, p_equipo_visitante, v_count);

  RETURN jsonb_build_object('already_processed', false, 'updated', v_count);
END;
$$;
