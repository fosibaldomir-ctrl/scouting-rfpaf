-- Añade la valoración física (fuerza/velocidad/resistencia) a las valoraciones
-- ya existentes que aún no la tienen, tomándola del valor actual de la ficha.
-- Idempotente: solo toca elementos del array que no tengan ya 'fuerza'.
UPDATE fichas f
SET valoraciones = (
  SELECT jsonb_agg(
    CASE
      WHEN elem ? 'fuerza' THEN elem
      ELSE elem || jsonb_build_object(
        'fuerza', COALESCE(f.fuerza, 5),
        'velocidad', COALESCE(f.velocidad, 5),
        'resistencia', COALESCE(f.resistencia, 5)
      )
    END
  )
  FROM jsonb_array_elements(f.valoraciones) elem
)
WHERE jsonb_array_length(f.valoraciones) >= 1
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(f.valoraciones) e WHERE NOT (e ? 'fuerza')
  );
