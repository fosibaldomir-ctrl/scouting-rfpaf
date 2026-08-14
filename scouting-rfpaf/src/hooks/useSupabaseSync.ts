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
  const setObservadores = useStore((s) => s.setObservadores)
  const setVideosSesiones = useStore((s) => s.setVideosSesiones)
  const setEventos = useStore((s) => s.setEventos)
  const loadAnalisisFromDB = useStore((s) => s.loadAnalisisFromDB)
  const setErrorCarga = useStore((s) => s.setErrorCarga)

  useEffect(() => {
    async function init() {
      await seedIfEmpty()

      // Las fichas no se guardan en el navegador (llevan fotos y no caben), así
      // que se piden en cada arranque. Un fallo puntual dejaría la pantalla
      // vacía, de modo que se reintenta antes de darse por vencido.
      let fichas = await supabaseService.getFichas()
      for (let intento = 1; fichas === null && intento <= 3; intento++) {
        await new Promise((r) => setTimeout(r, intento * 1000))
        fichas = await supabaseService.getFichas()
      }
      if (fichas) {
        setFichasWithSync(fichas)
        setFichasMain(fichas)
        setErrorCarga(null)
      } else {
        setErrorCarga('No se han podido cargar las jugadoras desde el servidor. Tus datos siguen guardados: comprueba la conexión y vuelve a cargar la página.')
      }

      const partidos = await supabaseService.getPartidos()
      setPartidos(partidos)

      const convocatorias = await supabaseService.getConvocatorias()
      setConvocatorias(convocatorias)

      const clubes = await supabaseService.getClubes()
      if (clubes.length > 0) setClubes(clubes)

      const observadores = await supabaseService.getObservadores()
      if (observadores.length > 0) setObservadores(observadores)

      const { fetchVideosSesiones, fetchEventos } = await import('../lib/supabase')
      const videos = await fetchVideosSesiones()
      setVideosSesiones(videos)

      const eventos = await fetchEventos()
      setEventos(eventos)

      await loadAnalisisFromDB()

      console.log(`✅ Supabase sync lista. Fichas: ${fichas?.length ?? 'no cargadas'}, Partidos: ${partidos.length}, Convocatorias: ${convocatorias.length}, Clubes: ${clubes.length}, Observadores: ${observadores.length}, Videos: ${videos.length}, Eventos: ${eventos.length}`)
    }

    init().catch((err) => {
      console.error('❌ Error en sincronización:', err)
    })
  }, [setFichasWithSync, setFichasMain, setPartidos, setConvocatorias, setClubes, setObservadores, setVideosSesiones, setEventos, loadAnalisisFromDB])
}
