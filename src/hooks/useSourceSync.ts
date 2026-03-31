import { useRef, useCallback, useEffect } from 'react'
import { useSourcesStore } from '@/store/sourcesStore'
import { useMappingStore } from '@/store/mappingStore'
import { parseTurtle, sourceCanvasToTurtle, convertToSourceNodes } from '@/lib/rdf'
import { jsonToSchema } from '@/lib/jsonToSchema'
import { xmlToSchema } from '@/lib/xmlToSchema'
import type { SourceNode, OntologyEdge } from '@/types/index'

// ─── useSourceSync ────────────────────────────────────────────────────────────
//
// Bidirectional sync between the Turtle editor and the React Flow canvas
// for source schema nodes.
//
// Mirrors useOntologySync but operates on the active source in sourcesStore.
//
// Flags:
//   isUpdatingFromCanvas  — set while canvas→editor path is running; editor
//                           change handler skips parse when set.
//   isUpdatingFromEditor  — set while editor→canvas path is running; canvas
//                           change handler is a no-op when set.

export function useSourceSync() {
  const isUpdatingFromCanvas = useRef(false)
  const isUpdatingFromEditor = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear pending debounce whenever activeSourceId changes so a stale parse
  // from the previous source is never applied to the new source.
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
    }
  }, [activeSourceId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
    }
  }, [])

  // ── Editor → Canvas ─────────────────────────────────────────────────────────
  // Write raw text to store immediately on every keystroke, then debounce the
  // parse step by 600ms.
  const onSourceEditorChange = useCallback((newTurtle: string) => {
    const currentSourceId = useSourcesStore.getState().activeSourceId
    if (!currentSourceId) return

    // Immediate raw write (so the editor always reflects what the user typed)
    useSourcesStore.getState().updateSource(currentSourceId, { turtleSource: newTurtle })

    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current)
    }

    // Capture the source ID at debounce-schedule time
    const capturedSourceId = currentSourceId

    debounceTimer.current = setTimeout(() => {
      if (isUpdatingFromCanvas.current) return

      // Critical: re-read activeSourceId from store — if user switched source,
      // discard this stale parse entirely.
      const latestSourceId = useSourcesStore.getState().activeSourceId
      if (latestSourceId !== capturedSourceId) return

      void (async () => {
        try {
          const { nodes: ontologyNodes, edges } = await parseTurtle(newTurtle)
          isUpdatingFromEditor.current = true

          const currentSource = useSourcesStore.getState().sources.find(
            (s) => s.id === capturedSourceId,
          )
          const existingSourceNodes = currentSource?.schemaNodes ?? []

          const sourceNodes = convertToSourceNodes(ontologyNodes, existingSourceNodes)

          useSourcesStore.getState().updateSource(capturedSourceId, {
            schemaNodes: sourceNodes,
            schemaEdges: edges,
            parseError: null,
          })
        } catch (e) {
          useSourcesStore.getState().updateSource(capturedSourceId, {
            parseError: (e as Error).message ?? 'Invalid Turtle syntax',
          })
        } finally {
          isUpdatingFromEditor.current = false
        }
      })()
    }, 600)
  }, [])

  // ── Canvas → Editor ─────────────────────────────────────────────────────────
  // Serialize current canvas source nodes to Turtle and update turtleSource.
  const onSourceCanvasChange = useCallback(async (
    nodes: SourceNode[],
    edges: OntologyEdge[],
  ) => {
    if (isUpdatingFromEditor.current) return

    const currentSourceId = useSourcesStore.getState().activeSourceId
    if (!currentSourceId) return

    const currentSource = useSourcesStore.getState().sources.find(
      (s) => s.id === currentSourceId,
    )
    if (!currentSource) return

    try {
      isUpdatingFromCanvas.current = true
      const uriPrefix = currentSource.name
      const turtle = await sourceCanvasToTurtle(nodes, edges, uriPrefix)
      useSourcesStore.getState().updateSource(currentSourceId, {
        turtleSource: turtle,
        parseError: null,
      })
    } catch {
      // Serialization failed — leave editor unchanged
    } finally {
      isUpdatingFromCanvas.current = false
    }
  }, [])

  // ── Reset Schema ─────────────────────────────────────────────────────────────
  // Re-derive schema from rawData + dataFormat, replace nodes/edges/turtleSource,
  // clear parseError, and invalidate mappings for this source.
  const resetSourceSchema = useCallback(() => {
    const { activeSourceId, sources } = useSourcesStore.getState()
    if (!activeSourceId) return

    const source = sources.find((s) => s.id === activeSourceId)
    if (!source) return

    try {
      const result =
        source.dataFormat === 'xml'
          ? xmlToSchema(source.rawData, source.name)
          : jsonToSchema(source.rawData, source.name)

      useSourcesStore.getState().updateSource(activeSourceId, {
        schemaNodes: result.nodes,
        schemaEdges: result.edges,
        turtleSource: result.turtle,
        parseError: null,
      })

      useMappingStore.getState().clearMappingsForSource(activeSourceId)
    } catch (e) {
      useSourcesStore.getState().updateSource(activeSourceId, {
        parseError: (e as Error).message ?? 'Reset failed',
      })
    }
  }, [])

  return { onSourceEditorChange, onSourceCanvasChange, resetSourceSchema }
}
