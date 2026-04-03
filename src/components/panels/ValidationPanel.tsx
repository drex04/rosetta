import { useSourcesStore } from '@/store/sourcesStore';
import { useValidationStore } from '@/store/validationStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { localName } from '@/lib/rdf';
import { CircleNotchIcon, PlayIcon } from '@phosphor-icons/react';

export function ValidationPanel() {
  const activeSourceId = useSourcesStore((s) => s.activeSourceId);
  const setActiveSourceId = useSourcesStore((s) => s.setActiveSourceId);

  const results = useValidationStore((s) => s.results);
  const stale = useValidationStore((s) => s.stale);
  const loading = useValidationStore((s) => s.loading);
  const error = useValidationStore((s) => s.error);
  const runValidation = useValidationStore((s) => s.runValidation);
  const setHighlightedCanvasNodeId = useValidationStore(
    (s) => s.setHighlightedCanvasNodeId,
  );

  const header = (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
      <Button size="sm" onClick={() => void runValidation()} disabled={loading}>
        {loading ? (
          <CircleNotchIcon size={12} className="animate-spin" />
        ) : (
          <PlayIcon size={12} />
        )}
        Validate
      </Button>
    </div>
  );

  if (!activeSourceId) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex items-center justify-center flex-1 p-6">
          <p className="text-sm text-center text-muted-foreground px-4">
            Select a source, then click Validate to run SHACL constraint checks.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const sourceResults = results[activeSourceId];

  if (sourceResults === undefined) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <p className="text-sm text-muted-foreground p-4">
          Click Validate to run.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {header}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
        {stale && (
          <Alert className="border-source/40 text-source-text bg-source/5">
            <AlertDescription>
              Mappings changed — re-validate to refresh
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          </div>
        ) : sourceResults.length === 0 ? (
          <p className="text-sm text-mapping-text p-4">✓ All valid</p>
        ) : (
          sourceResults.map((violation) => (
            <div
              key={violation.id}
              className="border border-border rounded p-2 text-sm"
            >
              <button
                type="button"
                data-testid="violation-item"
                data-canvas-node-id={violation.canvasNodeId ?? ''}
                className={[
                  'text-sm text-left w-full',
                  violation.canvasNodeId !== null
                    ? 'cursor-pointer hover:opacity-80'
                    : 'cursor-default',
                ].join(' ')}
                onClick={() => {
                  if (violation.canvasNodeId !== null) {
                    setHighlightedCanvasNodeId(violation.canvasNodeId);
                    setActiveSourceId(violation.sourceId);
                  }
                }}
              >
                <div className="font-medium text-foreground">
                  {localName(violation.targetClassUri)}
                  {violation.targetPropUri ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {localName(violation.targetPropUri)}
                    </span>
                  ) : null}
                </div>
              </button>
              <details className="mt-1">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  violation details
                </summary>
                <ul className="mt-1 flex flex-col gap-0.5">
                  <li className="text-sm text-destructive font-mono pl-2 border-l border-destructive/30">
                    {violation.message}
                    {violation.targetPropUri
                      ? ` (path: ${localName(violation.targetPropUri)})`
                      : ''}
                  </li>
                </ul>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
