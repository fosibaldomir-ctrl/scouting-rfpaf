import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FichaJugadora, Valoracion, Observador, Club, CategoriaItem, PartidoCalendario, Convocatoria, JugadoraConvocada, Sesion, VideoSesion, Evento, AnalisisPartido, RegistroRPE, RegistroLesion, AccionBalonParado, Informe, PartidoInforme, EvaluacionJugadora, CompeticionMapeo, SyncRun } from '../types'
import type { EjercicioDB } from '../lib/supabase'
import { OBSERVADORES, CATEGORIAS, CLUBES } from '../data/masterData'
import { supabaseService } from '../services/supabaseService'
import { defaultFichaFields } from '../utils/fichaDefaults'
import { pickSnapshot } from '../utils/valoracionSync'
import {
  fetchAnalisis, saveAnalisis, deleteAnalisisFromDB,
  fetchAbpAcciones, createAbpAccion,
  updateAbpAccion as updateAbpAccionDB, deleteAbpAccion as deleteAbpAccionDB,
  fetchInformes, createInforme, updateInforme as updateInformeDB, deleteInformeDB,
  fetchPartidosInforme, createPartidoInforme, updatePartidoInforme as updatePartidoInformeDB, deletePartidoInforme as deletePartidoInformeDB,
  fetchEvaluaciones, createEvaluacion, updateEvaluacion as updateEvaluacionDB, deleteEvaluacion as deleteEvaluacionDB,
  fetchCompeticionMapeos, createCompeticionMapeo, updateCompeticionMapeo as updateCompeticionMapeoDB, deleteCompeticionMapeo as deleteCompeticionMapeoDB,
  fetchSyncRuns,
} from '../lib/supabase'
import { SESION_EMPTY } from '../lib/entrenamientoConstants'
import { buildTeamJugadoras } from '../utils/tactics'

const PIZARRA_LIBRE_ID = '__pizarra_libre__'

const DEFAULT_PIZARRA_LIBRE: AnalisisPartido = {
  id: PIZARRA_LIBRE_ID,
  nombre: 'Pizarra Libre',
  rival: '',
  fecha: '',
  equipoLocal: {
    nombre: 'Equipo Local',
    formacion: '4-3-3',
    color: '#1a3a6b',
    jugadoras: buildTeamJugadoras('4-3-3', 'local'),
  },
  equipoVisitante: {
    nombre: 'Rival',
    formacion: '4-4-2',
    color: '#c0392b',
    jugadoras: buildTeamJugadoras('4-4-2', 'visit'),
  },
  analisisIA: '',
  caracteristicasRival: { salidaBalon: [], presion: [], bloque: [], lineaDefensiva: [], transicionOfensiva: [], transicionDefensiva: [] },
  videoRivalUrl: '',
  presentacionUrl: '',
  bloqueAtaque: { notas: '', videoUrl: '', imagenUrl: '' },
  bloqueDefensa: { notas: '', videoUrl: '', imagenUrl: '' },
  bloqueTransicion: { notas: '', videoUrl: '', imagenUrl: '' },
  videoPartidoUrl: '',
  tiempos: { inicio1: '', fin1: '', inicio2: '', fin2: '' },
  eventosPartido: [],
  creadoEn: '',
}

interface AppState {
  fichas: FichaJugadora[]
  observadores: Observador[]
  categorias: CategoriaItem[]
  clubes: Club[]
  partidos: PartidoCalendario[]
  convocatorias: Convocatoria[]
  currentObservador: string | null
  borrador: Partial<FichaJugadora> | null
  sesion: Sesion
  ejercicios: EjercicioDB[]
  videosSesiones: VideoSesion[]
  eventos: Evento[]

