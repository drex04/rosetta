import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

export interface Source {
  id: string
  name: string
  order: number
  json: string
  schemaNodes: Node[]
  schemaEdges: Edge[]
}

interface SourcesState {
  sources: Source[]
  activeSourceId: string | null
  setActiveSourceId: (id: string | null) => void
  addSource: (source: Source) => void
  removeSource: (id: string) => void
}

export const useSourcesStore = create<SourcesState>((set) => ({
  sources: [],
  activeSourceId: null,
  setActiveSourceId: (activeSourceId) => set({ activeSourceId }),
  addSource: (source) => set((s) => ({ sources: [...s.sources, source] })),
  removeSource: (id) => set((s) => ({ sources: s.sources.filter((src) => src.id !== id) })),
}))
