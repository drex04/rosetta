import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { SourceSelector } from './components/layout/SourceSelector';
import { RightPanel } from './components/layout/RightPanel';
import { OntologyCanvas } from './components/canvas/OntologyCanvas';
import { ConfirmDialog } from './components/ui/confirm-dialog';
import { Toaster } from './components/ui/sonner';
import { useOntologyStore } from './store/ontologyStore';
import { useMappingStore } from './store/mappingStore';
import { subscribeValidationToMappings } from './store/validationStore';
import { useOntologySync } from './hooks/useOntologySync';
import { useSourceSync } from './hooks/useSourceSync';
import { useAutoSave } from './hooks/useAutoSave';
import { useInvalidateMappings } from './hooks/useInvalidateMappings';
import type { OntologyNode, OntologyEdge } from './types/index';

function App() {
  useInvalidateMappings();
  const {
    onEditorChange,
    onCanvasChange,
    hasPendingEdits,
    isCanvasSyncPending,
  } = useOntologySync();
  const { resetSourceSchema } = useSourceSync();
  const { saveStatus } = useAutoSave();
  const [pendingSync, setPendingSync] = useState<{
    nodes: OntologyNode[];
    edges: OntologyEdge[];
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeValidationToMappings();
    return unsub;
  }, []);

  useEffect(() => {
    useOntologyStore
      .getState()
      .setInvalidateMappingsCallback((propertyUris: string[]) => {
        const uriSet = new Set(propertyUris);
        const store = useMappingStore.getState();
        for (const list of Object.values(store.mappings)) {
          for (const m of list as { id: string; targetPropUri: string }[]) {
            if (uriSet.has(m.targetPropUri)) {
              store.removeMapping(m.id);
            }
          }
        }
      });
  }, []);

  const handleCanvasChange = useCallback(
    (nodes: OntologyNode[], edges: OntologyEdge[]) => {
      if (hasPendingEdits.current) {
        setPendingSync({ nodes, edges });
      } else {
        void onCanvasChange(nodes, edges);
      }
    },
    // hasPendingEdits is a stable ref — excluded from deps intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCanvasChange],
  );

  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="flex flex-col flex-1 min-h-0">
          <SourceSelector />
          <div className="flex flex-1 overflow-hidden">
            <ErrorBoundary>
              <div className="flex-1 relative">
                <OntologyCanvas onCanvasChange={handleCanvasChange} />
              </div>
            </ErrorBoundary>
            <RightPanel
              onEditorChange={onEditorChange}
              resetSourceSchema={resetSourceSchema}
              isCanvasSyncPending={isCanvasSyncPending}
              saveStatus={saveStatus}
            />
          </div>
          <ConfirmDialog
            open={pendingSync !== null}
            onOpenChange={(o) => {
              if (!o) setPendingSync(null);
            }}
            title="Unsaved editor changes"
            description="You have unsaved edits in the Turtle editor. Proceeding will overwrite them with the canvas state."
            cancelLabel="Keep editing"
            confirmLabel="Proceed"
            onCancel={() => setPendingSync(null)}
            onConfirm={() => {
              if (pendingSync)
                void onCanvasChange(pendingSync.nodes, pendingSync.edges);
              setPendingSync(null);
            }}
          />
          <Toaster />
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}

export default App;