  login: (observadorId: string) => void
  logout: () => void
  setFichas: (fichas: FichaJugadora[]) => void
  setClubes: (clubes: Club[]) => void
  setObservadores: (observadores: Observador[]) => void
  setPartidos: (partidos: PartidoCalendario[]) => void
  setSesion: (sesion: Sesion | ((s: Sesion) => Sesion)) => void
  setEjercicios: (ejercicios: EjercicioDB[]) => void
  setVideosSesiones: (videos: VideoSesion[]) => void
  addVideoSesion: (video: VideoSesion) => void
  deleteVideoSesion: (id: string) => void
  setEventos: (eventos: Evento[]) => void
  addEvento: (evento: Evento) => void
  deleteEvento: (id: string) => void
  registrosRPE: RegistroRPE[]
  lesiones: RegistroLesion[]
  addRegistroRPE: (r: RegistroRPE) => void
  deleteRegistroRPE: (id: string) => void
  addLesion: (l: RegistroLesion) => void
  updateLesion: (id: string, patch: Partial<RegistroLesion>) => void
  deleteLesion: (id: string) => void
  analisis: AnalisisPartido[]
  activeAnalisisId: string | null
  pizarraLibre: AnalisisPartido
  addAnalisis: (a: AnalisisPartido) => void
  updateAnalisis: (id: string, data: Partial<AnalisisPartido>) => void
  deleteAnalisis: (id: string) => void
  setActiveAnalisisId: (id: string | null) => void
  loadAnalisisFromDB: () => Promise<void>
  abpAcciones: AccionBalonParado[]
  loadAbpAcciones: (analisisId: string) => Promise<void>
  addAbpAccion: (a: Omit<AccionBalonParado, 'id' | 'creadoEn'>) => Promise<void>
  updateAbpAccion: (id: string, patch: Partial<AccionBalonParado>) => Promise<void>
  deleteAbpAccion: (id: string) => Promise<void>
  informes: Informe[]
  loadInformes: () => Promise<void>
  addInforme: (i: Omit<Informe, 'id' | 'creadoEn'>) => Promise<Informe | null>
  updateInformeAction: (id: string, patch: Partial<Informe>) => Promise<void>
  deleteInformeAction: (id: string) => Promise<void>
  partidosInforme: PartidoInforme[]
  loadPartidosInforme: (informeId: string) => Promise<void>
  addPartidoInforme: (p: Omit<PartidoInforme, 'id' | 'creadoEn'>) => Promise<PartidoInforme | null>
  updatePartidoInformeAction: (id: string, patch: Partial<PartidoInforme>) => Promise<void>
  deletePartidoInformeAction: (id: string) => Promise<void>
  evaluaciones: EvaluacionJugadora[]
  loadEvaluaciones: (partidoInformeId: string) => Promise<void>
  addEvaluacion: (e: Omit<EvaluacionJugadora, 'id' | 'creadoEn'>) => Promise<void>
  updateEvaluacionAction: (id: string, patch: Partial<EvaluacionJugadora>) => Promise<void>
  deleteEvaluacionAction: (id: string) => Promise<void>
  addPartido: (p: PartidoCalendario) => Promise<void>
  deletePartido: (id: string) => Promise<void>
  addFicha: (ficha: FichaJugadora) => Promise<void>
  updateFicha: (id: string, ficha: Partial<FichaJugadora>) => Promise<void>
  deleteFicha: (id: string) => Promise<void>
  getFicha: (id: string) => FichaJugadora | undefined
  addValoracion: (fichaId: string, valoracion: Valoracion) => Promise<void>
  updateValoracion: (fichaId: string, valoracionId: string, patch: Partial<Valoracion>) => Promise<void>
  deleteValoracion: (fichaId: string, valoracionId: string) => Promise<void>
  saveBorrador: (data: Partial<FichaJugadora>) => void
  clearBorrador: () => void
  addObservador: (obs: Observador) => Promise<void>
  updateObservador: (id: string, obs: Partial<Observador>) => Promise<void>
  deleteObservador: (id: string) => Promise<void>
  addClub: (club: Club) => Promise<void>
  updateClub: (id: string, club: Partial<Club>) => Promise<void>
  deleteClub: (id: string) => Promise<void>
  addCategoria: (cat: CategoriaItem) => Promise<void>
  deleteCategoria: (id: string) => Promise<void>
  setConvocatorias: (convocatorias: Convocatoria[]) => void
  addConvocatoria: (c: Convocatoria) => Promise<void>
  updateConvocatoria: (id: string, data: Partial<Convocatoria>) => Promise<void>
  deleteConvocatoria: (id: string) => Promise<void>
  addJugadoraToConvocatoria: (convocatoriaId: string, jugadora: JugadoraConvocada) => Promise<void>
  removeJugadoraFromConvocatoria: (convocatoriaId: string, fichaId: string) => Promise<void>
  competicionMapeos: CompeticionMapeo[]
  loadCompeticionMapeos: () => Promise<void>
  addCompeticionMapeo: (m: Omit<CompeticionMapeo, 'id' | 'creadoEn' | 'actualizadoEn' | 'ultimaJornadaProcesada'>) => Promise<CompeticionMapeo | null>
  updateCompeticionMapeoAction: (id: string, patch: Partial<CompeticionMapeo>) => Promise<void>
  deleteCompeticionMapeoAction: (id: string) => Promise<void>
  syncRuns: SyncRun[]
  loadSyncRuns: () => Promise<void>
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      fichas: [],
      observadores: OBSERVADORES,
      categorias: CATEGORIAS,
      clubes: CLUBES,
      partidos: [],
      convocatorias: [],
      currentObservador: null,
      borrador: null,
      sesion: SESION_EMPTY,
      ejercicios: [],
      videosSesiones: [],
      eventos: [],
      registrosRPE: [],
      lesiones: [],
      analisis: [],
      activeAnalisisId: null,
      pizarraLibre: DEFAULT_PIZARRA_LIBRE,

