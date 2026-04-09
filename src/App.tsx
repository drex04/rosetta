import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { SourceSelector } from './components/layout/SourceSelector';
import { RightPanel } from './components/layout/RightPanel';
import { OntologyCanvas } from './components/canvas/OntologyCanvas';
import { ConfirmDialog } from './components/ui/confirm-dialog';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { setInvalidateMappingsCallback } from './store/ontologyStore';
import { useMappingStore } from './store/mappingStore';
import { subscribeValidationToMappings } from './store/validationStore';
import { useUiStore } from './store/uiStore';
import { useOntologySync } from './hooks/useOntologySync';
import { useSourceSync } from './hooks/useSourceSync';
import { useAutoSave } from './hooks/useAutoSave';
import { useInvalidateMappings } from './hooks/useInvalidateMappings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { TourProvider } from './components/onboarding/TourProvider';
import { loadExampleProject } from './lib/exampleProject';
import type { OntologyNode, OntologyEdge } from './types/index';

function App() {
  useInvalidateMappings();
  const setTourRunning = useUiStore((s) => s.setTourRunning);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useKeyboardShortcuts({
    searchInputRef,
    onDelete: () => {}, // React Flow handles Delete key natively for selected nodes/edges
  });
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
    setInvalidateMappingsCallback((propertyUris: string[]) => {
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
    return () => setInvalidateMappingsCallback(null);
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
      <TourProvider />
      <TooltipProvider delayDuration={500}>
        <AppLayout
          onGetStarted={async () => {
            try {
              await loadExampleProject();
              setTourRunning(true);
            } catch (err) {
              console.error('[loadExampleProject] failed:', err);
            }
          }}
        >
          <div className="flex flex-col flex-1 min-h-0">
            <SourceSelector />
            <div className="flex flex-1 overflow-hidden">
              <ErrorBoundary>
                <div className="flex-1 relative" data-tour="canvas">
                  <OntologyCanvas
                    onCanvasChange={handleCanvasChange}
                    searchInputRef={searchInputRef}
                  />
                </div>
              </ErrorBoundary>
              <ErrorBoundary>
                <RightPanel
                  onEditorChange={onEditorChange}
                  resetSourceSchema={resetSourceSchema}
                  isCanvasSyncPending={isCanvasSyncPending}
                  saveStatus={saveStatus}
                />
              </ErrorBoundary>
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
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
