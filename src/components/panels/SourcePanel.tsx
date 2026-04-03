import { useEffect, useRef, useMemo, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { lineNumbers, highlightActiveLine } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { turtle } from 'codemirror-lang-turtle';
import {
  UploadSimpleIcon,
  ArrowCounterClockwiseIcon,
} from '@phosphor-icons/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSourcesStore } from '@/store/sourcesStore';
import { useMappingStore } from '@/store/mappingStore';
import { jsonToSchema } from '@/lib/jsonToSchema';
import { xmlToSchema } from '@/lib/xmlToSchema';
import {
  detectFormatFromContent,
  detectFormatFromFile,
} from '@/lib/detectFormat';
import { lightTheme } from '@/lib/codemirror-theme';

// ─── Debounce helper ──────────────────────────────────────────────────────────

function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: T): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
  return debounced;
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

function deriveSlug(name: string): string {
  return 'src_' + name.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() + '_';
}

// ─── Banner state type ────────────────────────────────────────────────────────

// 'prefix-collision' is derived during render from sources; only json/xml/warnings are set via state
type BannerState =
  | 'invalid-json'
  | 'invalid-xml'
  | 'warnings'
  | 'format-changed'
  | 'file-too-large'
  | 'file-read-error'
  | null;

// ─── Schema generation helper ─────────────────────────────────────────────────

function runSchema(value: string, format: 'json' | 'xml', sourceName: string) {
  if (format === 'xml') {
    return xmlToSchema(value, sourceName);
  }
  return jsonToSchema(value, sourceName);
}

// ─── SourcePanel ──────────────────────────────────────────────────────────────

interface SourcePanelProps {
  onSourceEditorChange?: (turtle: string) => void;
  resetSourceSchema?: () => void;
}