      login: (observadorId) => set({ currentObservador: observadorId }),
      logout: () => set({ currentObservador: null }),

      setFichas: (fichas) => set({ fichas }),
      setClubes: (clubes) => set({ clubes }),
      setObservadores: (observadores) => set({ observadores }),
      setPartidos: (partidos) => set({ partidos }),
      setSesion: (sesion) => {
        if (typeof sesion === 'function') {
          set((state) => ({ sesion: sesion(state.sesion) }))
        } else {
          set({ sesion })
        }
      },
      setEjercicios: (ejercicios) => set({ ejercicios }),
      setVideosSesiones: (videosSesiones) => set({ videosSesiones }),
      addVideoSesion: (video) => set((s) => ({ videosSesiones: [video, ...s.videosSesiones] })),
      deleteVideoSesion: (id) => set((s) => ({ videosSesiones: s.videosSesiones.filter((v) => v.id !== id) })),
      setEventos: (eventos) => set({ eventos }),
      addEvento: (evento) => set((s) => ({ eventos: [...s.eventos, evento] })),
      deleteEvento: (id) => set((s) => ({ eventos: s.eventos.filter((e) => e.id !== id) })),
      addRegistroRPE: (r) => set((s) => ({ registrosRPE: [r, ...s.registrosRPE] })),
      deleteRegistroRPE: (id) => set((s) => ({ registrosRPE: s.registrosRPE.filter((r) => r.id !== id) })),
      addLesion: (l) => set((s) => ({ lesiones: [l, ...s.lesiones] })),
      updateLesion: (id, patch) => set((s) => ({ lesiones: s.lesiones.map((l) => l.id === id ? { ...l, ...patch } : l) })),
      deleteLesion: (id) => set((s) => ({ lesiones: s.lesiones.filter((l) => l.id !== id) })),
      addAnalisis: (a) => {
        set((s) => ({ analisis: [a, ...s.analisis] }))
        saveAnalisis(a).catch(console.error)
      },
      updateAnalisis: (id, data) => {
        if (id === PIZARRA_LIBRE_ID) {
          set((s) => ({ pizarraLibre: { ...s.pizarraLibre, ...data } }))
        } else {
          set((s) => {
            const updated = s.analisis.map((a) => a.id === id ? { ...a, ...data } : a)
            const updatedItem = updated.find((a) => a.id === id)
            if (updatedItem) saveAnalisis(updatedItem).catch(console.error)
            return { analisis: updated }
          })
        }
      },
      deleteAnalisis: (id) => {
        set((s) => ({ analisis: s.analisis.filter((a) => a.id !== id), activeAnalisisId: s.activeAnalisisId === id ? null : s.activeAnalisisId }))
        deleteAnalisisFromDB(id).catch(console.error)
      },
      setActiveAnalisisId: (id) => set({ activeAnalisisId: id }),
      loadAnalisisFromDB: async () => {
        const data = await fetchAnalisis()
        if (data.length > 0) set({ analisis: data })
      },

