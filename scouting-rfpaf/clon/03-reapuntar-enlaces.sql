-- Reapunta al proyecto nuevo los enlaces de ficheros guardados en las tablas.
--
-- Al copiar los datos, columnas como pdf_url, imagen_pizarra_url o los planes
-- tácticos (que llevan enlaces dentro de un JSON) siguen apuntando al proyecto
-- de origen. Si no se corrige, la app clonada carga las imágenes y los PDF desde
-- el Supabase de la otra federación: se rompería el día que allí se borre algo,
-- y mantiene atadas las dos instalaciones.
--
-- CÓMO USARLO
--   1. Ejecuta esto en el editor SQL del proyecto NUEVO, después de copiar los datos.
--   2. Cambia solo la línea `nuevo` por el dominio de tu proyecto (lo tienes en
--      Project Settings › Data API › Project URL).
--
-- Recorre por su cuenta todas las columnas de texto y JSON del esquema public,
-- así que no hay que ir tabla por tabla ni actualizarlo si mañana se añaden más.

do $$
declare
  r record;
  viejo text := 'https://jdgcazppxazlihdronsv.supabase.co';   -- proyecto de origen
  nuevo text := 'https://TU-PROYECTO-NUEVO.supabase.co';       -- ⬅ CAMBIA ESTO
  tocadas bigint := 0;
  n bigint;
begin
  if nuevo like '%TU-PROYECTO-NUEVO%' then
    raise exception 'Antes de ejecutar, sustituye la variable "nuevo" por el dominio de tu proyecto.';
  end if;

  for r in
    select c.table_name t, c.column_name col, c.data_type dt
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_name = c.table_name and tb.table_schema = c.table_schema
    where c.table_schema = 'public'
      and tb.table_type = 'BASE TABLE'
      and c.data_type in ('text', 'character varying', 'jsonb', 'json')
  loop
    if r.dt in ('jsonb', 'json') then
      execute format('update public.%I set %I = replace(%I::text, %L, %L)::jsonb where %I::text like %L',
        r.t, r.col, r.col, viejo, nuevo, r.col, '%' || viejo || '%');
    else
      execute format('update public.%I set %I = replace(%I, %L, %L) where %I like %L',
        r.t, r.col, r.col, viejo, nuevo, r.col, '%' || viejo || '%');
    end if;
    get diagnostics n = row_count;
    if n > 0 then
      raise notice 'reapuntadas % fila(s) en %.%', n, r.t, r.col;
      tocadas := tocadas + n;
    end if;
  end loop;

  raise notice 'Total de filas reapuntadas: %', tocadas;
end $$;

-- Comprobación: debe devolver 0 filas. Si sale alguna, ahí queda un enlace al origen.
select c.table_name as tabla, c.column_name as columna
from information_schema.columns c
join information_schema.tables tb
  on tb.table_name = c.table_name and tb.table_schema = c.table_schema
where c.table_schema = 'public' and tb.table_type = 'BASE TABLE'
  and c.data_type in ('text', 'character varying', 'jsonb', 'json');
