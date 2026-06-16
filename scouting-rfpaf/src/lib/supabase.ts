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