      abpAcciones: [],
      loadAbpAcciones: async (analisisId) => {
        const data = await fetchAbpAcciones(analisisId)
        set((s) => ({ abpAcciones: [...s.abpAcciones.filter((a) => a.analisisId !== analisisId), ...data] }))
      },
      addAbpAccion: async (a) => {
        const created = await createAbpAccion(a)
        if (created) set((s) => ({ abpAcciones: [...s.abpAcciones, created] }))
      },
      updateAbpAccion: async (id, patch) => {
        set((s) => ({ abpAcciones: s.abpAcciones.map((a) => a.id === id ? { ...a, ...patch } : a) }))
        await updateAbpAccionDB(id, patch)
      },
      deleteAbpAccion: async (id) => {
        set((s) => ({ abpAcciones: s.abpAcciones.filter((a) => a.id !== id) }))
        await deleteAbpAccionDB(id)
      },

      informes: [],
      loadInformes: async () => {
        const data = await fetchInformes()
        set({ informes: data })
      },
      addInforme: async (i) => {
        const created = await createInforme(i)
        if (created) set((s) => ({ informes: [created, ...s.informes] }))
        return created
      },
      updateInformeAction: async (id, patch) => {
        set((s) => ({ informes: s.informes.map((i) => i.id === id ? { ...i, ...patch } : i) }))
        await updateInformeDB(id, patch)
      },
      deleteInformeAction: async (id) => {
        set((s) => ({ informes: s.informes.filter((i) => i.id !== id) }))
        await deleteInformeDB(id)
      },

      partidosInforme: [],
      loadPartidosInforme: async (informeId) => {
        const data = await fetchPartidosInforme(informeId)
        set((s) => ({ partidosInforme: [...s.partidosInforme.filter((p) => p.informeId !== informeId), ...data] }))
      },
      addPartidoInforme: async (p) => {
        const created = await createPartidoInforme(p)
        if (created) set((s) => ({ partidosInforme: [...s.partidosInforme, created] }))
        return created
      },
      updatePartidoInformeAction: async (id, patch) => {
        set((s) => ({ partidosInforme: s.partidosInforme.map((p) => p.id === id ? { ...p, ...patch } : p) }))
        await updatePartidoInformeDB(id, patch)
      },
      deletePartidoInformeAction: async (id) => {
        set((s) => ({ partidosInforme: s.partidosInforme.filter((p) => p.id !== id) }))
        await deletePartidoInformeDB(id)
      },

      evaluaciones: [],
      loadEvaluaciones: async (partidoInformeId) => {
        const data = await fetchEvaluaciones(partidoInformeId)
        set((s) => ({ evaluaciones: [...s.evaluaciones.filter((e) => e.partidoInformeId !== partidoInformeId), ...data] }))
      },
      addEvaluacion: async (e) => {
        const created = await createEvaluacion(e)
        if (created) set((s) => ({ evaluaciones: [...s.evaluaciones, created] }))
      },
      updateEvaluacionAction: async (id, patch) => {
        set((s) => ({ evaluaciones: s.evaluaciones.map((e) => e.id === id ? { ...e, ...patch } : e) }))
        await updateEvaluacionDB(id, patch)
      },
      deleteEvaluacionAction: async (id) => {
        set((s) => ({ evaluaciones: s.evaluaciones.filter((e) => e.id !== id) }))
        await deleteEvaluacionDB(id)
      },

      addPartido: async (p) => {
        set((state) => ({ partidos: [...state.partidos, p] }))
        await supabaseService.addPartido(p)
      },

