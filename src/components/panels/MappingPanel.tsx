import { useEffect, useRef } from 'react'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { useMappingStore } from '@/store/mappingStore'
import { useSourcesStore } from '@/store/sourcesStore'
import { localName } from '@/lib/rdf'
import { generateConstruct } from '@/lib/sparql'
import type { Mapping } from '@/types/index'

// ─── CodeMirror light theme (matches TurtleEditorPanel) ───────────────────────

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

// ─── Lint badge helper (RD-05) ────────────────────────────────────────────────

function isValidConstruct(query: string): boolean {
  const lower = query.toLowerCase()
  return lower.includes('construct') && lower.includes('where')
}

// ─── SPARQL editor sub-component ──────────────────────────────────────────────

interface SparqlEditorProps {
  value: string
  onChange: (value: string) => void
}

function SparqlEditor({ value, onChange }: SparqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isExternalUpdate = useRef(false)

  useEffect(() => {
    if (containerRef.current === null) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      if (isExternalUpdate.current) return
      onChange(update.state.doc.toString())
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        lineNumbers(),
        highlightActiveLine(),
        lightTheme,
        updateListener,
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Mount once

  // Sync external value changes to editor (when not focused)
  useEffect(() => {
    const view = viewRef.current
    if (view === null) return

    const currentDoc = view.state.doc.toString()
    if (currentDoc === value) return
    if (view.hasFocus) return

    isExternalUpdate.current = true
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    })
    isExternalUpdate.current = false
  }, [value])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden"
      aria-label="SPARQL CONSTRUCT editor"
    />
  )
}

// ─── MappingPanel ─────────────────────────────────────────────────────────────

export function MappingPanel() {
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const { getMappingsForSource, removeMapping, updateMapping, setSelectedMappingId, selectedMappingId } =
    useMappingStore()

  const mappings: Mapping[] = activeSourceId !== null ? getMappingsForSource(activeSourceId) : []

  const selectedMapping = mappings.find((m) => m.id === selectedMappingId) ?? null

  function handleSelectMapping(id: string) {
    setSelectedMappingId(selectedMappingId === id ? null : id)
  }

  function handleDeleteMapping(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    removeMapping(id)
  }

  function handleEditorChange(newValue: string) {
    if (selectedMappingId === null) return
    updateMapping(selectedMappingId, { sparqlConstruct: newValue })
  }

  function handleRegenerate() {
    if (selectedMapping === null) return
    const freshQuery = generateConstruct({
      sourceId: selectedMapping.sourceId,
      sourceClassUri: selectedMapping.sourceClassUri,
      sourcePropUri: selectedMapping.sourcePropUri,
      targetClassUri: selectedMapping.targetClassUri,
      targetPropUri: selectedMapping.targetPropUri,
      sourceHandle: selectedMapping.sourceHandle,
      targetHandle: selectedMapping.targetHandle,
    })
    updateMapping(selectedMapping.id, { sparqlConstruct: freshQuery })
  }

  // ── No source selected ──
  if (activeSourceId === null) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-muted-foreground text-sm text-center">No source selected</p>
      </div>
    )
  }

  // ── No mappings yet ──
  if (mappings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-muted-foreground text-sm text-center">
          Drag from a source property to a master property to create a mapping
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Mapping list ── */}
      <div className="shrink-0 overflow-y-auto border-b border-border max-h-[40%]">
        <ul className="divide-y divide-border">
          {mappings.map((mapping) => {
            const isSelected = mapping.id === selectedMappingId
            return (
              <li
                key={mapping.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectMapping(mapping.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSelectMapping(mapping.id)
                }}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs hover:bg-muted/50 transition-colors ${
                  isSelected ? 'bg-muted font-medium' : ''
                }`}
              >
                <span className="truncate text-amber-700 font-mono">
                  {localName(mapping.sourcePropUri)}
                </span>
                <span className="mx-2 text-muted-foreground shrink-0">→</span>
                <span className="truncate text-blue-700 font-mono flex-1">
                  {localName(mapping.targetPropUri)}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteMapping(e, mapping.id)}
                  className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors leading-none"
                  aria-label={`Remove mapping ${localName(mapping.sourcePropUri)} → ${localName(mapping.targetPropUri)}`}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── SPARQL CONSTRUCT editor (only when a mapping is selected) ── */}
      {selectedMapping !== null && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor header */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                SPARQL CONSTRUCT
              </span>
              {/* RD-05: Lint badge */}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  isValidConstruct(selectedMapping.sparqlConstruct)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
                title={
                  isValidConstruct(selectedMapping.sparqlConstruct)
                    ? 'Valid: CONSTRUCT and WHERE present'
                    : 'Missing CONSTRUCT or WHERE keyword'
                }
              >
                {isValidConstruct(selectedMapping.sparqlConstruct) ? 'valid' : 'incomplete'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-0.5"
            >
              Regenerate
            </button>
          </div>

          {/* CodeMirror editor (DD-02) */}
          <SparqlEditor
            value={selectedMapping.sparqlConstruct}
            onChange={handleEditorChange}
          />
        </div>
      )}
    </div>
  )
}
