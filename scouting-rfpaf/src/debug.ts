import { supabase } from './lib/supabase'
import { supabaseService } from './services/supabaseService'

export async function testSupabaseConnection() {
  try {
    console.log('🔍 Probando conexión con Supabase...')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth status:', { user, error: authError })

    const { data: clubes, error: clubesError } = await supabase
      .from('clubes')
      .select('*')
      .limit(1)

    console.log('✅ Conexión exitosa')
    console.log('Clubes encontrados:', clubes)
    console.log('Error:', clubesError)

    if (clubesError) {
      console.error('❌ Error:', clubesError.message)
    }

    return { success: !clubesError, error: clubesError }
  } catch (error) {
    console.error('❌ Error de conexión:', error)
    return { success: false, error }
  }
}

// Exportar para usar en consola del navegador
;(window as any).testSupabase = testSupabaseConnection
;(window as any).supabaseService = supabaseService
