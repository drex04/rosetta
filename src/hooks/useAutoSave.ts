import { useState, useEffect, useRef } from 'react'
import { get, set } from 'idb-keyval'
import { useOntologyStore, SEED_TURTLE } from '@/store/ontologyStore'
import { useSourcesStore, migrateSource } from '@/store/sourcesStore'
import { useMappingStore } from '@/store/mappingStore'
import { parseTurtle } from '@/lib/rdf'
import type { Mapping, MappingGroup, ProjectFile } from '@/types/index'

// ─── Constants ────────────────────────────────────────────────────────────────

const IDB_KEY = 'rosetta-project'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ─── Type guards ──────────────────────────────────────────────────────────────

function isValidMappings(v: unknown): v is Record<string, Mapping[]> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v as object).every(
      (arr) =>
        Array.isArray(arr) &&
        arr.every((m) => typeof m === 'object' && m !== null && typeof (m as Mapping).id === 'string'),
    )
  )
}

function isValidGroups(v: unknown): v is Record<string, MappingGroup[]> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v as object).every(
      (arr) =>
        Array.isArray(arr) &&
        arr.every(
          (g) =>
            typeof g === 'object' &&
            g !== null &&
            typeof (g as MappingGroup).id === 'string' &&
            typeof (g as MappingGroup).strategy === 'string' &&
            typeof (g as MappingGroup).targetClassUri === 'string' &&
            typeof (g as MappingGroup).targetPropUri === 'string',
        ),
    )
  )
}

// ─── useAutoSave ──────────────────────────────────────────────────────────────

export function useAutoSave() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guard: block autosave writes until hydration from IDB completes to prevent
  // seed state from being flushed before the user's saved project is restored.
  const hydratedRef = useRef(false)

  // Load on mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    void get<ProjectFile>(IDB_KEY).then(async saved => {
      if (!saved) {
        // No saved project — load the seed ontology as the starting state.
        // Await completion so hydratedRef is only set after seed state is in the store,
        // preventing a race where a subsequent store change saves stale seed data.
        await useOntologyStore.getState().loadTurtle(SEED_TURTLE)
        hydratedRef.current = true
        return
      }
      try {
        const store = useOntologyStore.getState()
        void parseTurtle(saved.ontology.turtleSource).then(({ nodes, edges }) => {
          const positioned = nodes.map(n => ({
            ...n,
            position: saved.ontology.nodePositions[n.id] ?? n.position,
          }))
          store.setTurtleSource(saved.ontology.turtleSource)
          store.setNodes(positioned)
          store.setEdges(edges)
        }).catch((e: unknown) => {
          // Restore raw text so the editor shows user's work after reload
          store.setTurtleSource(saved.ontology.turtleSource)
          store.setParseError((e as Error)?.message ?? 'Invalid Turtle syntax')
          console.warn('rosetta: restored invalid Turtle from IDB')
        })
      } catch {
        console.warn('rosetta: failed to restore project from IDB')
        setSaveStatus('error')
      }

      // Restore sources ────────────────────────────────────────────────────────
      try {
        if (Array.isArray(saved.sources) && saved.sources.length > 0) {
          const migratedSources = saved.sources.map((s) =>
            migrateSource(s as unknown as Record<string, unknown>)
          )
          useSourcesStore.setState({
            sources: migratedSources,
            activeSourceId: saved.activeSourceId ?? null,
          })
        }
      } catch {
        console.warn('rosetta: failed to restore sources from IDB')
        setSaveStatus('error')
      }

      // Restore mappings ───────────────────────────────────────────────────────
      if (isValidMappings(saved.mappings)) {
        const groups = isValidGroups(saved.groups) ? saved.groups : undefined
        useMappingStore.getState().hydrate(saved.mappings, groups)
      } else {
        console.warn('[useAutoSave] Skipping malformed mappings from IDB')
      }

      hydratedRef.current = true
    })
  }, [])

  // Block tab close while save is pending ─────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveStatus])

  // Shared debounced IDB write ─────────────────────────────────────────────────
  function scheduleSave() {
    if (!hydratedRef.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    setSaveStatus('saving')
    debounceTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const ontologyState = useOntologyStore.getState()
          const sourcesState = useSourcesStore.getState()
          const { mappings, groups } = useMappingStore.getState()
          const snapshot: ProjectFile = {
            version: 1,
            ontology: {
              turtleSource: ontologyState.turtleSource,
              nodePositions: Object.fromEntries(
                ontologyState.nodes.map(n => [n.id, n.position])
              ),
            },
            sources: sourcesState.sources,
            activeSourceId: sourcesState.activeSourceId,
            mappings,
            groups,
            timestamp: new Date().toISOString(),
          }
          await set(IDB_KEY, snapshot)
          setSaveStatus('saved')
        } catch (err) {
          console.error('[useAutoSave] IDB write failed', err)
          setSaveStatus('error')
        }
      })()
    }, 500)
  }

  // Subscribe to ontologyStore changes ─────────────────────────────────────────
  useEffect(() => {
    const unsubOntology = useOntologyStore.subscribe(() => {
      scheduleSave()
    })

    const unsubSources = useSourcesStore.subscribe(() => {
      scheduleSave()
    })

    const unsubMapping = useMappingStore.subscribe(() => {
      scheduleSave()
    })

    // Cleanup on unmount (R-02)
    return () => {
      unsubOntology()
      unsubSources()
      unsubMapping()
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
    }
  }, [])

  return { saveStatus }
}
