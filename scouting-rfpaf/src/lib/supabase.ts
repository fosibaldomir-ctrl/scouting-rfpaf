import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = rawKey.length > 10 ? rawKey : 'placeholder-key-not-configured'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface EjercicioDB {
  id: string
  tipo: string
  duracion: number
  num_jugadores: string
  material: string | null
  titulo: string
  descripcion: string
  imagen: string | null
  video: string | null
  creado_en: string
}

export async function fetchEjercicios(): Promise<EjercicioDB[]> {
  const { data, error } = await supabase
    .from('ejercicios')
    .select('*')
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error fetching ejercicios:', error)
    return []
  }
  return data || []
}

export async function uploadEjercicioImage(base64: string, ejercicioId: string): Promise<string | null> {
  try {
    console.log('uploadEjercicioImage called with:', { ejercicioId, base64Length: base64?.length })

    if (!base64) {
      console.warn('No base64 image provided')
      return null
    }

    const fileName = `ejercicio-${ejercicioId}-${Date.now()}.png`
    console.log('Uploading file:', fileName)

    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryData = atob(base64Data)
    const bytes = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i)
    }

    console.log('Converted to bytes, length:', bytes.length)

    const { data, error } = await supabase.storage
      .from('ejercicios')
      .upload(fileName, bytes, { contentType: 'image/png' })

    if (error) {
      console.error('Storage upload error:', error.message, error)
      alert(`Error al subir imagen: ${error.message}`)
      return null
    }

    console.log('File uploaded successfully:', data)

    const { data: publicUrl } = supabase.storage
      .from('ejercicios')
      .getPublicUrl(fileName)

    console.log('Public URL:', publicUrl.publicUrl)
    return publicUrl.publicUrl
  } catch (err) {
    console.error('Exception uploading image:', err)
    alert(`Excepción al subir imagen: ${err instanceof Error ? err.message : 'Unknown'}`)
    return null
  }
}

export async function createEjercicio(ejercicio: Omit<EjercicioDB, 'id' | 'creado_en'>): Promise<EjercicioDB | null> {
  try {
    console.log('Creating ejercicio:', ejercicio)
    const { data, error } = await supabase
      .from('ejercicios')
      .insert([{ ...ejercicio, creado_en: new Date().toISOString() }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint)
      alert(`Error al guardar: ${error.message}`)
      return null
    }
    console.log('Ejercicio created successfully:', data)
    return data
  } catch (err) {
    console.error('Exception creating ejercicio:', err)
    alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    return null
  }
}

export async function searchEjercicios(filters: { tipo?: string; num_jugadores?: string; material?: string }): Promise<EjercicioDB[]> {
  let query = supabase.from('ejercicios').select('*')

  if (filters.tipo) query = query.eq('tipo', filters.tipo)
  if (filters.num_jugadores) query = query.eq('num_jugadores', filters.num_jugadores)
  if (filters.material) query = query.ilike('material', `%${filters.material}%`)

  const { data, error } = await query.order('creado_en', { ascending: false })

  if (error) {
    console.error('Error searching ejercicios:', error)
    return []
  }
  return data || []
}

/* ─── Eventos Calendario ─── */

export async function fetchEventos() {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .select('*')
    .order('fecha', { ascending: true })
  if (error) { console.error('Error fetching eventos:', error); return [] }
  return data || []
}

export async function createEvento(ev: Omit<import('../types').Evento, 'id' | 'creado_en'>) {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .insert([{ ...ev, creado_en: new Date().toISOString() }])
    .select()
    .single()
  if (error) { console.error('Error creating evento:', error); return null }
  return data
}

export async function deleteEvento(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .delete()
    .eq('id', id)
    .select()
  if (error) { console.error('Error deleting evento:', error); return false }
  return (data?.length ?? 0) > 0
}

/* ─── Videos Sesiones ─── */

export async function fetchVideosSesiones() {
  const { data, error } = await supabase
    .from('videos_sesiones')
    .select('*')
    .order('fecha', { ascending: false })
  if (error) { console.error('Error fetching videos_sesiones:', error); return [] }
  return data || []
}

export async function createVideoSesion(video: Omit<import('../types').VideoSesion, 'id' | 'creado_en'>) {
  const { data, error } = await supabase
    .from('videos_sesiones')
    .insert([{ ...video, creado_en: new Date().toISOString() }])
    .select()
    .single()
  if (error) { console.error('Error creating video sesion:', error); return null }
  return data
}