      deletePartido: async (id) => {
        set((state) => ({ partidos: state.partidos.filter((p) => p.id !== id) }))
        await supabaseService.deletePartido(id)
      },

      addFicha: async (ficha) => {
        set((state) => ({ fichas: [...state.fichas, ficha] }))
        await supabaseService.addFicha(ficha)
      },

      updateFicha: async (id, data) => {
        set((state) => ({
          fichas: state.fichas.map((f) =>
            f.id === id ? { ...f, ...data, actualizadoEn: new Date().toISOString() } : f
          ),
        }))
        await supabaseService.updateFicha(id, data)
      },

      deleteFicha: async (id) => {
        set((state) => ({ fichas: state.fichas.filter((f) => f.id !== id) }))
        await supabaseService.deleteFicha(id)
      },

      getFicha: (id) => get().fichas.find((f) => f.id === id),

      addValoracion: async (fichaId, valoracion) => {
        const ficha = get().fichas.find((f) => f.id === fichaId)
        if (!ficha) return
        const valoraciones = [...ficha.valoraciones, valoracion]
        const snapshot = pickSnapshot(valoraciones)
        await get().updateFicha(fichaId, { valoraciones, ...(snapshot ?? {}) })
      },

      updateValoracion: async (fichaId, valoracionId, patch) => {
        const ficha = get().fichas.find((f) => f.id === fichaId)
        if (!ficha) return
        const valoraciones = ficha.valoraciones.map((v) => (v.id === valoracionId ? { ...v, ...patch } : v))
        const snapshot = pickSnapshot(valoraciones)
        await get().updateFicha(fichaId, { valoraciones, ...(snapshot ?? {}) })
      },

      deleteValoracion: async (fichaId, valoracionId) => {
        const ficha = get().fichas.find((f) => f.id === fichaId)
        if (!ficha) return
        const valoraciones = ficha.valoraciones.filter((v) => v.id !== valoracionId)
        const snapshot = pickSnapshot(valoraciones)
        const defaults = defaultFichaFields()
        await get().updateFicha(fichaId, {
          valoraciones,
          ...(snapshot ?? {
            fechaPartido: defaults.fechaPartido, local: defaults.local, visitante: defaults.visitante,
            categoria: defaults.categoria, observador: defaults.observador,
            evaluacionTecnica: defaults.evaluacionTecnica, valoracionGeneral: defaults.valoracionGeneral,
            propuesta: defaults.propuesta, descripcionJugadora: defaults.descripcionJugadora,
            observaciones: defaults.observaciones, cierre: defaults.cierre,
          }),
        })
      },

      saveBorrador: (data) =>
        set((state) => ({ borrador: { ...state.borrador, ...data } })),

      clearBorrador: () => set({ borrador: null }),

      addObservador: async (obs) => {
        set((state) => ({ observadores: [...state.observadores, obs] }))
        await supabaseService.addObservador(obs)
      },

      updateObservador: async (id, data) => {
        set((state) => ({
          observadores: state.observadores.map((o) =>
            o.id === id ? { ...o, ...data } : o
          ),
        }))
        await supabaseService.updateObservador(id, data)
      },

      deleteObservador: async (id) => {
        set((state) => ({ observadores: state.observadores.filter((o) => o.id !== id) }))
        await supabaseService.deleteObservador(id)
      },

      addClub: async (club) => {
        set((state) => ({ clubes: [...state.clubes, club] }))
        await supabaseService.addClub(club)
      },

      updateClub: async (id, data) => {
        set((state) => ({
          clubes: state.clubes.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }))
        await supabaseService.updateClub(id, data)
      },

      deleteClub: async (id) => {
        set((state) => ({ clubes: state.clubes.filter((c) => c.id !== id) }))
        await supabaseService.deleteClub(id)
      },

      addCategoria: async (cat) => {
        set((state) => ({ categorias: [...state.categorias, cat] }))
        await supabaseService.addCategoria(cat)
      },

      deleteCategoria: async (id) => {
        set((state) => ({ categorias: state.categorias.filter((c) => c.id !== id) }))
        await supabaseService.deleteCategoria(id)
      },

