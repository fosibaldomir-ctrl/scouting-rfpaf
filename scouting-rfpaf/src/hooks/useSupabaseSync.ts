import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { OBSERVADORES, CATEGORIAS, CLUBES } from '../data/masterData'
import { supabaseService } from '../services/supabaseService'
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
    /* Cada apartado se carga por su cuenta. Antes iban todos seguidos en un
     * mismo bloque, así que un tropiezo en el primero —bastaba con que el
     * navegador se quedara sin sitio al guardar— dejaba la aplicación entera
     * en blanco aunque los datos estuvieran en el servidor. */
    async function paso<T>(nombre: string, cargar: () => Promise<T>, aplicar: (dato: T) => void) {
      try {
        aplicar(await cargar())
      } catch (err) {
        console.error(`No se ha podido cargar «${nombre}»:`, err)
      }
    }

    async function init() {
      await paso('datos maestros', seedIfEmpty, () => {})

      // Las fichas no se guardan en el navegador (llevan fotos y no caben), así
      // que se piden en cada arranque. Un fallo puntual dejaría la pantalla
      // vacía, de modo que se reintenta antes de darse por vencido.
      await paso('jugadoras', async () => {
        let fichas = await supabaseService.getFichas()
        for (let intento = 1; fichas === null && intento <= 3; intento++) {
          await new Promise((r) => setTimeout(r, intento * 1000))
          fichas = await supabaseService.getFichas()
        }
        return fichas
      }, (fichas) => {
        if (fichas) {
          setFichasMain(fichas)
          setErrorCarga(null)
          console.log(`✅ Jugadoras cargadas: ${fichas.length}`)
        } else {
          setErrorCarga('No se han podido cargar las jugadoras desde el servidor. Tus datos siguen guardados: comprueba la conexión y vuelve a cargar la página.')
        }
      })

      await paso('partidos', () => supabaseService.getPartidos(), setPartidos)
      await paso('convocatorias', () => supabaseService.getConvocatorias(), setConvocatorias)
      await paso('clubes', () => supabaseService.getClubes(), (c) => { if (c.length > 0) setClubes(c) })
      await paso('observadores', () => supabaseService.getObservadores(), (o) => { if (o.length > 0) setObservadores(o) })
      await paso('vídeos de sesiones', async () => (await import('../lib/supabase')).fetchVideosSesiones(), setVideosSesiones)
      await paso('eventos', async () => (await import('../lib/supabase')).fetchEventos(), setEventos)
      await paso('análisis', loadAnalisisFromDB, () => {})
    }

    init().catch((err) => {
      console.error('❌ Error en sincronización:', err)
    })
  }, [setFichasMain, setPartidos, setConvocatorias, setClubes, setObservadores, setVideosSesiones, setEventos, loadAnalisisFromDB])
}
