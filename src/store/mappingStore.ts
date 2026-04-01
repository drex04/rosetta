import { create } from 'zustand'
import type { Mapping, MappingGroup } from '@/types/index'
import { useValidationStore } from './validationStore'
import { generateGroupConstruct } from '@/lib/sparql'

// ─── Store interface ──────────────────────────────────────────────────────────

interface MappingState {
  /** All mappings keyed by sourceId */
  mappings: Record<string, Mapping[]>
  selectedMappingId: string | null

  /** All groups keyed by sourceId */
  groups: Record<string, MappingGroup[]>

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

  /** Remove all mappings AND groups for a given sourceId (e.g. when source is deleted). */
  removeMappingsForSource: (sourceId: string) => void

  /** Replace the entire mappings map — used on mount for IDB restore. */
  hydrate: (mappings: Record<string, Mapping[]>, groups?: Record<string, MappingGroup[]>) => void
  /** Reset all mapping state to empty. */
  reset: () => void

  // ─── Group actions ──────────────────────────────────────────────────────────

  /**
   * Create a group from the given mappingIds under the given strategy.
   * Sets groupId + groupOrder on each member mapping.
   * Returns the new group ID.
   */
  createGroup: (sourceId: string, mappingIds: string[], strategy: MappingGroup['strategy']) => string

  /** Patch group fields. Finds the group by id across all sources. */
  updateGroup: (groupId: string, patch: Partial<{ strategy: MappingGroup['strategy']; separator: string; templatePattern: string; sparqlConstruct: string; targetClassUri: string; targetPropUri: string }>) => void

  /** Remove a group and clear groupId/groupOrder from all member mappings. */
  ungroupMappings: (groupId: string) => void

  /** Returns groups for a given sourceId, or []. */
  getGroupsForSource: (sourceId: string) => MappingGroup[]

  /** Returns all mappings that belong to the given groupId. */
  getMappingsInGroup: (groupId: string) => Mapping[]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMappingStore = create<MappingState>((set, get) => ({
  mappings: {},
  selectedMappingId: null,
  groups: {},

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
      const updatedMappings = { ...s.mappings }
      delete updatedMappings[sourceId]
      const updatedGroups = { ...s.groups }
      delete updatedGroups[sourceId]
      return {
        mappings: updatedMappings,
        groups: updatedGroups,
        selectedMappingId: null,
      }
    })
    useValidationStore.getState().setStale(true)
  },

  removeMappingsForSource: (sourceId) => {
    set((s) => {
      const updatedMappings = { ...s.mappings }
      delete updatedMappings[sourceId]
      const updatedGroups = { ...s.groups }
      delete updatedGroups[sourceId]
      // Clear selectedMappingId if it belongs to a mapping in the removed source
      const removedIds = new Set((s.mappings[sourceId] ?? []).map((m) => m.id))
      const selectedMappingId =
        s.selectedMappingId !== null && removedIds.has(s.selectedMappingId)
          ? null
          : s.selectedMappingId
      return { mappings: updatedMappings, groups: updatedGroups, selectedMappingId }
    })
    useValidationStore.getState().setStale(true)
  },

  hydrate: (mappings, groups) => set({ mappings, groups: groups ?? {}, selectedMappingId: null }),
  reset: () => set({ mappings: {}, groups: {}, selectedMappingId: null }),

  createGroup: (sourceId, mappingIds, strategy) => {
    const groupId = crypto.randomUUID()
    // Set groupId and groupOrder on member mappings
    set((s) => {
      const updated: Record<string, Mapping[]> = {}
      for (const [sid, list] of Object.entries(s.mappings)) {
        updated[sid] = list.map((m) => {
          const idx = mappingIds.indexOf(m.id)
          if (idx === -1) return m
          return { ...m, groupId, groupOrder: idx }
        })
      }
      return { mappings: updated }
    })

    // Determine targetClassUri and targetPropUri from the first found mapping
    const allMappings = Object.values(get().mappings).flat()
    const members = mappingIds.map((id) => allMappings.find((m) => m.id === id)).filter(Boolean) as Mapping[]
    const first = members[0]

    const baseGroup = {
      id: groupId,
      strategy,
      separator: '',
      targetClassUri: first?.targetClassUri ?? '',
      targetPropUri: first?.targetPropUri ?? '',
      sparqlConstruct: '',
    }

    const newGroup: MappingGroup =
      strategy === 'template'
        ? { ...baseGroup, strategy: 'template', templatePattern: '' }
        : strategy === 'coalesce'
          ? { ...baseGroup, strategy: 'coalesce' }
          : { ...baseGroup, strategy: 'concat' }

    newGroup.sparqlConstruct = generateGroupConstruct(newGroup, members)

    set((s) => ({
      groups: {
        ...s.groups,
        [sourceId]: [...(s.groups[sourceId] ?? []), newGroup],
      },
    }))

    useValidationStore.getState().setStale(true)
    return groupId
  },

  updateGroup: (groupId, patch) => {
    set((s) => {
      const updatedGroups: Record<string, MappingGroup[]> = {}
      for (const [sid, list] of Object.entries(s.groups)) {
        updatedGroups[sid] = list.map((g) => {
          if (g.id !== groupId) return g
          const merged = { ...g, ...patch }
          // Re-assert discriminated union shape based on strategy
          const strategy = (patch as { strategy?: MappingGroup['strategy'] }).strategy ?? g.strategy
          let updated: MappingGroup
          if (strategy === 'template') {
            updated = {
              ...merged,
              strategy: 'template' as const,
              templatePattern: (merged as { templatePattern?: string }).templatePattern ?? '',
            }
          } else if (strategy === 'coalesce') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { templatePattern: _tp, ...rest } = merged as MappingGroup & { templatePattern?: string }
            updated = { ...rest, strategy: 'coalesce' as const }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { templatePattern: _tp, ...rest } = merged as MappingGroup & { templatePattern?: string }
            updated = { ...rest, strategy: 'concat' as const }
          }
          const members = Object.values(s.mappings).flat().filter((m) => m.groupId === groupId)
          updated.sparqlConstruct = generateGroupConstruct(updated, members)
          return updated
        })
      }
      return { groups: updatedGroups }
    })
  },

  ungroupMappings: (groupId) => {
    // Clear groupId/groupOrder from member mappings
    set((s) => {
      const updatedMappings: Record<string, Mapping[]> = {}
      for (const [sid, list] of Object.entries(s.mappings)) {
        updatedMappings[sid] = list.map((m) =>
          m.groupId === groupId
            ? { ...m, groupId: undefined, groupOrder: undefined }
            : m,
        )
      }
      // Remove group from groups state
      const updatedGroups: Record<string, MappingGroup[]> = {}
      for (const [sid, list] of Object.entries(s.groups)) {
        updatedGroups[sid] = list.filter((g) => g.id !== groupId)
      }
      return { mappings: updatedMappings, groups: updatedGroups }
    })
    useValidationStore.getState().setStale(true)
  },

  getGroupsForSource: (sourceId) => get().groups[sourceId] ?? [],

  getMappingsInGroup: (groupId) => {
    return Object.values(get().mappings)
      .flat()
      .filter((m) => m.groupId === groupId)
  },
}))
