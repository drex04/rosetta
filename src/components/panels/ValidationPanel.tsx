import { useSourcesStore } from '@/store/sourcesStore'
import { useValidationStore } from '@/store/validationStore'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { localName } from '@/lib/rdf'

export function ValidationPanel() {
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const setActiveSourceId = useSourcesStore((s) => s.setActiveSourceId)

  const results = useValidationStore((s) => s.results)
  const stale = useValidationStore((s) => s.stale)
  const loading = useValidationStore((s) => s.loading)
  const error = useValidationStore((s) => s.error)
  const setHighlightedCanvasNodeId = useValidationStore((s) => s.setHighlightedCanvasNodeId)

  if (!activeSourceId) {
    return (
      <p className="text-sm text-muted-foreground p-4">Select a source to validate.</p>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    )
  }

  const sourceResults = results[activeSourceId]

  if (sourceResults === undefined) {
    return (
      <p className="text-sm text-muted-foreground p-4">Click Validate to run.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
      {stale && (
        <Alert className="border-amber-400/50 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertDescription>Mappings changed — re-validate to refresh</AlertDescription>
        </Alert>
      )}

      {sourceResults.length === 0 ? (
        <p className="text-sm text-green-600 p-4">✓ All valid</p>
      ) : (
        sourceResults.map((violation) => (
          <button
            key={violation.id}
            data-testid="violation-item"
            data-canvas-node-id={violation.canvasNodeId ?? ''}
            className={[
              'border border-border rounded p-2 text-xs text-left w-full',
              violation.canvasNodeId !== null ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default',
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
            <div className="text-muted-foreground line-clamp-2 mt-0.5">{violation.message}</div>
          </button>
        ))
      )}
    </div>
  )
}
