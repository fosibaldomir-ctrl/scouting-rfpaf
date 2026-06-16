import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FichaJugadora, Observador, Club, CategoriaItem, PartidoCalendario, Convocatoria, JugadoraConvocada } from '../types'
import { OBSERVADORES, CATEGORIAS, CLUBES } from '../data/masterData'
import { supabaseService } from '../services/supabaseService'

interface AppState {
  fichas: FichaJugadora[]
  observadores: Observador[]
  categorias: CategoriaItem[]
  clubes: Club[]
  partidos: PartidoCalendario[]
  convocatorias: Convocatoria[]
  currentObservador: string | null
  borrador: Partial<FichaJugadora> | null

  login: (observadorId: string) => void
  logout: () => void
  setFichas: (fichas: FichaJugadora[]) => void
  setPartidos: (partidos: PartidoCalendario[]) => void
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
  addConvocatoria: (c: Convocatoria) => void
  updateConvocatoria: (id: string, data: Partial<Convocatoria>) => void
  deleteConvocatoria: (id: string) => void
  addJugadoraToConvocatoria: (convocatoriaId: string, jugadora: JugadoraConvocada) => void
  removeJugadoraFromConvocatoria: (convocatoriaId: string, fichaId: string) => void
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

      login: (observadorId) => set({ currentObservador: observadorId }),
      logout: () => set({ currentObservador: null }),

      setFichas: (fichas) => set({ fichas }),
      setPartidos: (partidos) => set({ partidos }),

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

      addConvocatoria: (c) =>
        set((state) => ({ convocatorias: [...state.convocatorias, c] })),

      updateConvocatoria: (id, data) =>
        set((state) => ({
          convocatorias: state.convocatorias.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),

      deleteConvocatoria: (id) =>
        set((state) => ({ convocatorias: state.convocatorias.filter((c) => c.id !== id) })),

      addJugadoraToConvocatoria: (convocatoriaId, jugadora) =>
        set((state) => ({
          convocatorias: state.convocatorias.map((c) =>
            c.id === convocatoriaId && c.jugadoras.length < 22 && !c.jugadoras.some((j) => j.fichaId === jugadora.fichaId)
              ? { ...c, jugadoras: [...c.jugadoras, jugadora] }
              : c
          ),
        })),

      removeJugadoraFromConvocatoria: (convocatoriaId, fichaId) =>
        set((state) => ({
          convocatorias: state.convocatorias.map((c) =>
            c.id === convocatoriaId
              ? { ...c, jugadoras: c.jugadoras.filter((j) => j.fichaId !== fichaId) }
              : c
          ),
        })),
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
      }),
    }
  )
)
