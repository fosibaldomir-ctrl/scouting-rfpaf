-- Añade el historial de valoraciones por partido a la tabla `fichas`.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

-- 1. Columna nueva: array de valoraciones (una por partido observado).
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS valoraciones JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Backfill: para fichas ya existentes que tienen datos reales de partido
--    (observador/local/visitante no vacíos), se crea una primera entrada en
--    el array a partir de sus campos de valoración actuales. Las plantillas
--    cargadas por CSV (sin datos de partido) se quedan con valoraciones: [].
--    Idempotente: solo toca filas cuyo array sigue vacío.
UPDATE fichas
SET valoraciones = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'fechaPartido', to_char(fecha_partido::date, 'YYYY-MM-DD'),
    'local', local,
    'visitante', visitante,
    'categoria', categoria,
    'observador', observador,
    'evaluacionTecnica', COALESCE(evaluacion_tecnica,
      jsonb_build_object('item1', 3, 'item2', 3, 'item3', 3, 'item4', 3, 'item5', 3, 'item6', 3)),
    'valoracionGeneral', COALESCE(valoracion_general, 0),
    'propuesta', propuesta,
    'descripcionJugadora', COALESCE(descripcion_jugadora, ''),
    'observaciones', COALESCE(observaciones, ''),
    'cierre', COALESCE(cierre, ''),
    'creadoEn', to_char(creado_en AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
)
WHERE valoraciones = '[]'::jsonb
  AND COALESCE(observador, '') <> ''
  AND COALESCE(local, '') <> ''
  AND COALESCE(visitante, '') <> '';

CREATE INDEX IF NOT EXISTS fichas_valoraciones_gin_idx ON fichas USING GIN (valoraciones);
