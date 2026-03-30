import { create } from 'zustand'
import { validateSource, type ViolationRecord } from '../lib/shacl/index'
import { useSourcesStore } from './sourcesStore'
import { useOntologyStore } from './ontologyStore'
import { useMappingStore } from './mappingStore'

export type { ViolationRecord }

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

    const sources = useSourcesStore.getState().sources
    const ontologyNodes = useOntologyStore.getState().nodes
    const getMappingsForSource = useMappingStore.getState().getMappingsForSource

    const results: Record<string, ViolationRecord[]> = {}

    for (const source of sources) {
      try {
        const violations = await validateSource(
          source,
          ontologyNodes,
          getMappingsForSource(source.id),
        )
        results[source.id] = violations as ViolationRecord[]
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Validation failed'
        set({ loading: false, error: message })
        return
      }
    }

    set({ results, loading: false, stale: false, lastRun: Date.now(), highlightedCanvasNodeId: null })
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

export function subscribeValidationToMappings(): () => void {
  return useMappingStore.subscribe(() => useValidationStore.getState().setStale(true))
}
