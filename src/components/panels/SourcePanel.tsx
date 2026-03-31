import { useEffect, useRef, useMemo, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { lineNumbers, highlightActiveLine } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { turtle } from 'codemirror-lang-turtle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSourcesStore } from '@/store/sourcesStore'
import { jsonToSchema } from '@/lib/jsonToSchema'
import { lightTheme } from '@/lib/codemirror-theme'

// ─── Debounce helper ──────────────────────────────────────────────────────────

function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: T): void => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
  return debounced
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

function deriveSlug(name: string): string {
  return 'src_' + name.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() + '_'
}

// ─── Banner state type ────────────────────────────────────────────────────────

// 'prefix-collision' is derived during render from sources; only json/warnings are set via state
type BannerState = 'invalid-json' | 'warnings' | null

// ─── SourcePanel ──────────────────────────────────────────────────────────────

export function SourcePanel() {
  const sources = useSourcesStore((s) => s.sources)
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const updateSource = useSourcesStore((s) => s.updateSource)

  const source = sources.find((s) => s.id === activeSourceId) ?? null

  // ── Name editing ─────────────────────────────────────────────────────────────
  // No sync effect needed: SourcePanel is remounted via key={activeSourceId} in RightPanel
  const [editName, setEditName] = useState(source?.name ?? '')

  // ── Banners ─────────────────────────────────────────────────────────────────
  const [banner, setBanner] = useState<BannerState>(null)

  // ── Prefix collision — derived from current sources list (no effect needed) ──
  const hasPrefixCollision = source !== null && banner !== 'invalid-json' &&
    sources.some((s) => s.id !== source.id && deriveSlug(s.name) === deriveSlug(source.name))

  // ── Last successful turtle (for preview) ─────────────────────────────────────
  // Lazy init derives turtle on mount (covers IDB restore without a sync effect).
  const [lastTurtle, setLastTurtle] = useState<string>(() => {
    if (!source?.json) return ''
    try {
      JSON.parse(source.json)
      return jsonToSchema(source.json, source.name).turtle
    } catch {
      return ''
    }
  })

  // ── CodeMirror refs (JSON editor) ────────────────────────────────────────────
  const jsonContainerRef = useRef<HTMLDivElement>(null)
  const jsonViewRef = useRef<EditorView | null>(null)
  const isUpdatingFromStore = useRef(false)

  // ── CodeMirror refs (Turtle preview) ─────────────────────────────────────────
  const turtleContainerRef = useRef<HTMLDivElement>(null)
  const turtleViewRef = useRef<EditorView | null>(null)
  const isUpdatingTurtleFromStore = useRef(false)

  // ── Turtle preview open state ─────────────────────────────────────────────────
  const [showTurtle, setShowTurtle] = useState(true)

  // ── Debounced update (per source.id) ─────────────────────────────────────────
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const debouncedUpdate = useMemo(() => {
    if (!source) return null
    const sourceId = source.id  // RD-06: capture in closure, do NOT read from store inside callback

    return debounce((value: string) => {
      // Try parse JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
        void parsed  // suppress unused var warning
      } catch {
        setBanner('invalid-json')
        // Do NOT update schemaNodes/schemaEdges on invalid JSON
        updateSource(sourceId, { json: value })
        return
      }

      // Valid JSON: call converter; prefix collision is derived during render (hasPrefixCollision)
      const result = jsonToSchema(value, sources.find((s) => s.id === sourceId)?.name ?? '')

      setBanner(result.warnings.length > 0 ? 'warnings' : null)

      // Update turtle preview if we have turtle output
      if (result.turtle) {
        setLastTurtle(result.turtle)
      }

      updateSource(sourceId, {
        json: value,
        schemaNodes: result.nodes,
        schemaEdges: result.edges,
      })
    }, 500)
  }, [source?.id])  // eslint-disable-line react-hooks/exhaustive-deps
  // Re-create debounce fn when source changes; sources/updateSource are stable Zustand refs

  // ── Mount JSON editor ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (jsonContainerRef.current === null) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      if (isUpdatingFromStore.current) return
      const value = update.state.doc.toString()
      debouncedUpdate?.(value)
    })

    const state = EditorState.create({
      doc: source?.json ?? '',
      extensions: [
        basicSetup,
        lineNumbers(),
        highlightActiveLine(),
        json(),
        lightTheme,
        updateListener,
      ],
    })

    const view = new EditorView({ state, parent: jsonContainerRef.current })
    jsonViewRef.current = view

    return () => {
      view.destroy()
      jsonViewRef.current = null
    }
  }, [source?.id])  // eslint-disable-line react-hooks/exhaustive-deps
  // Re-mount editor when source switches

  // ── External update effect: store → JSON editor ───────────────────────────────
  // RD-11: No hasFocus guard — source switching must always update content.
  useEffect(() => {
    const view = jsonViewRef.current
    if (view === null) return
    const newJson = source?.json ?? ''
    const currentDoc = view.state.doc.toString()
    if (currentDoc === newJson) return

    isUpdatingFromStore.current = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newJson },
    })
    isUpdatingFromStore.current = false
  }, [source?.json])  // RD-11: effect dependency is source?.json

  // ── Mount Turtle preview editor ────────────────────────────────────────────────
  useEffect(() => {
    if (!showTurtle) return
    if (turtleContainerRef.current === null) return

    const state = EditorState.create({
      doc: lastTurtle,
      extensions: [
        basicSetup,
        lineNumbers(),
        turtle(),
        lightTheme,
        EditorState.readOnly.of(true),
      ],
    })

    const view = new EditorView({ state, parent: turtleContainerRef.current })
    turtleViewRef.current = view

    return () => {
      view.destroy()
      turtleViewRef.current = null
    }
  }, [showTurtle])  // eslint-disable-line react-hooks/exhaustive-deps
  // Re-mount turtle editor when section is opened

  // ── Update Turtle preview when lastTurtle changes ─────────────────────────────
  useEffect(() => {
    const view = turtleViewRef.current
    if (view === null) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc === lastTurtle) return

    isUpdatingTurtleFromStore.current = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: lastTurtle },
    })
    isUpdatingTurtleFromStore.current = false
  }, [lastTurtle])

  // ── Empty state ────────────────────────────────────────────────────────────────
  if (!source) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <p className="text-sm text-muted-foreground">Add a source above to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Source name (inline editable) */}
      <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/20">
        <input
          className="w-full text-sm font-semibold bg-transparent border-none outline-none rounded px-1 hover:bg-muted/40 focus:bg-muted/60 transition-colors"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => {
            const trimmed = editName.trim()
            if (trimmed && trimmed !== source.name) {
              updateSource(source.id, { name: trimmed })
            } else {
              setEditName(source.name)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              setEditName(source.name)
              e.currentTarget.blur()
            }
          }}
          aria-label="Source name"
        />
      </div>

      {/* Banner */}
      {banner === 'invalid-json' && (
        <Alert variant="destructive" className="shrink-0 rounded-none border-x-0 text-xs">
          <AlertDescription>Invalid JSON — schema not updated</AlertDescription>
        </Alert>
      )}
      {hasPrefixCollision && (
        <Alert className="shrink-0 rounded-none border-x-0 text-xs bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertDescription>
            Prefix collision — rename this source to avoid RDF conflicts
          </AlertDescription>
        </Alert>
      )}
      {banner === 'warnings' && (
        <Alert className="shrink-0 rounded-none border-x-0 text-xs bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertDescription>Schema generated with warnings — check your JSON structure</AlertDescription>
        </Alert>
      )}

      {/* JSON editor */}
      <div
        ref={jsonContainerRef}
        className="flex-1 overflow-hidden"
        aria-label="JSON source editor"
      />

      {/* Collapsible Turtle preview */}
      <div className="shrink-0 border-t border-border">
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          onClick={() => setShowTurtle((v) => !v)}
          aria-expanded={showTurtle}
          aria-controls="turtle-preview"
        >
          <span>Generated RDFS</span>
          <span className="text-[10px]">{showTurtle ? '▲' : '▼'}</span>
        </button>
        {showTurtle && (
          <div
            id="turtle-preview"
            ref={turtleContainerRef}
            className="h-48 overflow-hidden border-t border-border"
            aria-label="Generated Turtle preview"
          />
        )}
      </div>
    </div>
  )
}