export async function deleteVideoSesion(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('videos_sesiones')
    .delete()
    .eq('id', id)
    .select()
  if (error) { console.error('Error deleting video sesion:', error); return false }
  return (data?.length ?? 0) > 0
}

/* ─── Desarrollo Individual ─── */

import type { ObjetivoJugadora, HistorialAccion } from '../types'

function mapObjetivoRow(row: any): ObjetivoJugadora {
  return {
    id:           row.id,
    fichaId:      row.ficha_id    ?? undefined,
    playerName:   row.player_name,
    playerClub:   row.player_club  ?? '',
    playerPhoto:  row.player_photo ?? '',
    playerNumber: row.player_number ?? undefined,
    titulo:       row.titulo,
    descripcion:  row.descripcion  ?? '',
    fechaInicio:  row.fecha_inicio,
    estado:       row.estado,
    tipo:         row.tipo,
    accion:       row.accion,
    imagenUrl:    row.imagen_url   ?? '',
    pdfUrl:       row.pdf_url      ?? '',
    videoUrl:     row.video_url    ?? '',
    creadoEn:     row.creado_en,
    historial:    (row.historial_acciones ?? []).map(mapHistorialRow)
      .sort((a: HistorialAccion, b: HistorialAccion) => b.fecha.localeCompare(a.fecha)),
  }
}

function mapHistorialRow(r: any): HistorialAccion {
  return {
    id:          r.id,
    fecha:       r.fecha,
    tipo:        r.tipo,
    titulo:      r.titulo      ?? undefined,
    comentario:  r.comentario,
    imagenUrl:   r.imagen_url  ?? '',
    videoUrl:    r.video_url   ?? '',
    estadoBadge: r.estado_badge ?? undefined,
  }
}

export async function fetchObjetivos(): Promise<ObjetivoJugadora[]> {
  const { data, error } = await supabase
    .from('objetivos_individuales')
    .select('*, historial_acciones(*)')
    .order('creado_en', { ascending: false })
  if (error) { console.error('Error fetching objetivos:', error); return [] }
  return (data ?? []).map(mapObjetivoRow)
}

export async function createObjetivo(
  o: Omit<ObjetivoJugadora, 'id' | 'historial' | 'creadoEn'>
): Promise<ObjetivoJugadora | null> {
  const { data, error } = await supabase
    .from('objetivos_individuales')
    .insert([{
      ficha_id:      o.fichaId      || null,
      player_name:   o.playerName,
      player_club:   o.playerClub   || null,
      player_photo:  o.playerPhoto  || null,
      player_number: o.playerNumber ?? null,
      titulo:        o.titulo,
      descripcion:   o.descripcion  || null,
      fecha_inicio:  o.fechaInicio,
      estado:        o.estado,
      tipo:          o.tipo,
      accion:        o.accion,
      imagen_url:    o.imagenUrl    || null,
      pdf_url:       o.pdfUrl       || null,
      video_url:     o.videoUrl     || null,
    }])
    .select('*, historial_acciones(*)')
    .single()
  if (error) { console.error('Error creating objetivo:', error); return null }
  return mapObjetivoRow(data)
}

export async function updateObjetivo(
  id: string,
  o: Omit<ObjetivoJugadora, 'id' | 'historial' | 'creadoEn'>
): Promise<ObjetivoJugadora | null> {
  const { data, error } = await supabase
    .from('objetivos_individuales')
    .update({
      ficha_id:      o.fichaId      || null,
      player_name:   o.playerName,
      player_club:   o.playerClub   || null,
      player_photo:  o.playerPhoto  || null,
      player_number: o.playerNumber ?? null,
      titulo:        o.titulo,
      descripcion:   o.descripcion  || null,
      fecha_inicio:  o.fechaInicio,
      estado:        o.estado,
      tipo:          o.tipo,
      accion:        o.accion,
      imagen_url:    o.imagenUrl    || null,
      pdf_url:       o.pdfUrl       || null,
      video_url:     o.videoUrl     || null,
    })
    .eq('id', id)
    .select('*, historial_acciones(*)')
    .single()
  if (error) { console.error('Error updating objetivo:', error); return null }
  return mapObjetivoRow(data)
}

