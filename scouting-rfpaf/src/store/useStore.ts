import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FichaJugadora, Observador, Club, CategoriaItem, PartidoCalendario, Convocatoria, JugadoraConvocada, Sesion } from '../types'
import type { EjercicioDB } from '../lib/supabase'
import { OBSERVADORES, CATEGORIAS, CLUBES } from '../data/masterData'
import { supabaseService } from '../services/supabaseService'
import { SESION_EMPTY } from '../lib/entrenamientoConstants'

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

  login: (observadorId: string) => void
  logout: () => void
  setFichas: (fichas: FichaJugadora[]) => void
  setPartidos: (partidos: PartidoCalendario[]) => void
  setSesion: (sesion: Sesion | ((s: Sesion) => Sesion)) => void
  setEjercicios: (ejercicios: EjercicioDB[]) => void
  addPartido: (p: PartidoCalendario) => Promise<void>
  deletePartido: (id: string) => Promise<void>
  addFicha: (ficha: FichaJugadora) => Promise<void>
  updateFicha: (id: string, ficha: Partial<FichaJugadora>) => Promise<void>
  deleteFicha: (id: string) => Promise<void>
  getFicha: (id: string) => FichaJugadora | undefined
  saveBorrador: (data: Partial<FichaJugadora>) => void
  clearBorrador: () => void
  addObservador: (obs: Observador) => Promise<void>
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

      login: (observadorId) => set({ currentObservador: observadorId }),
      logout: () => set({ currentObservador: null }),

      setFichas: (fichas) => set({ fichas }),
      setPartidos: (partidos) => set({ partidos }),
      setSesion: (sesion) => {
        if (typeof sesion === 'function') {
          set((state) => ({ sesion: sesion(state.sesion) }))
        } else {
          set({ sesion })
        }
      },
      setEjercicios: (ejercicios) => set({ ejercicios }),

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

      saveBorrador: (data) =>
        set((state) => ({ borrador: { ...state.borrador, ...data } })),

      clearBorrador: () => set({ borrador: null }),

      addObservador: async (obs) => {
        set((state) => ({ observadores: [...state.observadores, obs] }))
        await supabaseService.addObservador(obs)
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
    }),
    {
      name: 'rfpaf-scouting-storage',
      partialize: (state) => ({
        fichas: state.fichas,
        observadores: state.observadores,
        categorias: state.categorias,
        clubes: state.clubes,
        partidos: state.partidos,
        convocatorias: state.convocatorias,
        currentObservador: state.currentObservador,
        borrador: state.borrador,
        sesion: state.sesion,
        ejercicios: state.ejercicios,
      }),
    }
  )
)
