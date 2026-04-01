import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DownloadSimpleIcon, CircleNotchIcon, WarningIcon, PlayIcon } from '@phosphor-icons/react'
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
  const [outTab, setOutTab] = useState<'fused' | 'export'>('fused')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-tab nav */}
      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-border">
        {(['fused', 'export'] as const).map((t) => (
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
        {outTab === 'fused' && <FusedTab />}
        {outTab === 'export' && <ExportTab />}
      </div>
    </div>
  )
}
