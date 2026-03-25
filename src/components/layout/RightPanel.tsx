import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useUiStore } from '@/store/uiStore'
import { useOntologyStore } from '@/store/ontologyStore'
import { TurtleEditorPanel } from '@/components/panels/TurtleEditorPanel'

interface RightPanelProps {
  onEditorChange: (value: string) => void
}

export function RightPanel({ onEditorChange }: RightPanelProps) {
  const { activeRightTab, setActiveRightTab } = useUiStore()
  const turtleSource = useOntologyStore((s) => s.turtleSource)
  const parseError = useOntologyStore((s) => s.parseError)

  return (
    <aside
      className="w-[30vw] border-l border-border bg-background flex flex-col overflow-hidden shrink-0"
      aria-label="Right panel"
    >
      <Tabs
        value={activeRightTab}
        onValueChange={(v) => setActiveRightTab(v as 'SRC' | 'ONTO' | 'MAP' | 'OUT')}
        className="flex flex-col h-full gap-0"
      >
        <div className="border-b border-border px-3 py-2 shrink-0">
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
          </TabsList>
        </div>
        <div className="flex-1 overflow-hidden">
          <TabsContent value="SRC" className="h-full m-0">
            <div className="p-4 text-muted-foreground text-sm">Coming soon</div>
          </TabsContent>
          <TabsContent value="ONTO" className="h-full m-0">
            <TurtleEditorPanel turtleSource={turtleSource} onEditorChange={onEditorChange} parseError={parseError} />
          </TabsContent>
          <TabsContent value="MAP" className="h-full m-0">
            <div className="p-4 text-muted-foreground text-sm">Coming soon</div>
          </TabsContent>
          <TabsContent value="OUT" className="h-full m-0">
            <div className="p-4 text-muted-foreground text-sm">Coming soon</div>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  )
}