export async function deleteObjetivo(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('objetivos_individuales')
    .delete()
    .eq('id', id)
  if (error) { console.error('Error deleting objetivo:', error); return false }
  return true
}

export async function addHistorialAccion(
  objetivoId: string,
  a: Omit<HistorialAccion, 'id'>
): Promise<HistorialAccion | null> {
  const { data, error } = await supabase
    .from('historial_acciones')
    .insert([{
      objetivo_id:  objetivoId,
      fecha:        a.fecha,
      tipo:         a.tipo,
      titulo:       a.titulo       || null,
      comentario:   a.comentario,
      imagen_url:   a.imagenUrl    || null,
      video_url:    a.videoUrl     || null,
      estado_badge: a.estadoBadge  || null,
    }])
    .select()
    .single()
  if (error) { console.error('Error adding historial accion:', error); return null }
  return mapHistorialRow(data)
}

export async function deleteHistorialAccion(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('historial_acciones')
    .delete()
    .eq('id', id)
  if (error) { console.error('Error deleting historial accion:', error); return false }
  return true
}

/* ─── Análisis de Partidos ─── */

import type { AnalisisPartido } from '../types'

function analisisToRow(a: AnalisisPartido) {
  return {
    id:                    a.id,
    nombre:                a.nombre,
    rival:                 a.rival,
    fecha:                 a.fecha,
    categoria:             a.categoria ?? null,
    equipo_local:          a.equipoLocal,
    equipo_visitante:      a.equipoVisitante,
    analisis_ia:           a.analisisIA,
    caracteristicas_rival: a.caracteristicasRival,
    video_rival_url:       a.videoRivalUrl,
    presentacion_url:      a.presentacionUrl,
    bloque_ataque:         a.bloqueAtaque,
    bloque_defensa:        a.bloqueDefensa,
    bloque_transicion:     a.bloqueTransicion,
    video_partido_url:     a.videoPartidoUrl,
    tiempos:               a.tiempos,
    eventos_partido:       a.eventosPartido,
    creado_en:             a.creadoEn,
  }
}

function rowToAnalisis(row: any): AnalisisPartido {
  return {
    id:                    row.id,
    nombre:                row.nombre,
    rival:                 row.rival        ?? '',
    fecha:                 row.fecha        ?? '',
    categoria:             row.categoria    ?? undefined,
    equipoLocal:           row.equipo_local,
    equipoVisitante:       row.equipo_visitante,
    analisisIA:            row.analisis_ia  ?? '',
    caracteristicasRival:  row.caracteristicas_rival ?? { salidaBalon:[], presion:[], bloque:[], lineaDefensiva:[], transicionOfensiva:[], transicionDefensiva:[] },
    videoRivalUrl:         row.video_rival_url   ?? '',
    presentacionUrl:       row.presentacion_url  ?? '',
    bloqueAtaque:          row.bloque_ataque      ?? { notas:'', videoUrl:'', imagenUrl:'' },
    bloqueDefensa:         row.bloque_defensa     ?? { notas:'', videoUrl:'', imagenUrl:'' },
    bloqueTransicion:      row.bloque_transicion  ?? { notas:'', videoUrl:'', imagenUrl:'' },
    videoPartidoUrl:       row.video_partido_url  ?? '',
    tiempos:               row.tiempos            ?? { inicio1:'', fin1:'', inicio2:'', fin2:'' },
    eventosPartido:        row.eventos_partido     ?? [],
    creadoEn:              row.creado_en,
  }
}

export async function fetchAnalisis(): Promise<AnalisisPartido[]> {
  const { data, error } = await supabase
    .from('analisis_partidos')
    .select('*')
    .order('creado_en', { ascending: false })
  if (error) { console.error('Error fetching analisis:', error); return [] }
  return (data ?? []).map(rowToAnalisis)
}

export async function saveAnalisis(a: AnalisisPartido): Promise<boolean> {
  const { error } = await supabase
    .from('analisis_partidos')
    .upsert([analisisToRow(a)], { onConflict: 'id' })
  if (error) { console.error('Error saving analisis:', error); return false }
  return true
}

export async function deleteAnalisisFromDB(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('analisis_partidos')
    .delete()
    .eq('id', id)
  if (error) { console.error('Error deleting analisis:', error); return false }
  return true
}

