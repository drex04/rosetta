import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { lineNumbers } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { turtle } from 'codemirror-lang-turtle'
import { Button } from '@/components/ui/button'
import { DownloadSimpleIcon, CircleNotchIcon, WarningIcon, PlayIcon } from '@phosphor-icons/react'
import * as N3 from 'n3'
import jsonld from 'jsonld'
import { useOntologyStore } from '@/store/ontologyStore'
import { lightTheme } from '@/lib/codemirror-theme'
import { generateRml } from '@/lib/rml'
import { generateYarrrml } from '@/lib/yarrrml'
import { useMappingStore } from '@/store/mappingStore'
import { useSourcesStore } from '@/store/sourcesStore'
import { useFusionStore } from '@/store/fusionStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
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

// ─── Sub-format toggle ────────────────────────────────────────────────────────

type OntologyFormat = 'turtle' | 'jsonld'

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
          onClick={() => downloadBlob(turtleSource, 'ontology.ttl', 'text/turtle')}
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
    if (!turtleSource) {
      // Defer to avoid synchronous setState in effect body
      const id = setTimeout(() => { setStatus('idle') }, 0)
      return () => { clearTimeout(id) }
    }
    let cancelled = false

    async function convert() {
      setStatus('loading')
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
          onClick={() => downloadBlob(jsonLdString, 'ontology.jsonld', 'application/ld+json')}
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

// ─── Ontology sub-tab ─────────────────────────────────────────────────────────

function OntologyTab({ turtleSource }: { turtleSource: string }) {
  const [format, setFormat] = useState<OntologyFormat>('turtle')

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

// ─── Fused JSON viewer ────────────────────────────────────────────────────────

function FusedJsonViewer({ content }: { content: string }) {
  return (
    <pre className="flex-1 overflow-auto text-xs px-3 py-2 font-mono text-foreground whitespace-pre-wrap">
      {content}
    </pre>
  )
}

// ─── Fused sub-tab ────────────────────────────────────────────────────────────

function FusedTab() {
  const result = useFusionStore((s) => s.result)
  const jsonLd = useFusionStore((s) => s.jsonLd)
  const loading = useFusionStore((s) => s.loading)
  const stale = useFusionStore((s) => s.stale)
  const error = useFusionStore((s) => s.error)
  const lastRun = useFusionStore((s) => s.lastRun)
  const runFusion = useFusionStore((s) => s.runFusion)
  const setStale = useFusionStore((s) => s.setStale)

  // Stale detection: mark results stale when mappings or sources change
  useEffect(() => {
    const unsubM = useMappingStore.subscribe(() => setStale(true))
    const unsubS = useSourcesStore.subscribe(() => setStale(true))
    return () => { unsubM(); unsubS() }
  }, [setStale])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header row */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
        <button
          onClick={() => runFusion()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <CircleNotchIcon size={12} className="animate-spin" />
          ) : (
            <PlayIcon size={12} />
          )}
          Transform &amp; Fuse
        </button>
        {stale && !loading && (
          <span className="text-xs text-amber-600 ml-auto">Results may be stale</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 px-3 py-2 text-xs text-destructive bg-destructive/10 border-b border-border">
          {error}
        </div>
      )}

      {/* Source summary */}
      {result && (
        <div className="shrink-0 px-3 py-2 border-b border-border text-xs text-muted-foreground">
          {result.totalQuads} triples from {result.sources.length} source{result.sources.length !== 1 ? 's' : ''}
          {lastRun && ` · ${new Date(lastRun).toLocaleTimeString()}`}
        </div>
      )}

      {/* Download buttons */}
      {result && (
        <div className="shrink-0 flex gap-2 px-3 py-2 border-b border-border">
          <button
            onClick={() => downloadBlob(JSON.stringify(result.sources, null, 2), 'fused.json', 'application/json')}
            className="text-xs flex items-center gap-1 px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors"
          >
            <DownloadSimpleIcon size={12} />
            JSON
          </button>
          {jsonLd && (
            <button
              onClick={() => downloadBlob(JSON.stringify(jsonLd, null, 2), 'fused.jsonld', 'application/ld+json')}
              className="text-xs flex items-center gap-1 px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors"
            >
              <DownloadSimpleIcon size={12} />
              JSON-LD
            </button>
          )}
        </div>
      )}

      {/* Fused JSON output viewer */}
      {result ? (
        <FusedJsonViewer content={JSON.stringify({ totalQuads: result.totalQuads, sources: result.sources }, null, 2)} />
      ) : !loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          Click Transform &amp; Fuse to run
        </div>
      ) : null}
    </div>
  )
}

// ─── Export sub-tab ──────────────────────────────────────────────────────────

function ExportTab() {
  const sources = useSourcesStore((s) => s.sources)
  const mappings = useMappingStore((s) => s.mappings)

  const hasMappings = Object.values(mappings).some((m) => m.length > 0)
  const hasSparqlOrJoin = Object.values(mappings)
    .flat()
    .some((m) => m.kind === 'sparql' || m.kind === 'join')

  function handleDownloadRml() {
    const rml = generateRml(sources, mappings)
    downloadBlob(rml, 'mappings.rml.ttl', 'text/turtle')
  }

  function handleDownloadYarrrml() {
    const yaml = generateYarrrml(sources, mappings)
    downloadBlob(yaml, 'mappings.yarrrml.yml', 'application/yaml')
  }

  if (!hasMappings) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        No mappings defined yet. Create mappings in the MAP tab to export RML/YARRRML.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {hasSparqlOrJoin && (
        <div className="flex items-start gap-2 p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <WarningIcon size={14} className="shrink-0 mt-0.5" />
          <span>
            Some mappings use <strong>SPARQL</strong> or <strong>join</strong> kinds and are annotated
            as <em>requires manual conversion</em> in the exported files.
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Download production ETL mapping files for use with RML processors (RMLMapper, Morph-KGC, etc.).
        </p>
        <Button
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-xs"
          onClick={handleDownloadRml}
        >
          <DownloadSimpleIcon size={14} />
          Download RML (.rml.ttl)
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-xs"
          onClick={handleDownloadYarrrml}
        >
          <DownloadSimpleIcon size={14} />
          Download YARRRML (.yarrrml.yml)
        </Button>
      </div>
    </div>
  )
}

// ─── OutputPanel ─────────────────────────────────────────────────────────────

export function OutputPanel() {
  const turtleSource = useOntologyStore((s) => s.turtleSource)
  const [outTab, setOutTab] = useState<'ontology' | 'fused' | 'export'>('ontology')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-tab nav */}
      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-border">
        {(['ontology', 'fused', 'export'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOutTab(t)}
            className={`text-xs px-2 py-0.5 rounded capitalize transition-colors ${
              outTab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t === 'fused' ? 'Fused' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {outTab === 'ontology' && <OntologyTab turtleSource={turtleSource} />}
        {outTab === 'fused' && <FusedTab />}
        {outTab === 'export' && <ExportTab />}
      </div>
    </div>
  )
}
