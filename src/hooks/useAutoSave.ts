import { useState, useEffect, useRef } from 'react'
import { get, set } from 'idb-keyval'
import { useOntologyStore } from '@/store/ontologyStore'
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
        }).catch(() => {
          console.warn('rosetta: failed to restore project from IDB')
        })
      } catch {
        console.warn('rosetta: failed to restore project from IDB')
      }
    })
  }, [])

  // Subscribe and auto-save on change (500ms debounce) ────────────────────────
  useEffect(() => {
    const unsub = useOntologyStore.subscribe(state => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      setSaveStatus('saving')
      debounceTimer.current = setTimeout(() => {
        void (async () => {
          try {
            const snapshot: ProjectFile = {
              version: 1,
              ontology: {
                turtleSource: state.turtleSource,
                nodePositions: Object.fromEntries(
                  state.nodes.map(n => [n.id, n.position])
                ),
              },
              sources: [],
              mappings: [],
              timestamp: new Date().toISOString(),
            }
            await set(IDB_KEY, snapshot)
            setSaveStatus('saved')
          } catch {
            setSaveStatus('error')
          }
        })()
      }, 500)
    })

    // Cleanup on unmount (R-02)
    return () => {
      unsub()
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
    }
  }, [])

  return { saveStatus }
}