// Upload a file (PDF, image, video) for an analysis
// Returns the public URL or null on error
export async function uploadAnalisisArchivo(
  file: File,
  analisisId: string
): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${analisisId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('analisis-archivos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) { console.error('Error uploading archivo:', error); return null }
  const { data } = supabase.storage.from('analisis-archivos').getPublicUrl(path)
  return data.publicUrl
}

/* ─── ABP (Acciones a Balón Parado) ─── */

import type { AccionBalonParado } from '../types'

function rowToAbp(row: any): AccionBalonParado {
  return {
    id:            row.id,
    analisisId:    row.analisis_id,
    tipo:          row.tipo,
    orden:         row.orden ?? 0,
    titulo:        row.titulo        ?? '',
    notas:         row.notas         ?? '',
    imagenUrl:     row.imagen_pizarra_url ?? '',
    videoUrl:      row.video_url     ?? '',
    notas2:        row.notas2        ?? '',
    imagen2Url:    row.imagen2_url   ?? '',
    video2Url:     row.video2_url    ?? '',
    creadoEn:      row.creado_en,
  }
}

export async function fetchAbpAcciones(analisisId: string): Promise<AccionBalonParado[]> {
  const { data, error } = await supabase
    .from('abp_acciones')
    .select('*')
    .eq('analisis_id', analisisId)
    .order('orden', { ascending: true })
  if (error) { console.error('Error fetching abp_acciones:', error); return [] }
  return (data ?? []).map(rowToAbp)
}

export async function createAbpAccion(
  a: Omit<AccionBalonParado, 'id' | 'creadoEn'>
): Promise<AccionBalonParado | null> {
  const { data, error } = await supabase
    .from('abp_acciones')
    .insert([{
      analisis_id:          a.analisisId,
      tipo:                 a.tipo,
      orden:                a.orden,
      titulo:                a.titulo,
      notas:                a.notas,
      imagen_pizarra_url:   a.imagenUrl || null,
      video_url:            a.videoUrl,
      notas2:               a.notas2,
      imagen2_url:          a.imagen2Url || null,
      video2_url:           a.video2Url,
    }])
    .select()
    .single()
  if (error) { console.error('Error creating abp_accion:', error); return null }
  return rowToAbp(data)
}

export async function updateAbpAccion(
  id: string,
  patch: Partial<Omit<AccionBalonParado, 'id' | 'analisisId' | 'creadoEn'>>
): Promise<boolean> {
  const row: Record<string, unknown> = {}
  if (patch.tipo !== undefined) row.tipo = patch.tipo
  if (patch.orden !== undefined) row.orden = patch.orden
  if (patch.titulo !== undefined) row.titulo = patch.titulo
  if (patch.notas !== undefined) row.notas = patch.notas
  if (patch.imagenUrl !== undefined) row.imagen_pizarra_url = patch.imagenUrl || null
  if (patch.videoUrl !== undefined) row.video_url = patch.videoUrl
  if (patch.notas2 !== undefined) row.notas2 = patch.notas2
  if (patch.imagen2Url !== undefined) row.imagen2_url = patch.imagen2Url || null
  if (patch.video2Url !== undefined) row.video2_url = patch.video2Url
  const { error } = await supabase.from('abp_acciones').update(row).eq('id', id)
  if (error) { console.error('Error updating abp_accion:', error); return false }
  return true
}

export async function deleteAbpAccion(id: string): Promise<boolean> {
  const { error } = await supabase.from('abp_acciones').delete().eq('id', id)
  if (error) { console.error('Error deleting abp_accion:', error); return false }
  return true
}

/* ─── Informes ─── */

import type { Informe, PartidoInforme, EvaluacionJugadora, PlanFase } from '../types'

const EMPTY_PLAN: PlanFase = { explicacion: '', imagenUrl: '', variante1Url: '', variante2Url: '' }

function rowToInforme(row: any): Informe {
  return {
    id:           row.id,
    titulo:       row.titulo       ?? '',
    autor:        row.autor        ?? '',
    fecha:        row.fecha        ?? '',
    conclusiones: row.conclusiones ?? '',
    creadoEn:     row.creado_en,
  }
}

export async function fetchInformes(): Promise<Informe[]> {
  const { data, error } = await supabase.from('informes').select('*').order('creado_en', { ascending: false })
  if (error) { console.error('Error fetching informes:', error); return [] }
  return (data ?? []).map(rowToInforme)
}

export async function createInforme(i: Omit<Informe, 'id' | 'creadoEn'>): Promise<Informe | null> {
  const { data, error } = await supabase
    .from('informes')
    .insert([{ titulo: i.titulo, autor: i.autor, fecha: i.fecha || null, conclusiones: i.conclusiones }])
    .select()
    .single()
  if (error) { console.error('Error creating informe:', error); return null }
  return rowToInforme(data)
}

export async function updateInforme(id: string, patch: Partial<Omit<Informe, 'id' | 'creadoEn'>>): Promise<boolean> {
  const row: Record<string, unknown> = {}
  if (patch.titulo !== undefined) row.titulo = patch.titulo
  if (patch.autor !== undefined) row.autor = patch.autor
  if (patch.fecha !== undefined) row.fecha = patch.fecha || null
  if (patch.conclusiones !== undefined) row.conclusiones = patch.conclusiones
  const { error } = await supabase.from('informes').update(row).eq('id', id)
  if (error) { console.error('Error updating informe:', error); return false }
  return true
}

export async function deleteInformeDB(id: string): Promise<boolean> {
  const { error } = await supabase.from('informes').delete().eq('id', id)
  if (error) { console.error('Error deleting informe:', error); return false }
  return true
}

function rowToPartidoInforme(row: any): PartidoInforme {
  return {
    id:                     row.id,
    informeId:              row.informe_id,
    jornada:                row.jornada ?? 1,
    rivalNombre:            row.rival_nombre ?? '',
    rivalEscudoUrl:         row.rival_escudo_url ?? '',
    resultadoLocal:         row.resultado_local ?? 0,
    resultadoVisitante:     row.resultado_visitante ?? 0,
    fechaPartido:           row.fecha_partido ?? '',
    horaPartido:            row.hora_partido ?? '',
    campoNombre:            row.campo_nombre ?? '',
    campoFotoUrl:           row.campo_foto_url ?? '',
    condiciones:            row.condiciones ?? 'soleado',
    equipacionLocalUrl:     row.equipacion_local_url ?? '',
    equipacionVisitanteUrl: row.equipacion_visitante_url ?? '',
    sistema:                row.sistema ?? '',
    sistemaRival:           row.sistema_rival ?? '',
    alineacionTitulares:    row.alineacion_titulares ?? [],
    alineacionSuplentes:    row.alineacion_suplentes ?? [],
    planOfensivo:           { ...EMPTY_PLAN, ...(row.plan_ofensivo ?? {}) },
    planDefensivo:          { ...EMPTY_PLAN, ...(row.plan_defensivo ?? {}) },
    creadoEn:               row.creado_en,
  }
}

export async function fetchPartidosInforme(informeId: string): Promise<PartidoInforme[]> {
  const { data, error } = await supabase
    .from('informe_partidos')
    .select('*')
    .eq('informe_id', informeId)
    .order('jornada', { ascending: true })
  if (error) { console.error('Error fetching informe_partidos:', error); return [] }
  return (data ?? []).map(rowToPartidoInforme)
}

export async function createPartidoInforme(p: Omit<PartidoInforme, 'id' | 'creadoEn'>): Promise<PartidoInforme | null> {
  const { data, error } = await supabase
    .from('informe_partidos')
    .insert([{
      informe_id:                p.informeId,
      jornada:                   p.jornada,
      rival_nombre:              p.rivalNombre,
      rival_escudo_url:          p.rivalEscudoUrl || null,
      resultado_local:           p.resultadoLocal,
      resultado_visitante:       p.resultadoVisitante,
      fecha_partido:             p.fechaPartido || null,
      hora_partido:              p.horaPartido,
      campo_nombre:              p.campoNombre,
      campo_foto_url:            p.campoFotoUrl || null,
      condiciones:               p.condiciones,
      equipacion_local_url:      p.equipacionLocalUrl || null,
      equipacion_visitante_url:  p.equipacionVisitanteUrl || null,
      sistema:                   p.sistema,
      sistema_rival:             p.sistemaRival,
      alineacion_titulares:      p.alineacionTitulares,
      alineacion_suplentes:      p.alineacionSuplentes,
      plan_ofensivo:             p.planOfensivo,
      plan_defensivo:            p.planDefensivo,
    }])
    .select()
    .single()
  if (error) { console.error('Error creating informe_partido:', error); return null }
  return rowToPartidoInforme(data)
}

export async function updatePartidoInforme(id: string, patch: Partial<Omit<PartidoInforme, 'id' | 'informeId' | 'creadoEn'>>): Promise<boolean> {
  const row: Record<string, unknown> = {}
  if (patch.jornada !== undefined) row.jornada = patch.jornada
  if (patch.rivalNombre !== undefined) row.rival_nombre = patch.rivalNombre
  if (patch.rivalEscudoUrl !== undefined) row.rival_escudo_url = patch.rivalEscudoUrl || null
  if (patch.resultadoLocal !== undefined) row.resultado_local = patch.resultadoLocal
  if (patch.resultadoVisitante !== undefined) row.resultado_visitante = patch.resultadoVisitante
  if (patch.fechaPartido !== undefined) row.fecha_partido = patch.fechaPartido || null
  if (patch.horaPartido !== undefined) row.hora_partido = patch.horaPartido
  if (patch.campoNombre !== undefined) row.campo_nombre = patch.campoNombre
  if (patch.campoFotoUrl !== undefined) row.campo_foto_url = patch.campoFotoUrl || null
  if (patch.condiciones !== undefined) row.condiciones = patch.condiciones
  if (patch.equipacionLocalUrl !== undefined) row.equipacion_local_url = patch.equipacionLocalUrl || null
  if (patch.equipacionVisitanteUrl !== undefined) row.equipacion_visitante_url = patch.equipacionVisitanteUrl || null
  if (patch.sistema !== undefined) row.sistema = patch.sistema
  if (patch.sistemaRival !== undefined) row.sistema_rival = patch.sistemaRival
  if (patch.alineacionTitulares !== undefined) row.alineacion_titulares = patch.alineacionTitulares
  if (patch.alineacionSuplentes !== undefined) row.alineacion_suplentes = patch.alineacionSuplentes
  if (patch.planOfensivo !== undefined) row.plan_ofensivo = patch.planOfensivo
  if (patch.planDefensivo !== undefined) row.plan_defensivo = patch.planDefensivo
  const { error } = await supabase.from('informe_partidos').update(row).eq('id', id)
  if (error) { console.error('Error updating informe_partido:', error); return false }
  return true
}

export async function deletePartidoInforme(id: string): Promise<boolean> {
  const { error } = await supabase.from('informe_partidos').delete().eq('id', id)
  if (error) { console.error('Error deleting informe_partido:', error); return false }
  return true
}

function rowToEvaluacion(row: any): EvaluacionJugadora {
  return {
    id:                row.id,
    partidoInformeId:  row.partido_informe_id,
    orden:             row.orden ?? 0,
    fichaId:           row.ficha_id ?? undefined,
    nombre:            row.nombre ?? '',
    apellidos:         row.apellidos ?? '',
    fotoUrl:           row.foto_url ?? '',
    dorsal:            row.dorsal ?? null,
    lateralidad:       row.lateralidad ?? '',
    fechaNacimiento:   row.fecha_nacimiento ?? '',
    clubNombre:        row.club_nombre ?? '',
    clubEscudoUrl:     row.club_escudo_url ?? '',
    posicionX:         row.posicion_x ?? null,
    posicionY:         row.posicion_y ?? null,
    minutos:           row.minutos ?? 0,
    goles:             row.goles ?? 0,
    asistencias:       row.asistencias ?? 0,
    tarjetasAmarillas: row.tarjetas_amarillas ?? 0,
    tarjetasRojas:     row.tarjetas_rojas ?? 0,
    valoracion:        row.valoracion ?? null,
    comentario:        row.comentario ?? '',
    creadoEn:          row.creado_en,
  }
}

export async function fetchEvaluaciones(partidoInformeId: string): Promise<EvaluacionJugadora[]> {
  const { data, error } = await supabase
    .from('informe_evaluaciones')
    .select('*')
    .eq('partido_informe_id', partidoInformeId)
    .order('orden', { ascending: true })
  if (error) { console.error('Error fetching informe_evaluaciones:', error); return [] }
  return (data ?? []).map(rowToEvaluacion)
}

export async function createEvaluacion(e: Omit<EvaluacionJugadora, 'id' | 'creadoEn'>): Promise<EvaluacionJugadora | null> {
  const { data, error } = await supabase
    .from('informe_evaluaciones')
    .insert([{
      partido_informe_id: e.partidoInformeId,
      orden:               e.orden,
      ficha_id:            e.fichaId || null,
      nombre:              e.nombre,
      apellidos:           e.apellidos,
      foto_url:            e.fotoUrl || null,
      dorsal:              e.dorsal,
      lateralidad:         e.lateralidad,
      fecha_nacimiento:    e.fechaNacimiento || null,
      club_nombre:         e.clubNombre,
      club_escudo_url:     e.clubEscudoUrl || null,
      posicion_x:          e.posicionX,
      posicion_y:          e.posicionY,
      minutos:             e.minutos,
      goles:               e.goles,
      asistencias:         e.asistencias,
      tarjetas_amarillas:  e.tarjetasAmarillas,
      tarjetas_rojas:      e.tarjetasRojas,
      valoracion:          e.valoracion,
      comentario:          e.comentario,
    }])
    .select()
    .single()
  if (error) { console.error('Error creating informe_evaluacion:', error); return null }
  return rowToEvaluacion(data)
}

export async function updateEvaluacion(id: string, patch: Partial<Omit<EvaluacionJugadora, 'id' | 'partidoInformeId' | 'creadoEn'>>): Promise<boolean> {
  const row: Record<string, unknown> = {}
  if (patch.orden !== undefined) row.orden = patch.orden
  if (patch.fichaId !== undefined) row.ficha_id = patch.fichaId || null
  if (patch.nombre !== undefined) row.nombre = patch.nombre
  if (patch.apellidos !== undefined) row.apellidos = patch.apellidos
  if (patch.fotoUrl !== undefined) row.foto_url = patch.fotoUrl || null
  if (patch.dorsal !== undefined) row.dorsal = patch.dorsal
  if (patch.lateralidad !== undefined) row.lateralidad = patch.lateralidad
  if (patch.fechaNacimiento !== undefined) row.fecha_nacimiento = patch.fechaNacimiento || null
  if (patch.clubNombre !== undefined) row.club_nombre = patch.clubNombre
  if (patch.clubEscudoUrl !== undefined) row.club_escudo_url = patch.clubEscudoUrl || null
  if (patch.posicionX !== undefined) row.posicion_x = patch.posicionX
  if (patch.posicionY !== undefined) row.posicion_y = patch.posicionY
  if (patch.minutos !== undefined) row.minutos = patch.minutos
  if (patch.goles !== undefined) row.goles = patch.goles
  if (patch.asistencias !== undefined) row.asistencias = patch.asistencias
  if (patch.tarjetasAmarillas !== undefined) row.tarjetas_amarillas = patch.tarjetasAmarillas
  if (patch.tarjetasRojas !== undefined) row.tarjetas_rojas = patch.tarjetasRojas
  if (patch.valoracion !== undefined) row.valoracion = patch.valoracion
  if (patch.comentario !== undefined) row.comentario = patch.comentario
  const { error } = await supabase.from('informe_evaluaciones').update(row).eq('id', id)
  if (error) { console.error('Error updating informe_evaluacion:', error); return false }
  return true
}

export async function deleteEvaluacion(id: string): Promise<boolean> {
  const { error } = await supabase.from('informe_evaluaciones').delete().eq('id', id)
  if (error) { console.error('Error deleting informe_evaluacion:', error); return false }
  return true
}

// Upload a file (photo, kit image, field photo, tactical diagram) for an informe
export async function uploadInformeArchivo(file: File, informeId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${informeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('informes-archivos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) { console.error('Error uploading informe archivo:', error); return null }
  const { data } = supabase.storage.from('informes-archivos').getPublicUrl(path)
  return data.publicUrl
}

/* ─── Ejercicios ─── */

export async function deleteEjercicio(id: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ejercicios')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ Error deleting ejercicio:', error.message, error)
      return false
    }

    if (!data || data.length === 0) {
      console.error('❌ Ejercicio no eliminado en Supabase — posible política RLS sin permiso DELETE. Verifica en Supabase > Authentication > Policies > tabla ejercicios que exista una política DELETE.')
      return false
    }

    console.log('✅ Ejercicio eliminado en Supabase:', id)
    return true
  } catch (err) {
    console.error('❌ Exception deleting ejercicio:', err)
    return false
  }
}

