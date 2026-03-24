import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useUiStore } from '@/store/uiStore'

export function RightPanel() {
  const { activeRightTab, setActiveRightTab } = useUiStore()

  return (
    <aside
      className="w-[30vw] border-l border-border bg-background flex flex-col overflow-hidden shrink-0"
      aria-label="Right panel"
    >
      <Tabs
        value={activeRightTab}
        onValueChange={(v) => setActiveRightTab(v as 'SRC' | 'MAP' | 'OUT')}
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
        <div className="flex-1 overflow-auto">
          <TabsContent value="SRC">
            <div className="p-4 text-muted-foreground text-sm">Coming soon</div>
          </TabsContent>
          <TabsContent value="MAP">
            <div className="p-4 text-muted-foreground text-sm">Coming soon</div>
          </TabsContent>
          <TabsContent value="OUT">
            <div className="p-4 text-muted-foreground text-sm">Coming soon</div>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  )
}
