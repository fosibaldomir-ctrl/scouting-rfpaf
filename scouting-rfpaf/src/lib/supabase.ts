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
    abp_ofensivo:          a.abpOfensivo,
    abp_defensivo:         a.abpDefensivo,
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
    abpOfensivo:           row.abp_ofensivo       ?? [],
    abpDefensivo:          row.abp_defensivo      ?? [],
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