      setConvocatorias: (convocatorias: Convocatoria[]): void => { set({ convocatorias }) },

      addConvocatoria: async (c: Convocatoria): Promise<void> => {
        set((state) => ({ convocatorias: [...state.convocatorias, c] }))
        await supabaseService.addConvocatoria(c)
      },

      updateConvocatoria: async (id: string, data: Partial<Convocatoria>): Promise<void> => {
        set((state) => ({
          convocatorias: state.convocatorias.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }))
        await supabaseService.updateConvocatoria(id, data)
      },

      deleteConvocatoria: async (id: string): Promise<void> => {
        set((state) => ({ convocatorias: state.convocatorias.filter((c) => c.id !== id) }))
        await supabaseService.deleteConvocatoria(id)
      },

      addJugadoraToConvocatoria: async (convocatoriaId: string, jugadora: JugadoraConvocada): Promise<void> => {
        const conv = get().convocatorias.find((c) => c.id === convocatoriaId)
        if (!conv || conv.jugadoras.length >= 22 || conv.jugadoras.some((j) => j.fichaId === jugadora.fichaId)) return
        const newJugadoras = [...conv.jugadoras, jugadora]
        set((state) => ({
          convocatorias: state.convocatorias.map((c) =>
            c.id === convocatoriaId ? { ...c, jugadoras: newJugadoras } : c
          ),
        }))
        await supabaseService.updateConvocatoria(convocatoriaId, { jugadoras: newJugadoras })
      },

      removeJugadoraFromConvocatoria: async (convocatoriaId: string, fichaId: string): Promise<void> => {
        const conv = get().convocatorias.find((c) => c.id === convocatoriaId)
        if (!conv) return
        const newJugadoras = conv.jugadoras.filter((j) => j.fichaId !== fichaId)
        set((state) => ({
          convocatorias: state.convocatorias.map((c) =>
            c.id === convocatoriaId ? { ...c, jugadoras: newJugadoras } : c
          ),
        }))
        await supabaseService.updateConvocatoria(convocatoriaId, { jugadoras: newJugadoras })
      },

      competicionMapeos: [],
      loadCompeticionMapeos: async () => {
        const data = await fetchCompeticionMapeos()
        set({ competicionMapeos: data })
      },
      addCompeticionMapeo: async (m) => {
        const created = await createCompeticionMapeo(m)
        if (created) set((s) => ({ competicionMapeos: [...s.competicionMapeos, created] }))
        return created
      },
      updateCompeticionMapeoAction: async (id, patch) => {
        set((s) => ({
          competicionMapeos: s.competicionMapeos.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }))
        await updateCompeticionMapeoDB(id, patch)
      },
      deleteCompeticionMapeoAction: async (id) => {
        set((s) => ({ competicionMapeos: s.competicionMapeos.filter((m) => m.id !== id) }))
        await deleteCompeticionMapeoDB(id)
      },

      syncRuns: [],
      loadSyncRuns: async () => {
        const data = await fetchSyncRuns()
        set({ syncRuns: data })
      },
    }),
    {
      name: 'rfpaf-scouting-storage',
      // fichas/observadores/clubes contain base64 fotos/escudos and are always
      // re-fetched fresh from Supabase on load (useSupabaseSync) — persisting them
      // here too just duplicates that data into localStorage, and once enough
      // images accumulate it blows the ~5-10MB browser quota, which throws
      // synchronously inside set() and silently aborts whatever add/update call
      // triggered it (including its Supabase write) before it ever runs.
      partialize: (state) => ({
        categorias: state.categorias,
        partidos: state.partidos,
        convocatorias: state.convocatorias,
        currentObservador: state.currentObservador,
        borrador: state.borrador,
        sesion: state.sesion,
        ejercicios: state.ejercicios,
        videosSesiones: state.videosSesiones,
        eventos: state.eventos,
        registrosRPE: state.registrosRPE,
        lesiones: state.lesiones,
        analisis: state.analisis,
        activeAnalisisId: state.activeAnalisisId,
        pizarraLibre: state.pizarraLibre,
      }),
    }
  )
)
