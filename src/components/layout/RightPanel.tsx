import { useState, useEffect } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useUiStore } from '@/store/uiStore'
import { useOntologyStore } from '@/store/ontologyStore'
import { TurtleEditorPanel } from '@/components/panels/TurtleEditorPanel'
import { SourcePanel } from '@/components/panels/SourcePanel'
import { MappingPanel } from '@/components/panels/MappingPanel'
import { OutputPanel } from '@/components/panels/OutputPanel'
import { ValidationPanel } from '@/components/panels/ValidationPanel'

interface RightPanelProps {
  onEditorChange: (value: string) => void
  onSourceEditorChange?: (turtle: string) => void
  resetSourceSchema?: () => void
}

export function RightPanel({ onEditorChange, onSourceEditorChange, resetSourceSchema }: RightPanelProps) {
  const { activeRightTab, setActiveRightTab } = useUiStore()
  const turtleSource = useOntologyStore((s) => s.turtleSource)
  const parseError = useOntologyStore((s) => s.parseError)
  const [collapsed, setCollapsed] = useState(false)
  const [width, setWidth] = useState(() => Math.round(window.innerWidth * 0.3))
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    function onMove(ev: PointerEvent) {
      const next = Math.min(Math.round(window.innerWidth * 0.6), Math.max(260, startWidth + startX - ev.clientX))
      setWidth(next)
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  let asideClassName = 'relative border-l border-border bg-background flex flex-col overflow-hidden'
  let asideStyle: React.CSSProperties | undefined

  if (collapsed) {
    asideClassName += ' w-10 shrink-0'
  } else if (isMobile) {
    asideClassName += ' w-full absolute inset-y-0 right-0 z-20'
  } else {
    asideClassName += ' shrink-0'
    asideStyle = { width }
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
            <CaretLeftIcon size={14} />
          </button>
          <span className="text-[10px] text-muted-foreground [writing-mode:vertical-rl] rotate-180 select-none mt-1">
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
            onValueChange={(v) => setActiveRightTab(v as 'SRC' | 'ONTO' | 'MAP' | 'OUT' | 'VAL')}
            className="flex flex-col h-full gap-0"
          >
            <div className="border-b border-border px-3 py-2 shrink-0 flex items-center gap-1">
              <TabsList className="h-8 w-full bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="SRC"
                  className="flex-1 text-xs h-7 data-[state=active]:bg-muted"
                  aria-label="Source tab"
                >
                  SRC
                </TabsTrigger>
                <TabsTrigger
                  value="ONTO"
                  className="flex-1 text-xs h-7 data-[state=active]:bg-muted"
                  aria-label="Ontology tab"
                >
                  ONTO
                </TabsTrigger>
                <TabsTrigger
                  value="MAP"
                  className="flex-1 text-xs h-7 data-[state=active]:bg-muted"
                  aria-label="Mapping tab"
                >
                  MAP
                </TabsTrigger>
                <TabsTrigger
                  value="OUT"
                  className="flex-1 text-xs h-7 data-[state=active]:bg-muted"
                  aria-label="Output tab"
                >
                  OUT
                </TabsTrigger>
                <TabsTrigger
                  value="VAL"
                  className="flex-1 text-xs h-7 data-[state=active]:bg-muted"
                  aria-label="Validation tab"
                >
                  VAL
                </TabsTrigger>
              </TabsList>
              <button
                onClick={() => setCollapsed(true)}
                className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Collapse panel"
              >
                <CaretRightIcon size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="SRC" className="h-full m-0">
                <SourcePanel onSourceEditorChange={onSourceEditorChange} resetSourceSchema={resetSourceSchema} />
              </TabsContent>
              <TabsContent value="ONTO" className="h-full m-0">
                <TurtleEditorPanel turtleSource={turtleSource} onEditorChange={onEditorChange} parseError={parseError} />
              </TabsContent>
              <TabsContent value="MAP" className="h-full m-0">
                <MappingPanel />
              </TabsContent>
              <TabsContent value="OUT" className="h-full m-0">
                <OutputPanel />
              </TabsContent>
              <TabsContent value="VAL" className="h-full m-0">
                <ValidationPanel />
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}
    </aside>
  )
}
