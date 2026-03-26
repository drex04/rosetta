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

// ─── Light theme (shared with TurtleEditorPanel) ──────────────────────────────

const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    backgroundColor: '#ffffff',
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: '#000000',
  },
  '.cm-line': {
    padding: '0 8px',
  },
  '.cm-gutters': {
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #e5e7eb',
    color: '#9ca3af',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f5f9',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
})

// ─── Banner state type ────────────────────────────────────────────────────────

type BannerState = 'invalid-json' | 'prefix-collision' | 'warnings' | null

// ─── SourcePanel ──────────────────────────────────────────────────────────────

export function SourcePanel() {
  const sources = useSourcesStore((s) => s.sources)
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const updateSource = useSourcesStore((s) => s.updateSource)

  const source = sources.find((s) => s.id === activeSourceId) ?? null

  // ── Name editing ────────────────────────────────────────────────────────────
  const [editName, setEditName] = useState(source?.name ?? '')

  // Keep editName in sync when active source changes
  useEffect(() => {
    setEditName(source?.name ?? '')
  }, [source?.id, source?.name])

  // ── Banners ─────────────────────────────────────────────────────────────────
  const [banner, setBanner] = useState<BannerState>(null)

  // ── Last successful turtle (for preview) ────────────────────────────────────
  const [lastTurtle, setLastTurtle] = useState('')

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

  // ── Initialize lastTurtle from stored source data on mount/source-switch ──────
  // After IDB restore, lastTurtle starts empty even though source.json is populated.
  // Re-derive the turtle so the preview is available without requiring a keystroke.
  useEffect(() => {
    if (!source?.json) {
      setLastTurtle('')
      return
    }
    try {
      JSON.parse(source.json) // only proceed if JSON is valid
      const result = jsonToSchema(source.json, source.name)
      setLastTurtle(result.turtle)
    } catch {
      setLastTurtle('')
    }
  }, [source?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced update (per source.id) ─────────────────────────────────────────
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

      // Valid JSON: call converter
      const result = jsonToSchema(value, sources.find((s) => s.id === sourceId)?.name ?? '')

      // Check prefix collision against other sources (RD-07)
      const currentSource = sources.find((s) => s.id === sourceId)
      const currentSlug = deriveSlug(currentSource?.name ?? '')
      const hasCollision = sources.some(
        (s) => s.id !== sourceId && deriveSlug(s.name) === currentSlug,
      )

      if (result.warnings.length > 0) {
        // Show warnings banner (highest priority after invalid-json)
        setBanner('warnings')
      } else if (hasCollision) {
        setBanner('prefix-collision')
      } else {
        setBanner(null)
      }

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

  // ── Prefix collision check on source name change ───────────────────────────────
  // Recheck collision banner when sources list changes (names may have changed)
  useEffect(() => {
    if (!source || banner === 'invalid-json') return
    const currentSlug = deriveSlug(source.name)
    const hasCollision = sources.some(
      (s) => s.id !== source.id && deriveSlug(s.name) === currentSlug,
    )
    if (hasCollision) {
      setBanner('prefix-collision')
    } else if (banner === 'prefix-collision') {
      setBanner(null)
    }
  }, [sources])  // eslint-disable-line react-hooks/exhaustive-deps

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
      {banner === 'prefix-collision' && (
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
