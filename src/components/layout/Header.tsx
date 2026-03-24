import { Button } from '@/components/ui/button'
import { QuestionIcon, InfoIcon } from '@phosphor-icons/react'

export function Header() {
  return (
    <header
      className="h-12 flex items-center justify-between px-4 border-b border-border bg-background shrink-0"
      role="banner"
    >
      <span className="text-sm font-semibold tracking-tight text-foreground select-none">
        Rosetta
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Start help tour"
        >
          <QuestionIcon size={16} />
          <span className="text-xs">Help Tour</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label="About Rosetta"
        >
          <InfoIcon size={16} />
          <span className="text-xs">About</span>
        </Button>
      </div>
    </header>
  )
}
