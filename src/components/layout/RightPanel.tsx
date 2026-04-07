import { useState, useEffect, Suspense, lazy, type RefObject } from 'react';
import { SidebarSimpleIcon } from '@phosphor-icons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUiStore } from '@/store/uiStore';
import { useOntologyStore } from '@/store/ontologyStore';
import { useSourcesStore } from '@/store/sourcesStore';
const TurtleEditorPanel = lazy(() =>
  import('@/components/panels/TurtleEditorPanel').then((m) => ({
    default: m.TurtleEditorPanel,
  })),
);
const SourcePanel = lazy(() =>
  import('@/components/panels/SourcePanel').then((m) => ({
    default: m.SourcePanel,
  })),
);
import { MappingPanel } from '@/components/panels/MappingPanel';
import { OutputPanel } from '@/components/panels/OutputPanel';
import { ValidationPanel } from '@/components/panels/ValidationPanel';
import { StatusBar } from '@/components/layout/StatusBar';
import type { SaveStatus } from '@/hooks/useAutoSave';

interface RightPanelProps {
  onEditorChange: (value: string) => void;
  resetSourceSchema?: () => void;
  isCanvasSyncPending?: RefObject<boolean>;
  saveStatus: SaveStatus;
}

export function RightPanel({
  onEditorChange,
  resetSourceSchema,
  isCanvasSyncPending,
  saveStatus,
}: RightPanelProps) {
  const { activeRightTab, setActiveRightTab } = useUiStore();
  const activeSourceId = useSourcesStore((s) => s.activeSourceId);
  const turtleSource = useOntologyStore((s) => s.turtleSource);
  const setTurtleSource = useOntologyStore((s) => s.setTurtleSource);
  const parseError = useOntologyStore((s) => s.parseError);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(() => Math.round(window.innerWidth * 0.3));
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    function onMove(ev: PointerEvent) {
      const next = Math.min(
        Math.round(window.innerWidth * 0.6),
        Math.max(260, startWidth + startX - ev.clientX),
      );
      setWidth(next);
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  let asideClassName =
    'relative border-l border-border bg-background flex flex-col overflow-hidden';
  let asideStyle: React.CSSProperties | undefined;

  if (collapsed) {
    asideClassName += ' w-10 shrink-0';
  } else if (isMobile) {
    asideClassName += ' w-full absolute inset-y-0 right-0 z-20';
  } else {
    asideClassName += ' shrink-0';
    asideStyle = { width };
  }

  return (
    <aside
      className={asideClassName}
      style={asideStyle}
      aria-label="Right panel"
    >
      {collapsed ? (
        <div className="flex flex-col items-center justify-start pt-3 h-full gap-2">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Expand panel"
          >
            <SidebarSimpleIcon size={24} />
          </button>
          <span className="text-sm text-muted-foreground [writing-mode:vertical-rl] rotate-180 select-none mt-1">
            {activeRightTab}
          </span>
        </div>
      ) : (
        <>
          {/* Drag handle — desktop only */}
          {!isMobile && (
            <div
              onPointerDown={handlePointerDown}
              className="absolute left-0 top-0 h-full w-1 cursor-col-resize bg-border hover:bg-primary/40 transition-colors z-10"
              aria-hidden="true"
            />
          )}
          <Tabs
            value={activeRightTab}
            onValueChange={(v) =>
              setActiveRightTab(
                v as 'SOURCE' | 'ONTOLOGY' | 'MAP' | 'OUTPUT' | 'VALIDATE',
              )
            }
            className="flex flex-col flex-1 min-h-0 gap-0"
          >
            <div className="px-2 shrink-0 flex items-center gap-1">
              <button
                onClick={() => setCollapsed(true)}
                className="ml-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 self-center"
                aria-label="Collapse panel"
              >
                <SidebarSimpleIcon size={24} />
              </button>
              <TabsList variant="line" className="flex-1 gap-0">
                <TabsTrigger
                  value="SOURCE"
                  className="flex-1 tracking-wide text-sm"
                  aria-label="Source tab"
                >
                  LOAD
                </TabsTrigger>
                <TabsTrigger
                  value="ONTOLOGY"
                  className="flex-1 tracking-wide text-sm"
                  aria-label="Ontology tab"
                >
                  BUILD
                </TabsTrigger>
                <TabsTrigger
                  value="MAP"
                  className="flex-1 tracking-wide text-sm"
                  aria-label="Mapping tab"
                >
                  MAP
                </TabsTrigger>
                <TabsTrigger
                  value="OUTPUT"
                  className="flex-1 tracking-wide text-sm"
                  aria-label="Output tab"
                >
                  FUSE
                </TabsTrigger>
                <TabsTrigger
                  value="VALIDATE"
                  className="flex-1 tracking-wide text-sm"
                  aria-label="SHACL validation tab"
                >
                  CHECK
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="SOURCE" className="h-full m-0">
                <Suspense
                  fallback={
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Loading…
                    </div>
                  }
                >
                  <SourcePanel
                    key={activeSourceId ?? 'none'}
                    resetSourceSchema={resetSourceSchema}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value="ONTOLOGY" className="h-full m-0">
                <Suspense
                  fallback={
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Loading…
                    </div>
                  }
                >
                  <TurtleEditorPanel
                    turtleSource={turtleSource}
                    onEditorChange={onEditorChange}
                    parseError={parseError}
                    isCanvasSyncPending={isCanvasSyncPending}
                    onUpload={(turtle) => {
                      setTurtleSource(turtle);
                      onEditorChange(turtle);
                    }}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value="MAP" className="h-full m-0">
                <MappingPanel />
              </TabsContent>
              <TabsContent value="OUTPUT" className="h-full m-0">
                <OutputPanel />
              </TabsContent>
              <TabsContent value="VALIDATE" className="h-full m-0">
                <ValidationPanel />
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}
      <StatusBar saveStatus={saveStatus} />
    </aside>
  );
}
