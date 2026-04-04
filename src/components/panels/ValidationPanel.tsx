import { useEffect, useRef } from 'react';
import { useSourcesStore } from '@/store/sourcesStore';
import { useValidationStore } from '@/store/validationStore';
import { useOntologyStore } from '@/store/ontologyStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TurtleEditorPanel } from '@/components/panels/TurtleEditorPanel';
import { localName } from '@/lib/rdf';
import {
  ArrowCounterClockwiseIcon,
  CircleNotchIcon,
  PlayIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';

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
  const userShapesTurtle = useValidationStore((s) => s.userShapesTurtle);
  const setUserShapesTurtle = useValidationStore((s) => s.setUserShapesTurtle);
  const resetShapesToAuto = useValidationStore((s) => s.resetShapesToAuto);

  const ontologyNodes = useOntologyStore((s) => s.nodes);

  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (useValidationStore.getState().userShapesTurtle.trim() === '') {
      void resetShapesToAuto(ontologyNodes);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') setUserShapesTurtle(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const sourceResults = activeSourceId ? results[activeSourceId] : undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Accordion
        type="multiple"
        defaultValue={['shapes', 'violations']}
        className="flex flex-col h-full"
      >
        {/* Shapes accordion item */}
        <AccordionItem
          value="shapes"
          className="border-b border-border shrink-0"
        >
          <div className="flex items-center justify-between px-3 py-1.5">
            <AccordionTrigger className="flex-1 text-sm font-medium hover:no-underline py-0 [&>svg]:ml-2">
              Shapes
            </AccordionTrigger>
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={importInputRef}
                type="file"
                accept=".ttl"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => importInputRef.current?.click()}
                title="Import shapes from .ttl file"
              >
                <UploadSimpleIcon size={12} className="mr-1" />
                Import
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => void resetShapesToAuto(ontologyNodes)}
                title="Reset shapes to auto-generated"
              >
                <ArrowCounterClockwiseIcon size={12} className="mr-1" />
                Reset
              </Button>
            </div>
          </div>
          <AccordionContent className="pb-0">
            <div className="h-56 border-t border-border overflow-hidden">
              <TurtleEditorPanel
                turtleSource={userShapesTurtle}
                onEditorChange={setUserShapesTurtle}
                filename="shapes.ttl"
                downloadLabel="Download shapes.ttl"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Violations accordion item */}
        <AccordionItem
          value="violations"
          className="flex flex-col flex-1 min-h-0 border-b-0"
        >
          <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
            <AccordionTrigger className="flex-1 text-sm font-medium hover:no-underline py-0 [&>svg]:ml-2">
              Violations
            </AccordionTrigger>
            <Button
              size="sm"
              className="h-6 px-2 text-xs shrink-0"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                void runValidation();
              }}
            >
              {loading ? (
                <CircleNotchIcon size={12} className="animate-spin mr-1" />
              ) : (
                <PlayIcon size={12} className="mr-1" />
              )}
              Validate
            </Button>
          </div>
          <AccordionContent className="flex flex-col flex-1 min-h-0 pb-0 data-[state=open]:flex data-[state=open]:flex-col data-[state=open]:flex-1">
            <div className="flex flex-col flex-1 overflow-y-auto px-3 pb-3 gap-2">
              {/* Error state */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {/* No source selected */}
              {!activeSourceId && !error && (
                <p className="text-sm text-center text-muted-foreground px-4 pt-4">
                  Select a source, then click Validate to run SHACL constraint
                  checks.
                </p>
              )}
              {/* Stale alert */}
              {activeSourceId && stale && !error && (
                <Alert className="border-source/40 text-source-text bg-source/5">
                  <AlertDescription>
                    Mappings changed — re-validate to refresh
                  </AlertDescription>
                </Alert>
              )}
              {/* No results yet */}
              {activeSourceId &&
                !error &&
                sourceResults === undefined &&
                !loading && (
                  <p className="text-sm text-muted-foreground pt-2">
                    Click Validate to run.
                  </p>
                )}
              {/* Loading spinner */}
              {loading && (
                <div className="flex items-center justify-center flex-1">
                  <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                </div>
              )}
              {/* Results */}
              {!loading &&
                sourceResults !== undefined &&
                sourceResults.length === 0 && (
                  <p className="text-sm text-mapping-text p-4">✓ All valid</p>
                )}
              {!loading &&
                sourceResults !== undefined &&
                sourceResults.length > 0 &&
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
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