/* ─── Sincronización automática de actas (asturfutbol.es) ─── */
import type { CompeticionMapeo, SyncRun } from '../types'

function rowToCompeticionMapeo(row: any): CompeticionMapeo {
  return {
    id: row.id,
    temporadaValor: row.temporada_valor,
    temporadaLabel: row.temporada_label ?? '',
    tipoJuego: row.tipo_juego,
    competicionId: row.competicion_id,
    competicionLabel: row.competicion_label ?? '',
    grupoId: row.grupo_id,
    grupoLabel: row.grupo_label ?? '',
    categoria: row.categoria,
    activo: row.activo,
    ultimaJornadaProcesada: row.ultima_jornada_procesada ?? 0,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  }
}

export async function fetchCompeticionMapeos(): Promise<CompeticionMapeo[]> {
  const { data, error } = await supabase.from('competicion_mapeos').select('*').order('categoria')
  if (error) { console.error('Error fetching competicion_mapeos:', error); return [] }
  return (data ?? []).map(rowToCompeticionMapeo)
}

export async function createCompeticionMapeo(
  m: Omit<CompeticionMapeo, 'id' | 'creadoEn' | 'actualizadoEn' | 'ultimaJornadaProcesada'>
): Promise<CompeticionMapeo | null> {
  const { data, error } = await supabase
    .from('competicion_mapeos')
    .insert([{
      temporada_valor: m.temporadaValor,
      temporada_label: m.temporadaLabel,
      tipo_juego: m.tipoJuego,
      competicion_id: m.competicionId,
      competicion_label: m.competicionLabel,
      grupo_id: m.grupoId,
      grupo_label: m.grupoLabel,
      categoria: m.categoria,
      activo: m.activo,
    }])
    .select()
    .single()
  if (error) { console.error('Error creating competicion_mapeo:', error); return null }
  return rowToCompeticionMapeo(data)
}

