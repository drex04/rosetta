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
  updateSource: (id: string, patch: Partial<Source>) => void
}

export function generateSourceId(): string {
  return crypto.randomUUID()
}

export const useSourcesStore = create<SourcesState>((set) => ({
  sources: [],
  activeSourceId: null,
  setActiveSourceId: (activeSourceId) => set({ activeSourceId }),
  addSource: (source) => set((s) => ({ sources: [...s.sources, source] })),
  removeSource: (id) =>
    set((s) => {
      const sources = s.sources.filter((src) => src.id !== id)
      const activeSourceId =
        s.activeSourceId === id
          ? (sources[0]?.id ?? null)
          : s.activeSourceId
      return { sources, activeSourceId }
    }),
  updateSource: (id, patch) =>
    set((s) => ({
      sources: s.sources.map((src) => (src.id === id ? { ...src, ...patch } : src)),
    })),
}))
