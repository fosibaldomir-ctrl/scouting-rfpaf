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
  const setFichasWithSync = useStoreWithSync((s) => s.setFichas)
  const setFichasMain = useStore((s) => s.setFichas)
  const setPartidos = useStore((s) => s.setPartidos)
  const setConvocatorias = useStore((s) => s.setConvocatorias)
  const setClubes = useStore((s) => s.setClubes)
  const setVideosSesiones = useStore((s) => s.setVideosSesiones)
  const setEventos = useStore((s) => s.setEventos)
  const loadAnalisisFromDB = useStore((s) => s.loadAnalisisFromDB)

  useEffect(() => {
    async function init() {
      await seedIfEmpty()

      const fichas = await supabaseService.getFichas()
      setFichasWithSync(fichas)
      setFichasMain(fichas)

      const partidos = await supabaseService.getPartidos()
      setPartidos(partidos)

      const convocatorias = await supabaseService.getConvocatorias()
      setConvocatorias(convocatorias)

      const clubes = await supabaseService.getClubes()
      if (clubes.length > 0) setClubes(clubes)

      const { fetchVideosSesiones, fetchEventos } = await import('../lib/supabase')
      const videos = await fetchVideosSesiones()
      setVideosSesiones(videos)

      const eventos = await fetchEventos()
      setEventos(eventos)

      await loadAnalisisFromDB()

      console.log(`✅ Supabase sync lista. Fichas: ${fichas.length}, Partidos: ${partidos.length}, Convocatorias: ${convocatorias.length}, Clubes: ${clubes.length}, Videos: ${videos.length}, Eventos: ${eventos.length}`)
    }

    init().catch((err) => {
      console.error('❌ Error en sincronización:', err)
    })
  }, [setFichasWithSync, setFichasMain, setPartidos, setConvocatorias, setClubes, setVideosSesiones, setEventos, loadAnalisisFromDB])
}