export async function updateCompeticionMapeo(id: string, patch: Partial<CompeticionMapeo>): Promise<boolean> {
  const row: Record<string, unknown> = { actualizado_en: new Date().toISOString() }
  if (patch.temporadaValor !== undefined) row.temporada_valor = patch.temporadaValor
  if (patch.temporadaLabel !== undefined) row.temporada_label = patch.temporadaLabel
  if (patch.tipoJuego !== undefined) row.tipo_juego = patch.tipoJuego
  if (patch.competicionId !== undefined) row.competicion_id = patch.competicionId
  if (patch.competicionLabel !== undefined) row.competicion_label = patch.competicionLabel
  if (patch.grupoId !== undefined) row.grupo_id = patch.grupoId
  if (patch.grupoLabel !== undefined) row.grupo_label = patch.grupoLabel
  if (patch.categoria !== undefined) row.categoria = patch.categoria
  if (patch.activo !== undefined) row.activo = patch.activo
  if (patch.ultimaJornadaProcesada !== undefined) row.ultima_jornada_procesada = patch.ultimaJornadaProcesada
  const { error } = await supabase.from('competicion_mapeos').update(row).eq('id', id)
  if (error) { console.error('Error updating competicion_mapeo:', error); return false }
  return true
}

export async function deleteCompeticionMapeo(id: string): Promise<boolean> {
  const { error } = await supabase.from('competicion_mapeos').delete().eq('id', id)
  if (error) { console.error('Error deleting competicion_mapeo:', error); return false }
  return true
}

function rowToSyncRun(row: any): SyncRun {
  return {
    id: row.id,
    iniciadoEn: row.iniciado_en,
    finalizadoEn: row.finalizado_en,
    estado: row.estado,
    disparadoPor: row.disparado_por,
    competicionesProcesadas: row.competiciones_procesadas ?? 0,
    actasNuevas: row.actas_nuevas ?? 0,
    fichasActualizadas: row.fichas_actualizadas ?? 0,
    jugadorasSinMatch: row.jugadoras_sin_match ?? 0,
    errores: row.errores ?? [],
    resumen: row.resumen ?? '',
  }
}

export async function fetchSyncRuns(limit = 20): Promise<SyncRun[]> {
  const { data, error } = await supabase
    .from('sync_runs')
    .select('*')
    .order('iniciado_en', { ascending: false })
    .limit(limit)
  if (error) { console.error('Error fetching sync_runs:', error); return [] }
  return (data ?? []).map(rowToSyncRun)
}
