import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FichaJugadora, Observador, Club, CategoriaItem } from '../types'
import { OBSERVADORES, CATEGORIAS, CLUBES } from '../data/masterData'
import { supabaseService } from '../services/supabaseService'

interface AppState {
  fichas: FichaJugadora[]
  observadores: Observador[]
  categorias: CategoriaItem[]
  clubes: Club[]
  currentObservador: string | null
  borrador: Partial<FichaJugadora> | null
  syncing: boolean

  login: (observadorId: string) => void
  logout: () => void
  addFicha: (ficha: FichaJugadora) => void
  updateFicha: (id: string, ficha: Partial<FichaJugadora>) => void
  deleteFicha: (id: string) => void
  getFicha: (id: string) => FichaJugadora | undefined
  saveBorrador: (data: Partial<FichaJugadora>) => void
  clearBorrador: () => void
  addObservador: (obs: Observador) => void
  deleteObservador: (id: string) => void
  addClub: (club: Club) => void
  updateClub: (id: string, club: Partial<Club>) => void
  deleteClub: (id: string) => void
  addCategoria: (cat: CategoriaItem) => void
  deleteCategoria: (id: string) => void
}

export const useStoreWithSync = create<AppState>()(
  persist(
    (set, get) => ({
      fichas: [],
      observadores: OBSERVADORES,
      categorias: CATEGORIAS,
      clubes: CLUBES,
      currentObservador: null,
      borrador: null,
      syncing: false,

      login: (observadorId) => set({ currentObservador: observadorId }),
      logout: () => set({ currentObservador: null }),

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
    }),
    {
      name: 'rfpaf-scouting-storage',
      partialize: (state) => ({
        fichas: state.fichas,
        observadores: state.observadores,
        categorias: state.categorias,
        clubes: state.clubes,
        currentObservador: state.currentObservador,
        borrador: state.borrador,
      }),
    }
  )
)
