import { useSourcesStore } from '@/store/sourcesStore'
import { useValidationStore } from '@/store/validationStore'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { localName } from '@/lib/rdf'
import { CircleNotchIcon, PlayIcon } from '@phosphor-icons/react'

export function ValidationPanel() {
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const setActiveSourceId = useSourcesStore((s) => s.setActiveSourceId)

  const results = useValidationStore((s) => s.results)
  const stale = useValidationStore((s) => s.stale)
  const loading = useValidationStore((s) => s.loading)
  const error = useValidationStore((s) => s.error)
  const runValidation = useValidationStore((s) => s.runValidation)
  const setHighlightedCanvasNodeId = useValidationStore((s) => s.setHighlightedCanvasNodeId)

  const header = (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
      <button
        onClick={() => void runValidation()}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? <CircleNotchIcon size={12} className="animate-spin" /> : <PlayIcon size={12} />}
        Validate
      </button>
    </div>
  )

  if (!activeSourceId) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex items-center justify-center flex-1 p-6">
          <p className="text-xs text-center text-muted-foreground px-4">Select a source, then click Validate to run SHACL constraint checks.</p>
        </div>
      </div>
    )
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
    )
  }

  const sourceResults = results[activeSourceId]

  if (sourceResults === undefined) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <p className="text-sm text-muted-foreground p-4">Click Validate to run.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {header}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
        {stale && (
          <Alert className="border-amber-400/50 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
            <AlertDescription>Mappings changed — re-validate to refresh</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          </div>
        ) : sourceResults.length === 0 ? (
          <p className="text-sm text-green-600 p-4">✓ All valid</p>
        ) : (
          sourceResults.map((violation) => (
            <div
              key={violation.id}
              className="border border-border rounded p-2 text-xs"
            >
              <button
                type="button"
                data-testid="violation-item"
                data-canvas-node-id={violation.canvasNodeId ?? ''}
                className={[
                  'text-xs text-left w-full',
                  violation.canvasNodeId !== null ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                ].join(' ')}
                onClick={() => {
                  if (violation.canvasNodeId !== null) {
                    setHighlightedCanvasNodeId(violation.canvasNodeId)
                    setActiveSourceId(violation.sourceId)
                  }
                }}
              >
                <div className="font-medium text-foreground">
                  {localName(violation.targetClassUri)}
                  {violation.targetPropUri ? (
                    <span className="text-muted-foreground"> · {localName(violation.targetPropUri)}</span>
                  ) : null}
                </div>
              </button>
              <details className="mt-1">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                  violation details
                </summary>
                <ul className="mt-1 space-y-0.5">
                  <li className="text-[10px] text-destructive font-mono pl-2 border-l border-destructive/30">
                    {violation.message}
                    {violation.targetPropUri ? ` (path: ${localName(violation.targetPropUri)})` : ''}
                  </li>
                </ul>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
