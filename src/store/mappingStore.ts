import { create } from 'zustand'
import type { Mapping } from '@/types/index'
import { useValidationStore } from './validationStore'

// ─── Store interface ──────────────────────────────────────────────────────────

interface MappingState {
  /** All mappings keyed by sourceId */
  mappings: Record<string, Mapping[]>
  selectedMappingId: string | null

  /**
   * Add a mapping. Idempotent: if a mapping with the same
   * sourceClassUri + sourcePropUri + targetClassUri + targetPropUri already
   * exists, the existing id is returned without inserting a duplicate (RD-04).
   */
  addMapping: (m: Omit<Mapping, 'id'>) => string

  /** Remove a mapping by id. Also clears selectedMappingId if it matches. */
  removeMapping: (id: string) => void

  /** Patch a mapping in place. */
  updateMapping: (id: string, patch: Partial<Omit<Mapping, 'id'>>) => void

  /** Returns all mappings for the given sourceId, or [] for unknown sourceIds. */
  getMappingsForSource: (sourceId: string) => Mapping[]

  setSelectedMappingId: (id: string | null) => void

  /** Remove all mappings for a given sourceId (e.g. when format changes). */
  clearMappingsForSource: (sourceId: string) => void

  /** Replace the entire mappings map — used on mount for IDB restore. */
  hydrate: (mappings: Record<string, Mapping[]>) => void
  /** Reset all mapping state to empty. */
  reset: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMappingStore = create<MappingState>((set, get) => ({
  mappings: {},
  selectedMappingId: null,

  addMapping: (m) => {
    const state = get()
    const existing = (state.mappings[m.sourceId] ?? []).find(
      (e) =>
        e.sourceClassUri === m.sourceClassUri &&
        e.sourcePropUri === m.sourcePropUri &&
        e.targetClassUri === m.targetClassUri &&
        e.targetPropUri === m.targetPropUri,
    )
    if (existing) return existing.id

    const id = crypto.randomUUID()
    const newMapping: Mapping = { ...m, id }
    set((s) => ({
      mappings: {
        ...s.mappings,
        [m.sourceId]: [...(s.mappings[m.sourceId] ?? []), newMapping],
      },
    }))
    useValidationStore.getState().setStale(true)
    return id
  },

  removeMapping: (id) => {
    set((s) => {
      const updated: Record<string, Mapping[]> = {}
      for (const [sourceId, list] of Object.entries(s.mappings)) {
        updated[sourceId] = list.filter((m) => m.id !== id)
      }
      return {
        mappings: updated,
        selectedMappingId: s.selectedMappingId === id ? null : s.selectedMappingId,
      }
    })
    useValidationStore.getState().setStale(true)
  },

  updateMapping: (id, patch) => {
    set((s) => {
      const updated: Record<string, Mapping[]> = {}
      for (const [sourceId, list] of Object.entries(s.mappings)) {
        updated[sourceId] = list.map((m) => (m.id === id ? { ...m, ...patch } : m))
      }
      return { mappings: updated }
    })
  },

  getMappingsForSource: (sourceId) => {
    return get().mappings[sourceId] ?? []
  },

  setSelectedMappingId: (id) => set({ selectedMappingId: id }),

  clearMappingsForSource: (sourceId) => {
    set((s) => {
      const updated = { ...s.mappings }
      delete updated[sourceId]
      return {
        mappings: updated,
        selectedMappingId: null,
      }
    })
    useValidationStore.getState().setStale(true)
  },

  hydrate: (mappings) => set({ mappings, selectedMappingId: null }),
  reset: () => set({ mappings: {}, selectedMappingId: null }),
}))
