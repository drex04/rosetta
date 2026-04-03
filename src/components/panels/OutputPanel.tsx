import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DownloadSimpleIcon,
  CircleNotchIcon,
  WarningIcon,
  PlayIcon,
} from '@phosphor-icons/react';
import { generateRml } from '@/lib/rml';
import { generateYarrrml } from '@/lib/yarrrml';
import { useMappingStore } from '@/store/mappingStore';
import { useSourcesStore } from '@/store/sourcesStore';
import { useFusionStore } from '@/store/fusionStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Fused JSON viewer ────────────────────────────────────────────────────────

function FusedJsonViewer({ content }: { content: string }) {
  return (
    <pre className="flex-1 overflow-auto text-sm px-3 py-2 font-mono text-foreground whitespace-pre-wrap">
      {content}
    </pre>
  );
}

// ─── Fused sub-tab ────────────────────────────────────────────────────────────

function FusedTab() {
  const result = useFusionStore((s) => s.result);
  const jsonLd = useFusionStore((s) => s.jsonLd);
  const loading = useFusionStore((s) => s.loading);
  const stale = useFusionStore((s) => s.stale);
  const error = useFusionStore((s) => s.error);
  const lastRun = useFusionStore((s) => s.lastRun);
  const runFusion = useFusionStore((s) => s.runFusion);
  const setStale = useFusionStore((s) => s.setStale);

  // Stale detection: mark results stale when mappings or sources change
  useEffect(() => {
    const unsubM = useMappingStore.subscribe(() => setStale(true));
    const unsubS = useSourcesStore.subscribe(() => setStale(true));
    return () => {
      unsubM();
      unsubS();
    };
  }, [setStale]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header row */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
        <Button size="sm" onClick={() => runFusion()} disabled={loading}>
          {loading ? (
            <CircleNotchIcon size={12} className="animate-spin" />
          ) : (
            <PlayIcon size={12} />
          )}
          Transform &amp; Fuse
        </Button>
        {stale && !loading && (
          <span className="text-sm text-muted-foreground ml-auto">
            Results may be stale
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 text-sm"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Warnings from failed queries/parsing */}
      {result && result.warnings.length > 0 && (
        <Alert className="shrink-0 rounded-none border-x-0 border-source/40 text-source-text bg-source/5">
          <AlertDescription>
            <div className="flex flex-col gap-0.5">
              {result.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Source summary */}
      {result && (
        <div className="shrink-0 px-3 py-2 border-b border-border text-sm text-muted-foreground">
          {result.totalQuads} triples from {result.sources.length} source
          {result.sources.length !== 1 ? 's' : ''}
          {lastRun && ` · ${new Date(lastRun).toLocaleTimeString()}`}
        </div>
      )}

      {/* Download buttons */}
      {result && (
        <div className="shrink-0 flex gap-2 px-3 py-2 border-b border-border">
          <Button
            variant="outline"
            size="xs"
            onClick={() =>
              downloadBlob(
                JSON.stringify(result.sources, null, 2),
                'fused.json',
                'application/json',
              )
            }
          >
            <DownloadSimpleIcon size={12} />
            JSON
          </Button>
          {jsonLd && (
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                downloadBlob(
                  JSON.stringify(jsonLd, null, 2),
                  'fused.jsonld',
                  'application/ld+json',
                )
              }
            >
              <DownloadSimpleIcon size={12} />
              JSON-LD
            </Button>
          )}
        </div>
      )}

      {/* Fused JSON output viewer */}
      {result ? (
        <FusedJsonViewer
          content={JSON.stringify(
            { totalQuads: result.totalQuads, sources: result.sources },
            null,
            2,
          )}
        />
      ) : !loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Click Transform &amp; Fuse to run
        </div>
      ) : null}
    </div>
  );
}

// ─── Export sub-tab ──────────────────────────────────────────────────────────

function ExportTab() {
  const sources = useSourcesStore((s) => s.sources);
  const mappings = useMappingStore((s) => s.mappings);

  const hasMappings = Object.values(mappings).some((m) => m.length > 0);
  const hasSparqlOrJoin = Object.values(mappings)
    .flat()
    .some((m) => m.kind === 'sparql' || m.kind === 'join');

  const rmlPreview = useMemo(
    () => generateRml(sources, mappings),
    [sources, mappings],
  );
  const yarrrmlPreview = useMemo(
    () => generateYarrrml(sources, mappings),
    [sources, mappings],
  );

  function handleDownloadRml() {
    downloadBlob(rmlPreview, 'mappings.rml.ttl', 'text/turtle');
  }

  function handleDownloadYarrrml() {
    downloadBlob(yarrrmlPreview, 'mappings.yarrrml.yml', 'application/yaml');
  }

  if (!hasMappings) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No mappings defined yet. Create mappings in the MAP tab to export
        RML/YARRRML.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {hasSparqlOrJoin && (
        <Alert className="border-source/40 text-source-text bg-source/5">
          <WarningIcon size={14} className="shrink-0" />
          <AlertDescription>
            Some mappings use <strong>SPARQL</strong> or <strong>join</strong>{' '}
            kinds and are annotated as <em>requires manual conversion</em> in
            the exported files.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Download production ETL mapping files for use with RML processors
          (RMLMapper, Morph-KGC, etc.).
        </p>
        <details className="border border-border rounded text-sm">
          <summary className="px-2 py-1.5 cursor-pointer hover:bg-muted font-medium text-muted-foreground select-none">
            RML Preview
          </summary>
          <pre className="overflow-auto max-h-48 px-3 py-2 font-mono text-sm text-foreground bg-muted/30 border-t border-border whitespace-pre-wrap">
            {rmlPreview}
          </pre>
        </details>
        <Button
          variant="outline"
          size="xs"
          className="justify-start"
          onClick={handleDownloadRml}
        >
          <DownloadSimpleIcon size={12} />
          Download RML (.rml.ttl)
        </Button>
        <details className="border border-border rounded text-sm">
          <summary className="px-2 py-1.5 cursor-pointer hover:bg-muted font-medium text-muted-foreground select-none">
            YARRRML Preview
          </summary>
          <pre className="overflow-auto max-h-48 px-3 py-2 font-mono text-sm text-foreground bg-muted/30 border-t border-border whitespace-pre-wrap">
            {yarrrmlPreview}
          </pre>
        </details>
        <Button
          variant="outline"
          size="xs"
          className="justify-start"
          onClick={handleDownloadYarrrml}
        >
          <DownloadSimpleIcon size={12} />
          Download YARRRML (.yarrrml.yml)
        </Button>
      </div>
    </div>
  );
}

// ─── OutputPanel ─────────────────────────────────────────────────────────────

export function OutputPanel() {
  const [outTab, setOutTab] = useState<'fused' | 'export'>('fused');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-tab nav */}
      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-border">
        {(['fused', 'export'] as const).map((t) => (
          <Button
            key={t}
            size="xs"
            variant={outTab === t ? 'default' : 'ghost'}
            onClick={() => setOutTab(t)}
          >
            {t === 'fused' ? 'Fused' : t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {outTab === 'fused' && <FusedTab />}
        {outTab === 'export' && <ExportTab />}
      </div>
    </div>
  );
}
