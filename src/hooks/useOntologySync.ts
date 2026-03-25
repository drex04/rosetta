import { useRef, useCallback, useEffect } from 'react'
import { useOntologyStore } from '@/store/ontologyStore'
import { parseTurtle, canvasToTurtle } from '@/lib/rdf'
import type { OntologyNode, OntologyEdge } from '@/types/index'

// ─── useOntologySync ──────────────────────────────────────────────────────────
//
// Bidirectional sync between the Turtle editor and the React Flow canvas.
//
// Flags:
//   isUpdatingFromCanvas  — set while canvas→editor path is running; editor
//                           change handler skips the parse step when set.
//   isUpdatingFromEditor  — set while editor→canvas path is running; canvas
//                           change handler is a no-op when set.

export function useOntologySync() {
  const isUpdatingFromCanvas = useRef(false)
  const isUpdatingFromEditor = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasPendingEdits = useRef(false)

  // Cleanup on unmount (R-02)
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
    }
  }, [])

  // Editor → Canvas ────────────────────────────────────────────────────────────
  // Write the raw text to turtleSource immediately on every keystroke,
  // then debounce the parse step by 600 ms (D-05).
  const onEditorChange = useCallback((newTurtle: string) => {
    hasPendingEdits.current = true
    useOntologyStore.getState().setTurtleSource(newTurtle)

    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      if (isUpdatingFromCanvas.current) return

      void (async () => {
        try {
          const { nodes, edges } = await parseTurtle(newTurtle)
          isUpdatingFromEditor.current = true
          // Overlay existing positions so dragged nodes keep their location
          const currentNodes = useOntologyStore.getState().nodes
          const positioned = nodes.map((n) => ({
            ...n,
            position: currentNodes.find((c) => c.id === n.id)?.position ?? n.position,
          }))
          useOntologyStore.getState().setNodes(positioned)
          useOntologyStore.getState().setEdges(edges)
          // Clear only on successful parse — on failure the editor still has
          // content that hasn't synced to the canvas, so the guard must hold.
          hasPendingEdits.current = false
        } catch {
          // Invalid Turtle — leave canvas unchanged (D-05)
        } finally {
          isUpdatingFromEditor.current = false
        }
      })()
    }, 600)
  }, [])

  // Canvas → Editor ────────────────────────────────────────────────────────────
  // Serialize current canvas state to Turtle and update turtleSource.
  const onCanvasChange = useCallback(async (nodes: OntologyNode[], edges: OntologyEdge[]) => {
    if (isUpdatingFromEditor.current) return

    try {
      isUpdatingFromCanvas.current = true
      const turtle = await canvasToTurtle(nodes, edges)
      useOntologyStore.getState().setTurtleSource(turtle)
    } catch {
      // Serialization failed — leave editor unchanged
    } finally {
      isUpdatingFromCanvas.current = false
    }
  }, [])

  return { onEditorChange, onCanvasChange, hasPendingEdits }
}
