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