export function SourcePanel({
  onSourceEditorChange,
  resetSourceSchema,
}: SourcePanelProps) {
  const sources = useSourcesStore((s) => s.sources);
  const activeSourceId = useSourcesStore((s) => s.activeSourceId);
  const updateSource = useSourcesStore((s) => s.updateSource);
  const clearMappingsForSource = useMappingStore(
    (s) => s.clearMappingsForSource,
  );

  const source = sources.find((s) => s.id === activeSourceId) ?? null;

  // ── Name editing ─────────────────────────────────────────────────────────────
  // No sync effect needed: SourcePanel is remounted via key={activeSourceId} in RightPanel
  const [editName, setEditName] = useState(source?.name ?? '');

  // ── Banners ─────────────────────────────────────────────────────────────────
  const [banner, setBanner] = useState<BannerState>(null);

  // ── Prefix collision — derived from current sources list (no effect needed) ──
  const hasPrefixCollision =
    source !== null &&
    banner !== 'invalid-json' &&
    banner !== 'invalid-xml' &&
    sources.some(
      (s) =>
        s.id !== source.id && deriveSlug(s.name) === deriveSlug(source.name),
    );

  // ── Last successful turtle (for preview / editing) ───────────────────────────
  // Prefer store's turtleSource when available (set by useSourceSync).
  // Fall back to lazy-init derivation for IDB-restored sources that predate
  // the turtleSource field (migrateSource sets it to '').
  const [lastTurtle, setLastTurtle] = useState<string>(() => {
    if (source?.turtleSource) return source.turtleSource;
    if (!source?.rawData) return '';
    try {
      const result = runSchema(
        source.rawData,
        source.dataFormat ?? 'json',
        source.name,
      );
      return result.turtle;
    } catch {
      return '';
    }
  });

  // ── File input ref ────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── CodeMirror refs (data editor) ────────────────────────────────────────────
  const dataContainerRef = useRef<HTMLDivElement>(null);
  const dataViewRef = useRef<EditorView | null>(null);
  const isUpdatingFromStore = useRef(false);

  // ── CodeMirror refs (Turtle preview) ─────────────────────────────────────────
  const turtleContainerRef = useRef<HTMLDivElement>(null);
  const turtleViewRef = useRef<EditorView | null>(null);
  const isUpdatingTurtleFromStore = useRef(false);

  // ── RDFS pane resize state ────────────────────────────────────────────────────
  const [rdfsHeight, setRdfsHeight] = useState(200);
  const isDraggingRdfs = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  function handleRdfsPointerDown(e: React.PointerEvent) {
    isDraggingRdfs.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = rdfsHeight;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleRdfsPointerMove(e: React.PointerEvent) {
    if (!isDraggingRdfs.current) return;
    const delta = dragStartY.current - e.clientY;
    setRdfsHeight(Math.max(80, Math.min(600, dragStartHeight.current + delta)));
  }
  function handleRdfsPointerUp() {
    isDraggingRdfs.current = false;
  }

  // ── RDFS pane show/collapse state ─────────────────────────────────────────────
  const showRdfs = true;

  // ── Current dataFormat (tracked locally for editor remount key) ───────────────
  const [dataFormat, setDataFormat] = useState<'json' | 'xml'>(
    source?.dataFormat ?? 'json',
  );

  // ── Debounced update (per source.id) ─────────────────────────────────────────
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const debouncedUpdate = useMemo(() => {
    if (!source) return null;
    const sourceId = source.id; // RD-06: capture in closure, do NOT read from store inside callback

    return debounce((value: string, currentFormat: 'json' | 'xml') => {
      // Detect format from content
      const detected = detectFormatFromContent(value);
      const resolvedFormat: 'json' | 'xml' =
        detected === 'unknown' ? currentFormat : detected;

      // If format changed, clear mappings and update local format state
      if (resolvedFormat !== currentFormat) {
        clearMappingsForSource(sourceId);
        setBanner('format-changed');
        setDataFormat(resolvedFormat);
        updateSource(sourceId, { dataFormat: resolvedFormat });
      }

      if (resolvedFormat === 'xml') {
        const result = xmlToSchema(
          value,
          sources.find((s) => s.id === sourceId)?.name ?? '',
        );
        if (result.warnings.some((w) => w.startsWith('Invalid XML'))) {
          setBanner((b) => (b === 'format-changed' ? b : 'invalid-xml'));
          updateSource(sourceId, { rawData: value });
          return;
        }
        if (!('format-changed' === banner)) {
          setBanner(result.warnings.length > 0 ? 'warnings' : null);
        }
        if (result.turtle) setLastTurtle(result.turtle);
        updateSource(sourceId, {
          rawData: value,
          dataFormat: resolvedFormat,
          schemaNodes: result.nodes,
          schemaEdges: result.edges,
        });
        return;
      }

      // JSON path
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
        void parsed;
      } catch {
        setBanner((b) => (b === 'format-changed' ? b : 'invalid-json'));
        updateSource(sourceId, { rawData: value });
        return;
      }

      const result = jsonToSchema(
        value,
        sources.find((s) => s.id === sourceId)?.name ?? '',
      );
      if (banner !== 'format-changed') {
        setBanner(result.warnings.length > 0 ? 'warnings' : null);
      }
      if (result.turtle) setLastTurtle(result.turtle);
      updateSource(sourceId, {
        rawData: value,
        dataFormat: resolvedFormat,
        schemaNodes: result.nodes,
        schemaEdges: result.edges,
      });
    }, 600);
  }, [source?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Re-create debounce fn when source changes; sources/updateSource/clearMappingsForSource are stable Zustand refs

  // ── File upload handler ───────────────────────────────────────────────────────
  function handleFileUpload(file: File | undefined) {
    if (!file || !source) return;

    if (file.size > 1_000_000) {
      setBanner('file-too-large');
      return;
    }

    const detectedFormat = detectFormatFromFile(file);
    const resolvedFormat: 'json' | 'xml' =
      detectedFormat === 'unknown' ? source.dataFormat : detectedFormat;

    const reader = new FileReader();
    reader.onerror = () => {
      setBanner('file-read-error');
    };
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        setBanner('file-read-error');
        return;
      }

      // If format changed, clear mappings
      if (resolvedFormat !== source.dataFormat) {
        clearMappingsForSource(source.id);
        setBanner('format-changed');
        setDataFormat(resolvedFormat);
      } else {
        setBanner(null);
      }

      // Update editor content
      isUpdatingFromStore.current = true;
      const view = dataViewRef.current;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text },
        });
      }
      isUpdatingFromStore.current = false;

      // Generate schema
      const result = runSchema(text, resolvedFormat, source.name);
      if (result.turtle) setLastTurtle(result.turtle);
      if (resolvedFormat !== source.dataFormat || banner !== 'format-changed') {
        if (result.warnings.length > 0 && banner !== 'format-changed')
          setBanner('warnings');
      }
      updateSource(source.id, {
        rawData: text,
        dataFormat: resolvedFormat,
        schemaNodes: result.nodes,
        schemaEdges: result.edges,
      });
    };
    reader.readAsText(file);

    // Reset file input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Mount data editor ─────────────────────────────────────────────────────────
  // key={dataFormat} on the container div causes remount when format changes
  useEffect(() => {
    if (dataContainerRef.current === null) return;

    const langExtension = dataFormat === 'xml' ? xml() : json();

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (isUpdatingFromStore.current) return;
      const value = update.state.doc.toString();
      debouncedUpdate?.(value, dataFormat);
    });

    const state = EditorState.create({
      doc: source?.rawData ?? '',
      extensions: [
        basicSetup,
        lineNumbers(),
        highlightActiveLine(),
        langExtension,
        lightTheme,
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: dataContainerRef.current });
    dataViewRef.current = view;

    return () => {
      view.destroy();
      dataViewRef.current = null;
    };
  }, [source?.id, dataFormat]); // eslint-disable-line react-hooks/exhaustive-deps
  // Re-mount editor when source switches or format changes

  // ── External update effect: store → data editor ───────────────────────────────
  // RD-11: No hasFocus guard — source switching must always update content.
  useEffect(() => {
    const view = dataViewRef.current;
    if (view === null) return;
    const newData = source?.rawData ?? '';
    const currentDoc = view.state.doc.toString();
    if (currentDoc === newData) return;

    isUpdatingFromStore.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newData },
    });
    isUpdatingFromStore.current = false;
  }, [source?.rawData]); // RD-11: effect dependency is source?.rawData

  // ── Mount Turtle editor (editable when onSourceEditorChange provided) ────────
  useEffect(() => {
    if (!showRdfs) return;
    if (turtleContainerRef.current === null) return;

    const isEditable = onSourceEditorChange !== undefined;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (isUpdatingTurtleFromStore.current) return;
      if (!isEditable) return;
      const value = update.state.doc.toString();
      onSourceEditorChange(value);
    });

    const state = EditorState.create({
      doc: lastTurtle,
      extensions: [
        basicSetup,
        lineNumbers(),
        ...(isEditable ? [highlightActiveLine()] : []),
        turtle(),
        lightTheme,
        ...(isEditable ? [updateListener] : [EditorState.readOnly.of(true)]),
      ],
    });

    const view = new EditorView({ state, parent: turtleContainerRef.current });
    turtleViewRef.current = view;

    return () => {
      view.destroy();
      turtleViewRef.current = null;
    };
  }, [showRdfs, source?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Re-mount turtle editor when section is opened or source switches

  // ── Update Turtle editor when lastTurtle changes ──────────────────────────────
  useEffect(() => {
    const view = turtleViewRef.current;
    if (view === null) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc === lastTurtle) return;

    isUpdatingTurtleFromStore.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: lastTurtle },
    });
    isUpdatingTurtleFromStore.current = false;
  }, [lastTurtle]);

  // ── Empty state ────────────────────────────────────────────────────────────────
  if (!source) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Add a source</p>
          <p className="text-sm text-muted-foreground">
            Map fields to ontology
          </p>
          <p className="text-sm text-muted-foreground">Validate with SHACL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar: Source name + format badge + upload + reset buttons */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/10">
        {/* Source name (inline editable) */}
        <input
          className=" text-sm font-medium bg-transparent border-none outline-none rounded px-1 hover:bg-muted/40 focus:bg-muted/60 transition-colors"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => {
            const trimmed = editName.trim();
            if (trimmed && trimmed !== source.name) {
              updateSource(source.id, { name: trimmed });
            } else {
              setEditName(source.name);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setEditName(source.name);
              e.currentTarget.blur();
            }
          }}
          aria-label="Source name"
        />

        <span
          className={
            'inline-flex items-center rounded px-1.5 py-0.5 text-sm font-medium uppercase tracking-wide ' +
            (dataFormat === 'xml'
              ? 'bg-master/15 text-master'
              : 'bg-source/15 text-source-text')
          }
          aria-label={`Format: ${dataFormat.toUpperCase()}`}
        >
          {dataFormat.toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadSimpleIcon size={12} />
            Upload File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.xml"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Banner */}
      {banner === 'invalid-json' && (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 text-sm"
        >
          <AlertDescription>Invalid JSON — schema not updated</AlertDescription>
        </Alert>
      )}
      {banner === 'invalid-xml' && (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 text-sm"
        >
          <AlertDescription>Invalid XML — schema not updated</AlertDescription>
        </Alert>
      )}
      {banner === 'format-changed' && (
        <Alert className="shrink-0 rounded-none border-x-0 text-sm bg-master/10 border-master/30 text-master">
          <AlertDescription>
            Format changed — mappings for this source were cleared
          </AlertDescription>
        </Alert>
      )}
      {banner === 'file-too-large' && (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 text-sm"
        >
          <AlertDescription>
            File too large (max 1MB). Paste content manually for larger files
          </AlertDescription>
        </Alert>
      )}
      {banner === 'file-read-error' && (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 text-sm"
        >
          <AlertDescription>Could not read file. Try again.</AlertDescription>
        </Alert>
      )}
      {hasPrefixCollision && (
        <Alert className="shrink-0 rounded-none border-x-0 text-sm bg-source/10 border-source/30 text-source-text">
          <AlertDescription>
            Prefix collision — rename this source to avoid RDF conflicts
          </AlertDescription>
        </Alert>
      )}
      {banner === 'warnings' && (
        <Alert className="shrink-0 rounded-none border-x-0 text-sm bg-source/10 border-source/30 text-source-text">
          <AlertDescription>
            Schema generated with warnings — check your data structure
          </AlertDescription>
        </Alert>
      )}

      {/* Data editor — key remounts CodeMirror with correct language when format changes */}
      <div
        key={dataFormat}
        ref={dataContainerRef}
        className="flex-1 overflow-hidden"
        aria-label={`${dataFormat.toUpperCase()} source editor`}
      />

      {/* Drag handle — drag up to grow RDFS pane */}
      <div
        className="shrink-0 h-1 cursor-row-resize bg-border hover:bg-primary/40 transition-colors"
        onPointerDown={handleRdfsPointerDown}
        onPointerMove={handleRdfsPointerMove}
        onPointerUp={handleRdfsPointerUp}
        aria-label="Resize RDFS pane"
      />

      {/* RDFS pane */}
      <div
        className="shrink-0 flex flex-col border-t border-border overflow-hidden"
        style={{ height: rdfsHeight }}
      >
        {/* RDFS pane header */}
        <div className="shrink-0 flex items-center px-3 py-1.5 border-b border-border bg-muted/10">
          <span className="text-sm font-medium text-muted-foreground">
            {'RDFS Schema'}
          </span>
          <div className="flex-1" />
          {resetSourceSchema !== undefined && (
            <Button
              variant="outline"
              size="xs"
              onClick={resetSourceSchema}
              title="Reset RDFS schema from source data"
            >
              <ArrowCounterClockwiseIcon size={12} />
              Reset Schema
            </Button>
          )}
        </div>

        {/* RDFS editor */}
        {showRdfs && (
          <div
            id="turtle-preview"
            ref={turtleContainerRef}
            className="flex-1 overflow-hidden"
            aria-label="Generated Turtle preview"
          />
        )}
      </div>
    </div>
  );
}
