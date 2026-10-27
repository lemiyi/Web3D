import { create } from 'zustand'
import type { Filtres } from '@/lib/filtres'

type AppState = {
  conteSelectionne: string | null
  filtres: Filtres
  selectionner: (id: string | null) => void
  setFiltres: (f: Partial<Filtres>) => void
  reinitialiserFiltres: () => void
}

const filtresVides: Filtres = { langue: null, region: null, type: null, recherche: '' }

export const useAppStore = create<AppState>((set) => ({
  conteSelectionne: null,
  filtres: filtresVides,
  selectionner: (id) => set({ conteSelectionne: id }),
  setFiltres: (f) => set((s) => ({ filtres: { ...s.filtres, ...f } })),
  reinitialiserFiltres: () => set({ filtres: filtresVides }),
}))
