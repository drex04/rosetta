import { Button } from '@/components/ui/button'
import { Plus } from '@phosphor-icons/react'

export function Toolbar() {
  return (
    <div
      className="h-10 flex items-center px-4 gap-2 border-b border-border bg-background shrink-0"
      role="toolbar"
      aria-label="Main toolbar"
    >
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        aria-label="Add a new data source"
      >
        <Plus size={14} />
        Add Source
      </Button>
    </div>
  )
}
