import { create } from 'zustand'

export interface ViolationRecord {
  id: string
  sourceId: string
  targetClassUri: string
  targetPropUri: string | null
  message: string
  severity: string
  canvasNodeId: string | null
}

interface ValidationState {
  results: Record<string, ViolationRecord[]>
  loading: boolean
  stale: boolean
  error: string | null
  lastRun: number | null
  highlightedCanvasNodeId: string | null

  runValidation: () => Promise<void>
  setStale: (stale: boolean) => void
  reset: () => void
  setHighlightedCanvasNodeId: (id: string | null) => void
}

export const useValidationStore = create<ValidationState>()((set, get) => ({
  results: {},
  loading: false,
  stale: false,
  error: null,
  lastRun: null,
  highlightedCanvasNodeId: null,

  runValidation: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    // Full implementation added in validationStore task (wave 2)
    set({ loading: false, stale: false, lastRun: Date.now(), highlightedCanvasNodeId: null })
  },

  setStale: (stale) => set({ stale }),

  reset: () => set({
    results: {},
    loading: false,
    stale: false,
    error: null,
    lastRun: null,
    highlightedCanvasNodeId: null,
  }),

  setHighlightedCanvasNodeId: (id) => set({ highlightedCanvasNodeId: id }),
}))
