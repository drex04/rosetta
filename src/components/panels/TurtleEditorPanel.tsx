import { useEffect, useRef, useState, type RefObject } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { parseOntologyFile } from '@/lib/parseOntologyFile';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { lineNumbers, highlightActiveLine } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { turtle } from 'codemirror-lang-turtle';
import { lightTheme } from '@/lib/codemirror-theme';

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

interface TurtleEditorPanelProps {
  turtleSource: string;
  onEditorChange: (value: string) => void;
  parseError?: string | null;
  /** Ref set to true during the 100ms canvas→editor debounce window. When true,
   *  user keystrokes are suppressed to prevent overwrite races. */
  isCanvasSyncPending?: RefObject<boolean>;
  /** Filename shown in the header and used for downloads. Defaults to 'ontology.ttl'. */
  filename?: string;
  /** Label for the download button. Defaults to 'Download .ttl'. */
  downloadLabel?: string;
  /** If true, hides the download button. */
  hideDownload?: boolean;
  /** If true, hides the entire filename/button header bar. */
  hideHeader?: boolean;
  /** Called with parsed Turtle when user uploads a file. If provided, Import button is shown. */
  onUpload?: (turtle: string) => void;
}

export function TurtleEditorPanel({
  turtleSource,
  onEditorChange,
  parseError,
  isCanvasSyncPending,
  filename,
  downloadLabel,
  hideDownload,
  hideHeader,
  onUpload,
}: TurtleEditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Track whether a programmatic update is in flight so we don't echo it back
  const isExternalUpdate = useRef(false);

  // Mount the editor once
  useEffect(() => {
    if (containerRef.current === null) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (isExternalUpdate.current) return;
      // During the canvas→editor debounce window the editor is logically
      // read-only: silently drop user keystrokes to prevent overwrite races.
      if (isCanvasSyncPending?.current) return;
      onEditorChange(update.state.doc.toString());
    });

    const state = EditorState.create({
      doc: turtleSource,
      extensions: [
        basicSetup,
        lineNumbers(),
        highlightActiveLine(),
        turtle(),
        lightTheme,
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only mount once — external updates handled below

  // Canvas → Editor: update content when turtleSource changes externally (R-03)
  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === turtleSource) return;

    // R-03: Skip dispatch when the editor has focus — prevents cursor jumps
    if (view.hasFocus) return;

    isExternalUpdate.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: turtleSource,
      },
    });
    isExternalUpdate.current = false;
  }, [turtleSource]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-uploaded
    e.target.value = '';
    try {
      const turtle = await parseOntologyFile(file);
      onUpload!(turtle);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex flex-col h-full">
      {!hideHeader && (
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
          <span className="text-sm text-muted-foreground font-mono">
            {filename ?? 'ontology.ttl'}
          </span>
          <div className="flex items-center gap-1">
            {onUpload && (
              <>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".ttl,.rdf,.jsonld"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-sm"
                  onClick={() => {
                    setUploadError(null);
                    uploadInputRef.current?.click();
                  }}
                >
                  <UploadSimpleIcon size={14} className="mr-1" />
                  Import
                </Button>
              </>
            )}
            {!hideDownload && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-sm"
                onClick={() =>
                  downloadBlob(
                    turtleSource,
                    filename ?? 'ontology.ttl',
                    'text/turtle',
                  )
                }
              >
                <DownloadSimpleIcon size={14} className="mr-1" />
                {downloadLabel ?? 'Download'}
              </Button>
            )}
          </div>
        </div>
      )}
      {uploadError && (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 text-sm"
        >
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        aria-label="Turtle ontology editor"
      />
      {parseError && (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 border-b-0 text-sm"
        >
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
