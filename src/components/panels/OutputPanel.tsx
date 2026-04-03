import { useEffect, useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    <ScrollArea className="flex-1">
      <pre className="text-sm px-3 py-2 font-mono text-foreground whitespace-pre-wrap">
        {content}
      </pre>
    </ScrollArea>
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
        <Button
          variant="default"
          size="sm"
          onClick={() => runFusion()}
          disabled={loading}
        >
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
        {result && (
          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Download JSON"
              onClick={() =>
                downloadBlob(
                  JSON.stringify(result.sources, null, 2),
                  'fused.json',
                  'application/json',
                )
              }
            >
              <DownloadSimpleIcon size={14} />
            </Button>
            {jsonLd && (
              <Button
                variant="ghost"
                size="icon"
                title="Download JSON-LD"
                onClick={() =>
                  downloadBlob(
                    JSON.stringify(jsonLd, null, 2),
                    'fused.jsonld',
                    'application/ld+json',
                  )
                }
              >
                <DownloadSimpleIcon size={14} />
              </Button>
            )}
          </div>
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
    <ScrollArea className="flex-1">
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
        <p className="text-sm text-muted-foreground">
          Download production ETL mapping files for use with RML processors
          (RMLMapper, Morph-KGC, etc.).
        </p>
        <Accordion type="multiple" defaultValue={['rml']} className="w-full">
          <AccordionItem
            value="rml"
            className="border border-border rounded-md mb-2"
          >
            <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline [&>svg]:ml-auto">
              <span className="flex-1 text-left">RML Preview</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 mr-1"
                title="Download RML"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadRml();
                }}
              >
                <DownloadSimpleIcon size={14} />
              </Button>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <ScrollArea className="h-[280px]">
                <pre className="px-3 py-2 font-mono text-sm text-foreground bg-muted/30 border-t border-border whitespace-pre-wrap">
                  {rmlPreview}
                </pre>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem
            value="yarrrml"
            className="border border-border rounded-md"
          >
            <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline [&>svg]:ml-auto">
              <span className="flex-1 text-left">YARRRML Preview</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 mr-1"
                title="Download YARRRML"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadYarrrml();
                }}
              >
                <DownloadSimpleIcon size={14} />
              </Button>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <ScrollArea className="h-[280px]">
                <pre className="px-3 py-2 font-mono text-sm text-foreground bg-muted/30 border-t border-border whitespace-pre-wrap">
                  {yarrrmlPreview}
                </pre>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
}

// ─── OutputPanel ─────────────────────────────────────────────────────────────

export function OutputPanel() {
  return (
    <Tabs defaultValue="fused" className="flex flex-col h-full gap-0">
      <div className="shrink-0 px-3 py-2 border-b border-border">
        <TabsList className="w-full">
          <TabsTrigger value="fused" className="flex-1">
            Fused
          </TabsTrigger>
          <TabsTrigger value="export" className="flex-1">
            Export
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="fused"
        className="flex-1 overflow-hidden m-0 flex flex-col"
      >
        <FusedTab />
      </TabsContent>
      <TabsContent
        value="export"
        className="flex-1 overflow-hidden m-0 flex flex-col"
      >
        <ExportTab />
      </TabsContent>
    </Tabs>
  );
}
