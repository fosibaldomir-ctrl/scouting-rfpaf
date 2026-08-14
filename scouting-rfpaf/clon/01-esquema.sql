-- Esquema de la app de scouting (copia de jdgcazppxazlihdronsv)
-- Generado el 2026-08-12
-- Pégalo entero en el editor SQL del proyecto Supabase NUEVO y ejecútalo una sola vez.

-- ─── Extensiones ───
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists "uuid-ossp" with schema extensions;

-- ─── Tablas ───
create table if not exists public.abp_acciones (
  id uuid not null default gen_random_uuid(),
  analisis_id uuid not null,
  tipo text not null,
  orden integer not null default 0,
  titulo text not null default ''::text,
  notas text not null default ''::text,
  imagen_pizarra_url text,
  video_url text not null default ''::text,
  notas2 text not null default ''::text,
  imagen2_url text,
  video2_url text not null default ''::text,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.actas_procesadas (
  id uuid not null default gen_random_uuid(),
  cod_acta text not null,
  competicion_mapeo_id uuid,
  jornada integer,
  fecha_partido text not null default ''::text,
  equipo_local text not null default ''::text,
  equipo_visitante text not null default ''::text,
  jugadoras_actualizadas integer not null default 0,
  jugadoras_sin_match integer not null default 0,
  procesado_en timestamp with time zone not null default now()
);

create table if not exists public.analisis_partidos (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  rival text not null default ''::text,
  fecha text not null default ''::text,
  categoria text,
  equipo_local jsonb not null default '{}'::jsonb,
  equipo_visitante jsonb not null default '{}'::jsonb,
  analisis_ia text not null default ''::text,
  caracteristicas_rival jsonb not null default '{}'::jsonb,
  video_rival_url text not null default ''::text,
  presentacion_url text not null default ''::text,
  bloque_ataque jsonb not null default '{}'::jsonb,
  bloque_defensa jsonb not null default '{}'::jsonb,
  bloque_transicion jsonb not null default '{}'::jsonb,
  abp_ofensivo jsonb not null default '[]'::jsonb,
  abp_defensivo jsonb not null default '[]'::jsonb,
  video_partido_url text not null default ''::text,
  tiempos jsonb not null default '{}'::jsonb,
  eventos_partido jsonb not null default '[]'::jsonb,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.calendario_partidos (
  id text not null,
  fecha date not null,
  hora text not null,
  local text not null,
  visitante text not null,
  observador text not null,
  categoria text not null,
  creado_en timestamp without time zone default now()
);

create table if not exists public.categorias (
  id text not null default gen_random_uuid(),
  nombre text not null,
  creado_en timestamp without time zone default now()
);

create table if not exists public.clubes (
  id text not null default gen_random_uuid(),
  nombre text not null,
  escudo text,
  creado_en timestamp without time zone default now()
);

create table if not exists public.competicion_mapeos (
  id uuid not null default gen_random_uuid(),
  temporada_valor text not null,
  temporada_label text not null default ''::text,
  tipo_juego text not null default '1'::text,
  competicion_id text not null,
  competicion_label text not null default ''::text,
  grupo_id text not null,
  grupo_label text not null default ''::text,
  categoria text not null,
  activo boolean not null default true,
  ultima_jornada_procesada integer not null default 0,
  creado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now()
);

create table if not exists public.convocatorias (
  id uuid not null,
  nombre text not null,
  fecha date not null,
  hora text not null,
  jugadoras jsonb not null default '[]'::jsonb,
  pdf_url text,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.ejercicios (
  id uuid not null default gen_random_uuid(),
  tipo text not null,
  duracion integer not null,
  num_jugadores text not null,
  material text,
  descripcion text not null,
  imagen text,
  video text,
  creado_en timestamp without time zone default now(),
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create table if not exists public.eventos_calendario (
  id uuid not null default gen_random_uuid(),
  titulo text not null,
  fecha date not null,
  hora_inicio text not null,
  hora_fin text,
  tipo text not null default 'otro'::text,
  descripcion text default ''::text,
  creado_en timestamp with time zone default now(),
  link text
);

create table if not exists public.fichas (
  id text not null default gen_random_uuid(),
  registro text not null,
  fecha_partido date not null,
  equipo text not null,
  categoria text not null,
  local text not null,
  visitante text not null,
  observador text not null,
  nombre text not null,
  primer_apellido text not null,
  segundo_apellido text,
  fecha_nacimiento date,
  dorsal integer,
  lateralidad text not null,
  tipologia text not null,
  altura text not null,
  club text not null,
  foto text,
  fuerza integer,
  velocidad integer,
  resistencia integer,
  demarcacion text not null,
  otra_demarcacion text,
  evaluacion_tecnica jsonb,
  valoracion_general integer,
  propuesta text not null,
  descripcion_jugadora text,
  observaciones text,
  cierre text,
  creado_en timestamp without time zone default now(),
  actualizado_en timestamp without time zone default now(),
  minutos_jugados integer default 0,
  partidos_titular integer default 0,
  partidos_suplente integer default 0,
  goles integer default 0,
  tarjetas_amarillas integer default 0,
  tarjetas_rojas integer default 0,
  valoraciones jsonb not null default '[]'::jsonb
);

create table if not exists public.historial_acciones (
  id uuid not null default gen_random_uuid(),
  objetivo_id uuid not null,
  fecha date not null,
  tipo text not null,
  titulo text,
  comentario text not null,
  imagen_url text,
  video_url text,
  estado_badge text,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.informe_evaluaciones (
  id uuid not null default gen_random_uuid(),
  partido_informe_id uuid not null,
  orden integer not null default 0,
  ficha_id text,
  nombre text not null default ''::text,
  apellidos text not null default ''::text,
  foto_url text,
  dorsal integer,
  lateralidad text not null default ''::text,
  fecha_nacimiento date,
  club_nombre text not null default ''::text,
  club_escudo_url text,
  posicion_x numeric,
  posicion_y numeric,
  minutos integer not null default 0,
  goles integer not null default 0,
  asistencias integer not null default 0,
  tarjetas_amarillas integer not null default 0,
  tarjetas_rojas integer not null default 0,
  valoracion numeric,
  comentario text not null default ''::text,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.informe_partidos (
  id uuid not null default gen_random_uuid(),
  informe_id uuid not null,
  jornada integer not null default 1,
  rival_nombre text not null default ''::text,
  rival_escudo_url text,
  resultado_local integer not null default 0,
  resultado_visitante integer not null default 0,
  fecha_partido date,
  hora_partido text not null default ''::text,
  campo_nombre text not null default ''::text,
  campo_foto_url text,
  condiciones text not null default 'soleado'::text,
  equipacion_local_url text,
  equipacion_visitante_url text,
  sistema text not null default ''::text,
  alineacion_titulares jsonb not null default '[]'::jsonb,
  alineacion_suplentes jsonb not null default '[]'::jsonb,
  plan_ofensivo jsonb not null default '{}'::jsonb,
  plan_defensivo jsonb not null default '{}'::jsonb,
  creado_en timestamp with time zone not null default now(),
  sistema_rival text not null default ''::text
);

create table if not exists public.informes (
  id uuid not null default gen_random_uuid(),
  titulo text not null default ''::text,
  autor text not null default ''::text,
  fecha date,
  conclusiones text not null default ''::text,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.objetivos_individuales (
  id uuid not null default gen_random_uuid(),
  ficha_id text,
  player_name text not null,
  player_club text,
  player_photo text,
  player_number integer,
  titulo text not null,
  descripcion text,
  fecha_inicio date not null,
  estado text not null default 'EN_CURSO'::text,
  tipo text not null default 'DEPORTIVO'::text,
  accion text not null default 'MEJORAR'::text,
  imagen_url text,
  pdf_url text,
  video_url text,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.observadores (
  id text not null default gen_random_uuid(),
  nombre text not null,
  creado_en timestamp without time zone default now(),
  foto text
);

create table if not exists public.profiles (
  id uuid not null,
  nombre text not null default ''::text,
  email text not null,
  rol text not null default 'scout'::text,
  observador_id text,
  activo boolean not null default true,
  creado_en timestamp with time zone not null default now()
);

create table if not exists public.sync_runs (
  id uuid not null default gen_random_uuid(),
  iniciado_en timestamp with time zone not null default now(),
  finalizado_en timestamp with time zone,
  estado text not null default 'en_curso'::text,
  disparado_por text not null default 'cron'::text,
  competiciones_procesadas integer not null default 0,
  actas_nuevas integer not null default 0,
  fichas_actualizadas integer not null default 0,
  jugadoras_sin_match integer not null default 0,
  errores jsonb not null default '[]'::jsonb,
  resumen text not null default ''::text
);

create table if not exists public.videos_sesiones (
  id uuid not null default gen_random_uuid(),
  fecha date not null,
  seleccion text not null,
  titulo text not null,
  descripcion text default ''::text,
  url_video text not null,
  creado_en timestamp with time zone default now()
);

-- ─── Claves primarias, únicas y comprobaciones ───
alter table public.abp_acciones add constraint abp_acciones_pkey PRIMARY KEY (id);
alter table public.actas_procesadas add constraint actas_procesadas_pkey PRIMARY KEY (id);
alter table public.analisis_partidos add constraint analisis_partidos_pkey PRIMARY KEY (id);
alter table public.calendario_partidos add constraint calendario_partidos_pkey PRIMARY KEY (id);
alter table public.categorias add constraint categorias_pkey PRIMARY KEY (id);
alter table public.clubes add constraint clubes_pkey PRIMARY KEY (id);
alter table public.competicion_mapeos add constraint competicion_mapeos_pkey PRIMARY KEY (id);
alter table public.convocatorias add constraint convocatorias_pkey PRIMARY KEY (id);
alter table public.ejercicios add constraint ejercicios_pkey PRIMARY KEY (id);
alter table public.eventos_calendario add constraint eventos_calendario_pkey PRIMARY KEY (id);
alter table public.fichas add constraint fichas_pkey PRIMARY KEY (id);
alter table public.historial_acciones add constraint historial_acciones_pkey PRIMARY KEY (id);
alter table public.informe_evaluaciones add constraint informe_evaluaciones_pkey PRIMARY KEY (id);
alter table public.informe_partidos add constraint informe_partidos_pkey PRIMARY KEY (id);
alter table public.informes add constraint informes_pkey PRIMARY KEY (id);
alter table public.objetivos_individuales add constraint objetivos_individuales_pkey PRIMARY KEY (id);
alter table public.observadores add constraint observadores_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.sync_runs add constraint sync_runs_pkey PRIMARY KEY (id);
alter table public.videos_sesiones add constraint videos_sesiones_pkey PRIMARY KEY (id);
alter table public.actas_procesadas add constraint actas_procesadas_cod_acta_key UNIQUE (cod_acta);
alter table public.categorias add constraint categorias_nombre_key UNIQUE (nombre);
alter table public.clubes add constraint clubes_nombre_key UNIQUE (nombre);
alter table public.fichas add constraint fichas_registro_key UNIQUE (registro);
alter table public.observadores add constraint observadores_nombre_key UNIQUE (nombre);
alter table public.abp_acciones add constraint abp_acciones_tipo_check CHECK ((tipo = ANY (ARRAY['ofensivo'::text, 'defensivo'::text])));
alter table public.eventos_calendario add constraint eventos_calendario_tipo_check CHECK ((tipo = ANY (ARRAY['reunion'::text, 'convocatoria'::text, 'entrenamiento'::text, 'partido'::text, 'otro'::text])));
alter table public.profiles add constraint profiles_rol_check CHECK ((rol = ANY (ARRAY['admin'::text, 'scout'::text, 'direccion'::text, 'fisio'::text])));
alter table public.sync_runs add constraint sync_runs_disparado_por_check CHECK ((disparado_por = ANY (ARRAY['cron'::text, 'manual'::text])));
alter table public.sync_runs add constraint sync_runs_estado_check CHECK ((estado = ANY (ARRAY['en_curso'::text, 'completado'::text, 'error'::text])));
alter table public.videos_sesiones add constraint videos_sesiones_seleccion_check CHECK ((seleccion = ANY (ARRAY['SUB 12'::text, 'SUB 14'::text, 'SUB 16'::text])));

-- ─── Claves foráneas ───
alter table public.abp_acciones add constraint abp_acciones_analisis_id_fkey FOREIGN KEY (analisis_id) REFERENCES analisis_partidos(id) ON DELETE CASCADE;
alter table public.actas_procesadas add constraint actas_procesadas_competicion_mapeo_id_fkey FOREIGN KEY (competicion_mapeo_id) REFERENCES competicion_mapeos(id) ON DELETE SET NULL;
alter table public.historial_acciones add constraint historial_acciones_objetivo_id_fkey FOREIGN KEY (objetivo_id) REFERENCES objetivos_individuales(id) ON DELETE CASCADE;
alter table public.informe_evaluaciones add constraint informe_evaluaciones_partido_informe_id_fkey FOREIGN KEY (partido_informe_id) REFERENCES informe_partidos(id) ON DELETE CASCADE;
alter table public.informe_partidos add constraint informe_partidos_informe_id_fkey FOREIGN KEY (informe_id) REFERENCES informes(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── Índices ───
CREATE INDEX abp_acciones_analisis_id_idx ON public.abp_acciones USING btree (analisis_id);
CREATE INDEX calendario_partidos_fecha_idx ON public.calendario_partidos USING btree (fecha);
CREATE INDEX calendario_partidos_observador_idx ON public.calendario_partidos USING btree (observador);
CREATE INDEX fichas_club_idx ON public.fichas USING btree (club);
CREATE INDEX fichas_fecha_partido_idx ON public.fichas USING btree (fecha_partido);
CREATE INDEX fichas_observador_idx ON public.fichas USING btree (observador);
CREATE INDEX fichas_propuesta_idx ON public.fichas USING btree (propuesta);
CREATE INDEX fichas_valoraciones_gin_idx ON public.fichas USING gin (valoraciones);
CREATE INDEX idx_actas_procesadas_cod_acta ON public.actas_procesadas USING btree (cod_acta);
CREATE INDEX idx_analisis_categoria ON public.analisis_partidos USING btree (categoria);
CREATE INDEX idx_analisis_creado_en ON public.analisis_partidos USING btree (creado_en DESC);
CREATE INDEX idx_analisis_fecha ON public.analisis_partidos USING btree (fecha DESC);
CREATE INDEX idx_competicion_mapeos_activo ON public.competicion_mapeos USING btree (activo);
CREATE INDEX idx_ejercicios_creado_en ON public.ejercicios USING btree (creado_en DESC);
CREATE INDEX idx_ejercicios_descripcion ON public.ejercicios USING gin (to_tsvector('spanish'::regconfig, descripcion));
CREATE INDEX idx_ejercicios_material ON public.ejercicios USING btree (material);
CREATE INDEX idx_ejercicios_num_jugadores ON public.ejercicios USING btree (num_jugadores);
CREATE INDEX idx_ejercicios_tipo ON public.ejercicios USING btree (tipo);
CREATE INDEX idx_historial_objetivo_id ON public.historial_acciones USING btree (objetivo_id);
CREATE INDEX idx_objetivos_creado_en ON public.objetivos_individuales USING btree (creado_en DESC);
CREATE INDEX idx_sync_runs_iniciado_en ON public.sync_runs USING btree (iniciado_en DESC);
CREATE INDEX informe_evaluaciones_partido_id_idx ON public.informe_evaluaciones USING btree (partido_informe_id);
CREATE INDEX informe_partidos_informe_id_idx ON public.informe_partidos USING btree (informe_id);

-- ─── Funciones ───
CREATE OR REPLACE FUNCTION public.apply_acta_stats(p_cod_acta text, p_competicion_mapeo_id uuid, p_jornada integer, p_fecha_partido text, p_equipo_local text, p_equipo_visitante text, p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- ─── Seguridad a nivel de fila ───
alter table public.abp_acciones enable row level security;
alter table public.actas_procesadas enable row level security;
alter table public.analisis_partidos enable row level security;
alter table public.calendario_partidos enable row level security;
alter table public.categorias enable row level security;
alter table public.clubes enable row level security;
alter table public.competicion_mapeos enable row level security;
alter table public.convocatorias enable row level security;
alter table public.ejercicios enable row level security;
alter table public.eventos_calendario enable row level security;
alter table public.fichas enable row level security;
alter table public.historial_acciones enable row level security;
alter table public.informe_evaluaciones enable row level security;
alter table public.informe_partidos enable row level security;
alter table public.informes enable row level security;
alter table public.objetivos_individuales enable row level security;
alter table public.observadores enable row level security;
alter table public.profiles enable row level security;
alter table public.sync_runs enable row level security;
alter table public.videos_sesiones enable row level security;

-- ─── Políticas de acceso ───
create policy abp_acciones_public_delete on public.abp_acciones as PERMISSIVE for DELETE to public using (true);
create policy abp_acciones_public_insert on public.abp_acciones as PERMISSIVE for INSERT to public with check (true);
create policy abp_acciones_public_select on public.abp_acciones as PERMISSIVE for SELECT to public using (true);
create policy abp_acciones_public_update on public.abp_acciones as PERMISSIVE for UPDATE to public using (true);
create policy actas_procesadas_public_insert on public.actas_procesadas as PERMISSIVE for INSERT to public with check (true);
create policy actas_procesadas_public_select on public.actas_procesadas as PERMISSIVE for SELECT to public using (true);
create policy analisis_public_delete on public.analisis_partidos as PERMISSIVE for DELETE to public using (true);
create policy analisis_public_insert on public.analisis_partidos as PERMISSIVE for INSERT to public with check (true);
create policy analisis_public_select on public.analisis_partidos as PERMISSIVE for SELECT to public using (true);
create policy analisis_public_update on public.analisis_partidos as PERMISSIVE for UPDATE to public using (true);
create policy calendario_partidos_delete on public.calendario_partidos as PERMISSIVE for DELETE to public using (true);
create policy calendario_partidos_insert on public.calendario_partidos as PERMISSIVE for INSERT to public with check (true);
create policy calendario_partidos_select on public.calendario_partidos as PERMISSIVE for SELECT to public using (true);
create policy calendario_partidos_update on public.calendario_partidos as PERMISSIVE for UPDATE to public using (true);
create policy categorias_delete on public.categorias as PERMISSIVE for DELETE to public using (true);
create policy categorias_insert on public.categorias as PERMISSIVE for INSERT to public with check (true);
create policy categorias_select on public.categorias as PERMISSIVE for SELECT to public using (true);
create policy categorias_update on public.categorias as PERMISSIVE for UPDATE to public using (true);
create policy clubes_delete on public.clubes as PERMISSIVE for DELETE to public using (true);
create policy clubes_insert on public.clubes as PERMISSIVE for INSERT to public with check (true);
create policy clubes_select on public.clubes as PERMISSIVE for SELECT to public using (true);
create policy clubes_update on public.clubes as PERMISSIVE for UPDATE to public using (true);
create policy competicion_mapeos_public_delete on public.competicion_mapeos as PERMISSIVE for DELETE to public using (true);
create policy competicion_mapeos_public_insert on public.competicion_mapeos as PERMISSIVE for INSERT to public with check (true);
create policy competicion_mapeos_public_select on public.competicion_mapeos as PERMISSIVE for SELECT to public using (true);
create policy competicion_mapeos_public_update on public.competicion_mapeos as PERMISSIVE for UPDATE to public using (true);
create policy "Allow all on convocatorias" on public.convocatorias as PERMISSIVE for ALL to public using (true) with check (true);
create policy "Allow delete ejercicios" on public.ejercicios as PERMISSIVE for DELETE to anon, authenticated using (true);
create policy "Ejercicios delete autenticado" on public.ejercicios as PERMISSIVE for DELETE to public using ((auth.role() = 'authenticated'::text));
create policy "Ejercicios insert público" on public.ejercicios as PERMISSIVE for INSERT to public with check (true);
create policy "Ejercicios lectura pública" on public.ejercicios as PERMISSIVE for SELECT to public using (true);
create policy "Ejercicios update autenticado" on public.ejercicios as PERMISSIVE for UPDATE to public using ((auth.role() = 'authenticated'::text));
create policy "Allow all on eventos_calendario" on public.eventos_calendario as PERMISSIVE for ALL to anon, authenticated using (true) with check (true);
create policy fichas_delete on public.fichas as PERMISSIVE for DELETE to public using (true);
create policy fichas_insert on public.fichas as PERMISSIVE for INSERT to public with check (true);
create policy fichas_select on public.fichas as PERMISSIVE for SELECT to public using (true);
create policy fichas_update on public.fichas as PERMISSIVE for UPDATE to public using (true);
create policy allow_all_historial on public.historial_acciones as PERMISSIVE for ALL to public using (true) with check (true);
create policy informe_evaluaciones_public_delete on public.informe_evaluaciones as PERMISSIVE for DELETE to public using (true);
create policy informe_evaluaciones_public_insert on public.informe_evaluaciones as PERMISSIVE for INSERT to public with check (true);
create policy informe_evaluaciones_public_select on public.informe_evaluaciones as PERMISSIVE for SELECT to public using (true);
create policy informe_evaluaciones_public_update on public.informe_evaluaciones as PERMISSIVE for UPDATE to public using (true);
create policy informe_partidos_public_delete on public.informe_partidos as PERMISSIVE for DELETE to public using (true);
create policy informe_partidos_public_insert on public.informe_partidos as PERMISSIVE for INSERT to public with check (true);
create policy informe_partidos_public_select on public.informe_partidos as PERMISSIVE for SELECT to public using (true);
create policy informe_partidos_public_update on public.informe_partidos as PERMISSIVE for UPDATE to public using (true);
create policy informes_public_delete on public.informes as PERMISSIVE for DELETE to public using (true);
create policy informes_public_insert on public.informes as PERMISSIVE for INSERT to public with check (true);
create policy informes_public_select on public.informes as PERMISSIVE for SELECT to public using (true);
create policy informes_public_update on public.informes as PERMISSIVE for UPDATE to public using (true);
create policy allow_all_objetivos on public.objetivos_individuales as PERMISSIVE for ALL to public using (true) with check (true);
create policy observadores_delete on public.observadores as PERMISSIVE for DELETE to public using (true);
create policy observadores_insert on public.observadores as PERMISSIVE for INSERT to public with check (true);
create policy observadores_select on public.observadores as PERMISSIVE for SELECT to public using (true);
create policy observadores_update on public.observadores as PERMISSIVE for UPDATE to public using (true);
create policy "profiles admin read" on public.profiles as PERMISSIVE for SELECT to public using (((auth.jwt() #>> '{app_metadata,rol}'::text[]) = 'admin'::text));
create policy "profiles admin write" on public.profiles as PERMISSIVE for ALL to public using (((auth.jwt() #>> '{app_metadata,rol}'::text[]) = 'admin'::text)) with check (((auth.jwt() #>> '{app_metadata,rol}'::text[]) = 'admin'::text));
create policy "profiles self read" on public.profiles as PERMISSIVE for SELECT to public using ((auth.uid() = id));
create policy sync_runs_public_insert on public.sync_runs as PERMISSIVE for INSERT to public with check (true);
create policy sync_runs_public_select on public.sync_runs as PERMISSIVE for SELECT to public using (true);
create policy sync_runs_public_update on public.sync_runs as PERMISSIVE for UPDATE to public using (true);
create policy "Allow all on videos_sesiones" on public.videos_sesiones as PERMISSIVE for ALL to anon, authenticated using (true) with check (true);

-- ─── Buckets de almacenamiento ───
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('analisis-archivos', 'analisis-archivos', 't', 104857600, '{image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm}'::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('convocatorias-pdfs', 'convocatorias-pdfs', 't', null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('ejercicios', 'ejercicios', 't', null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('informes-archivos', 'informes-archivos', 't', null, null) on conflict (id) do nothing;

-- ─── Políticas de almacenamiento ───
create policy "Allow all on convocatorias-pdfs" on storage.objects as PERMISSIVE for ALL to public using ((bucket_id = 'convocatorias-pdfs'::text)) with check ((bucket_id = 'convocatorias-pdfs'::text));
create policy analisis_bucket_delete on storage.objects as PERMISSIVE for DELETE to public using ((bucket_id = 'analisis-archivos'::text));
create policy analisis_bucket_insert on storage.objects as PERMISSIVE for INSERT to public with check ((bucket_id = 'analisis-archivos'::text));
create policy analisis_bucket_select on storage.objects as PERMISSIVE for SELECT to public using ((bucket_id = 'analisis-archivos'::text));
create policy informes_bucket_delete on storage.objects as PERMISSIVE for DELETE to public using ((bucket_id = 'informes-archivos'::text));
create policy informes_bucket_insert on storage.objects as PERMISSIVE for INSERT to public with check ((bucket_id = 'informes-archivos'::text));
create policy informes_bucket_select on storage.objects as PERMISSIVE for SELECT to public using ((bucket_id = 'informes-archivos'::text));
create policy "true 1ymux1e_0" on storage.objects as PERMISSIVE for INSERT to public with check ((bucket_id = 'ejercicios'::text));
create policy "true 1ymux1e_1" on storage.objects as PERMISSIVE for UPDATE to public using ((bucket_id = 'ejercicios'::text));
create policy "true 1ymux1e_2" on storage.objects as PERMISSIVE for SELECT to public using ((bucket_id = 'ejercicios'::text));
