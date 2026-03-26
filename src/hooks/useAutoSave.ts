import { useState, useEffect, useRef } from 'react'
import { get, set } from 'idb-keyval'
import { useOntologyStore } from '@/store/ontologyStore'
import { useSourcesStore } from '@/store/sourcesStore'
import { parseTurtle } from '@/lib/rdf'
import type { ProjectFile } from '@/types/index'

// ─── Constants ────────────────────────────────────────────────────────────────

const IDB_KEY = 'rosetta-project'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ─── useAutoSave ──────────────────────────────────────────────────────────────

export function useAutoSave() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load on mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    void get<ProjectFile>(IDB_KEY).then(saved => {
      if (!saved) return
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
      }

      // Restore sources ────────────────────────────────────────────────────────
      try {
        if (Array.isArray(saved.sources) && saved.sources.length > 0) {
          useSourcesStore.setState({
            sources: saved.sources,
            activeSourceId: saved.activeSourceId ?? null,
          })
        }
      } catch {
        console.warn('rosetta: failed to restore sources from IDB')
      }
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
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    setSaveStatus('saving')
    debounceTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const ontologyState = useOntologyStore.getState()
          const sourcesState = useSourcesStore.getState()
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
            mappings: {},
            timestamp: new Date().toISOString(),
          }
          await set(IDB_KEY, snapshot)
          setSaveStatus('saved')
        } catch {
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

    // Cleanup on unmount (R-02)
    return () => {
      unsubOntology()
      unsubSources()
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
    }
  }, [])

  return { saveStatus }
}
