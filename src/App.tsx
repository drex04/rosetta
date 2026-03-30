import { useCallback, useEffect, useState } from 'react'
import { Header } from './components/layout/Header'
import { StatusBar } from './components/layout/StatusBar'
import { SourceSelector } from './components/layout/SourceSelector'
import { RightPanel } from './components/layout/RightPanel'
import { OntologyCanvas } from './components/canvas/OntologyCanvas'
import { ConfirmDialog } from './components/ui/confirm-dialog'
import { useOntologyStore, SEED_TURTLE } from './store/ontologyStore'
import { subscribeValidationToMappings } from './store/validationStore'
import { useOntologySync } from './hooks/useOntologySync'
import { useAutoSave } from './hooks/useAutoSave'
import type { OntologyNode, OntologyEdge } from './types/index'

function App() {
  const loadTurtle = useOntologyStore((s) => s.loadTurtle)
  const { onEditorChange, onCanvasChange, hasPendingEdits } = useOntologySync()
  const { saveStatus } = useAutoSave()
  const [pendingSync, setPendingSync] = useState<{ nodes: OntologyNode[]; edges: OntologyEdge[] } | null>(null)

  useEffect(() => {
    void loadTurtle(SEED_TURTLE)
  }, [loadTurtle])

  useEffect(() => {
    const unsub = subscribeValidationToMappings()
    return unsub
  }, [])

  const handleCanvasChange = useCallback(
    (nodes: OntologyNode[], edges: OntologyEdge[]) => {
      if (hasPendingEdits.current) {
        setPendingSync({ nodes, edges })
      } else {
        void onCanvasChange(nodes, edges)
      }
    },
    // hasPendingEdits is a stable ref — excluded from deps intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCanvasChange],
  )

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />
      <SourceSelector />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <OntologyCanvas onCanvasChange={handleCanvasChange} />
        </div>
        <RightPanel onEditorChange={onEditorChange} />
      </div>
      <ConfirmDialog
        open={pendingSync !== null}
        onOpenChange={(o) => { if (!o) setPendingSync(null) }}
        title="Unsaved editor changes"
        description="You have unsaved edits in the Turtle editor. Proceeding will overwrite them with the canvas state."
        cancelLabel="Keep editing"
        confirmLabel="Proceed"
        onCancel={() => setPendingSync(null)}
        onConfirm={() => {
          if (pendingSync) void onCanvasChange(pendingSync.nodes, pendingSync.edges)
          setPendingSync(null)
        }}
      />
      <StatusBar saveStatus={saveStatus} />
    </div>
  )
}

export default App
