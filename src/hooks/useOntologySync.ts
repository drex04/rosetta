import { useRef, useCallback, useEffect } from 'react';
import { useOntologyStore } from '@/store/ontologyStore';
import { parseTurtle, canvasToTurtle } from '@/lib/rdf';
import type { OntologyNode, OntologyEdge } from '@/types/index';

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
  const isUpdatingFromCanvas = useRef(false);
  const isUpdatingFromEditor = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hasPendingEdits = useRef(false);
  // True during the 100ms canvas→editor debounce window; callers can use this
  // to set the editor to read-only to prevent overwrite races.
  const isCanvasSyncPending = useRef(false);

  // ─── Canvas → Editor (store subscription) ───────────────────────────────────
  // Subscribe to granular node/edge mutations (addNode, removeNode, etc.) that
  // bypass onCanvasChange.  Debounce at 100 ms to batch rapid mutations.
  useEffect(() => {
    // Selector: stable key derived from node/edge identity (not positions).
    // Positions can change on drag but we don't want to re-serialize for those
    // — those go through onCanvasChange which is called by React Flow directly.
    const selector = (s: { nodes: OntologyNode[]; edges: OntologyEdge[] }) =>
      s.nodes
        .map(
          (n) =>
            n.id +
            '|' +
            n.data.label +
            '|' +
            n.data.properties.map((p) => p.uri).join(','),
        )
        .join(';') +
      '::' +
      s.edges.map((e) => e.id).join(';');

    let lastKey = selector(useOntologyStore.getState());

    const unsubscribe = useOntologyStore.subscribe((state) => {
      // Skip if editor is currently driving the update (prevents circular loop)
      if (isUpdatingFromEditor.current) return;

      const newKey = selector(state);
      if (newKey === lastKey) return;
      lastKey = newKey;

      // Mark editor as pending-sync (read-only window)
      isCanvasSyncPending.current = true;

      if (canvasDebounceTimer.current !== null) {
        clearTimeout(canvasDebounceTimer.current);
      }

      canvasDebounceTimer.current = setTimeout(() => {
        isCanvasSyncPending.current = false;
        canvasDebounceTimer.current = null;

        // Re-check guard — editor may have started an update during the debounce
        if (isUpdatingFromEditor.current) return;

        const { nodes, edges } = useOntologyStore.getState();

        void (async () => {
          try {
            isUpdatingFromCanvas.current = true;
            const turtle = await canvasToTurtle(nodes, edges);
            useOntologyStore.getState().setTurtleSource(turtle);
            useOntologyStore.getState().setParseError(null);
          } catch (e) {
            // Surface serialization errors as parse errors so the editor
            // status area shows them (e.g. "Sync error: missing URI on node X")
            const msg = e instanceof Error ? e.message : String(e);
            useOntologyStore.getState().setParseError(`Sync error: ${msg}`);
            // turtleSource is intentionally left unchanged — last good content preserved
          } finally {
            isUpdatingFromCanvas.current = false;
          }
        })();
      }, 100);
    });

    return () => {
      unsubscribe();
      if (canvasDebounceTimer.current !== null) {
        clearTimeout(canvasDebounceTimer.current);
        canvasDebounceTimer.current = null;
      }
      isCanvasSyncPending.current = false;
    };
  }, []);

  // Cleanup editor debounce on unmount (R-02)
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, []);

  // Editor → Canvas ────────────────────────────────────────────────────────────
  // Write the raw text to turtleSource immediately on every keystroke,
  // then debounce the parse step by 600 ms (D-05).
  const onEditorChange = useCallback((newTurtle: string) => {
    hasPendingEdits.current = true;
    useOntologyStore.getState().setTurtleSource(newTurtle);

    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (isUpdatingFromCanvas.current) return;

      void (async () => {
        try {
          const { nodes, edges } = await parseTurtle(newTurtle);
          isUpdatingFromEditor.current = true;
          // Overlay existing positions so dragged nodes keep their location
          const currentNodes = useOntologyStore.getState().nodes;
          const positioned = nodes.map((n) => ({
            ...n,
            position:
              currentNodes.find((c) => c.id === n.id)?.position ?? n.position,
          }));
          useOntologyStore.getState().setNodes(positioned);
          useOntologyStore.getState().setEdges(edges);
          useOntologyStore.getState().setParseError(null);
          // Clear only on successful parse — on failure the editor still has
          // content that hasn't synced to the canvas, so the guard must hold.
          hasPendingEdits.current = false;
        } catch (e) {
          // Invalid Turtle — leave canvas unchanged (D-05)
          useOntologyStore
            .getState()
            .setParseError((e as Error).message ?? 'Invalid Turtle syntax');
        } finally {
          isUpdatingFromEditor.current = false;
        }
      })();
    }, 600);
  }, []);

  // Canvas → Editor ────────────────────────────────────────────────────────────
  // Serialize current canvas state to Turtle and update turtleSource.
  const onCanvasChange = useCallback(
    async (nodes: OntologyNode[], edges: OntologyEdge[]) => {
      if (isUpdatingFromEditor.current) return;

      try {
        isUpdatingFromCanvas.current = true;
        const turtle = await canvasToTurtle(nodes, edges);
        useOntologyStore.getState().setTurtleSource(turtle);
        useOntologyStore.getState().setParseError(null);
      } catch (err) {
        useOntologyStore
          .getState()
          .setParseError(
            `Canvas serialization failed: ${err instanceof Error ? err.message : 'invalid node state'}`,
          );
      } finally {
        isUpdatingFromCanvas.current = false;
      }
    },
    [],
  );

  return {
    onEditorChange,
    onCanvasChange,
    hasPendingEdits,
    isCanvasSyncPending,
  };
}
