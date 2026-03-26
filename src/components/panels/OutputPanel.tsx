import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { lineNumbers } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { turtle } from 'codemirror-lang-turtle'
import { Button } from '@/components/ui/button'
import { DownloadSimpleIcon, CircleNotchIcon, WarningIcon } from '@phosphor-icons/react'
import * as N3 from 'n3'
import jsonld from 'jsonld'
import { useOntologyStore } from '@/store/ontologyStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function serializeToNQuads(turtleSource: string): Promise<string> {
  const store = new N3.Store()
  await new Promise<void>((resolve, reject) => {
    const parser = new N3.Parser({ format: 'Turtle' })
    parser.parse(turtleSource, (error, quad) => {
      if (error) { reject(error); return }
      if (quad) { store.addQuad(quad) } else { resolve() }
    })
  })
  return new Promise<string>((resolve, reject) => {
    const writer = new N3.Writer({ format: 'N-Quads' })
    for (const quad of store) writer.addQuad(quad)
    writer.end((error, result: string) => {
      if (error) { reject(error); return }
      resolve(result)
    })
  })
}

// ─── Shared CodeMirror theme ───────────────────────────────────────────────────

const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    backgroundColor: '#ffffff',
  },
  '.cm-content': { padding: '8px 0', caretColor: '#000000' },
  '.cm-line': { padding: '0 8px' },
  '.cm-gutters': {
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #e5e7eb',
    color: '#9ca3af',
  },
  '.cm-activeLineGutter': { backgroundColor: '#f1f5f9' },
  '.cm-activeLine': { backgroundColor: '#f8fafc' },
  '.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto' },
})

// ─── Sub-format toggle ────────────────────────────────────────────────────────

type Format = 'turtle' | 'jsonld'

// ─── Turtle view ─────────────────────────────────────────────────────────────

function TurtleView({ turtleSource }: { turtleSource: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Mount editor
  useEffect(() => {
    if (!containerRef.current) return
    const state = EditorState.create({
      doc: turtleSource,
      extensions: [basicSetup, lineNumbers(), turtle(), lightTheme, EditorState.readOnly.of(true)],
    })
    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync content when turtleSource changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === turtleSource) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: turtleSource } })
  }, [turtleSource])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
        <span className="text-xs text-muted-foreground font-mono">ontology.ttl</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 text-xs"
          onClick={() => downloadBlob('ontology.ttl', turtleSource, 'text/turtle')}
        >
          <DownloadSimpleIcon size={12} />
          Export .ttl
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" aria-label="Turtle output" />
    </div>
  )
}

// ─── JSON-LD view ─────────────────────────────────────────────────────────────

type JsonLdStatus = 'idle' | 'loading' | 'ready' | 'error'

function JsonLdView({ turtleSource }: { turtleSource: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [status, setStatus] = useState<JsonLdStatus>('idle')
  const [jsonLdString, setJsonLdString] = useState('')

  // Convert turtleSource → JSON-LD whenever source changes
  useEffect(() => {
    if (!turtleSource) { setStatus('idle'); return }
    setStatus('loading')
    let cancelled = false

    async function convert() {
      try {
        const nquads = await serializeToNQuads(turtleSource)
        const doc = await jsonld.fromRDF(nquads)
        const str = JSON.stringify(doc, null, 2)
        if (!cancelled) { setJsonLdString(str); setStatus('ready') }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    void convert()
    return () => { cancelled = true }
  }, [turtleSource])

  // Mount editor when status becomes ready
  useEffect(() => {
    if (status !== 'ready') return
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: jsonLdString,
      extensions: [basicSetup, lineNumbers(), json(), lightTheme, EditorState.readOnly.of(true)],
    })
    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync content when jsonLdString changes (on subsequent turtle updates)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === jsonLdString) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: jsonLdString } })
  }, [jsonLdString])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
        <span className="text-xs text-muted-foreground font-mono">ontology.jsonld</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 text-xs"
          disabled={status !== 'ready'}
          onClick={() => downloadBlob('ontology.jsonld', jsonLdString, 'application/ld+json')}
        >
          <DownloadSimpleIcon size={12} />
          Export .jsonld
        </Button>
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
          <CircleNotchIcon size={14} className="animate-spin" />
          Converting…
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-4 text-xs text-amber-600">
          <WarningIcon size={14} />
          Conversion failed — check ontology for errors
        </div>
      )}
      {status === 'idle' && (
        <div className="p-4 text-xs text-muted-foreground">No ontology loaded</div>
      )}

      <div
        ref={containerRef}
        className={['flex-1 overflow-hidden', status === 'ready' ? '' : 'hidden'].join(' ')}
        aria-label="JSON-LD output"
      />
    </div>
  )
}

// ─── OutputPanel ─────────────────────────────────────────────────────────────

export function OutputPanel() {
  const turtleSource = useOntologyStore((s) => s.turtleSource)
  const [format, setFormat] = useState<Format>('turtle')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Format toggle */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-border">
        <button
          className={[
            'px-2.5 py-1 text-xs rounded font-medium transition-colors',
            format === 'turtle'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
          ].join(' ')}
          onClick={() => setFormat('turtle')}
        >
          Turtle
        </button>
        <button
          className={[
            'px-2.5 py-1 text-xs rounded font-medium transition-colors',
            format === 'jsonld'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
          ].join(' ')}
          onClick={() => setFormat('jsonld')}
        >
          JSON-LD
        </button>
      </div>

      {/* Format view */}
      <div className="flex-1 overflow-hidden">
        {format === 'turtle' && <TurtleView turtleSource={turtleSource} />}
        {format === 'jsonld' && <JsonLdView turtleSource={turtleSource} />}
      </div>
    </div>
  )
}
