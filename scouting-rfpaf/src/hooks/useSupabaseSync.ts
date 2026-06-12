import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { OBSERVADORES, CATEGORIAS, CLUBES } from '../data/masterData'
import { supabaseService } from '../services/supabaseService'
import { useStoreWithSync } from '../store/useStoreWithSync'
import { useStore } from '../store/useStore'

async function seedIfEmpty() {
  const { count: obsCount } = await supabase
    .from('observadores')
    .select('*', { count: 'exact', head: true })

  if (obsCount === 0) {
    await supabase.from('observadores').insert(
      OBSERVADORES.map((o) => ({ id: o.id, nombre: o.nombre }))
    )
  }

  const { count: catCount } = await supabase
    .from('categorias')
    .select('*', { count: 'exact', head: true })

  if (catCount === 0) {
    await supabase.from('categorias').insert(
      CATEGORIAS.map((c) => ({ id: c.id, nombre: c.nombre }))
    )
  }

  const { count: clubCount } = await supabase
    .from('clubes')
    .select('*', { count: 'exact', head: true })

  if (clubCount === 0) {
    await supabase.from('clubes').insert(
      CLUBES.map((c) => ({ id: c.id, nombre: c.nombre }))
    )
  }
}

export function useSupabaseSync() {
  const setFichas = useStoreWithSync((s) => s.setFichas)
  const setPartidos = useStore((s) => s.setPartidos)

  useEffect(() => {
    async function init() {
      await seedIfEmpty()

      const fichas = await supabaseService.getFichas()
      if (fichas.length > 0) {
        setFichas(fichas)
      }

      const partidos = await supabaseService.getPartidos()
      if (partidos.length > 0) {
        setPartidos(partidos)
      }

      console.log('✅ Supabase sincronización lista')
    }

    init().catch((err) => {
      console.error('Error en sincronización:', err)
    })
  }, [])
}
